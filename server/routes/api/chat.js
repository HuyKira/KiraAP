const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../../middleware/auth');
const { aiLimiter } = require('../../middleware/rateLimiter');
const agentPlatform = require('../../services/agentPlatform');
const tokenCounter = require('../../services/tokenCounter');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

// Multer config cho file đính kèm
const upload = multer({
    dest: path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'temp'),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf', 'text/plain', 'text/csv',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Loại file không được hỗ trợ'), false);
        }
    }
});

/**
 * POST /api/ai/chat
 * Chat với AI (stream SSE)
 */
router.post('/', auth, aiLimiter, upload.array('files', 5), async (req, res) => {
    const { prompt, conversationId, modelId } = req.body;

    if (!prompt && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tin nhắn hoặc đính kèm file'
        });
    }

    try {
        // Tạo hoặc lấy conversation
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findOne({
                _id: conversationId,
                userId: req.user._id
            });
        }

        if (!conversation) {
            conversation = await Conversation.create({
                userId: req.user._id,
                title: prompt ? prompt.substring(0, 100) : 'Cuộc trò chuyện mới',
                category: 'chat'
            });
        }

        // Xử lý file đính kèm
        const attachments = [];
        const attachmentsMeta = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileBuffer = fs.readFileSync(file.path);
                const base64 = fileBuffer.toString('base64');
                attachments.push({
                    base64,
                    mimeType: file.mimetype
                });
                attachmentsMeta.push({
                    fileName: file.filename,
                    originalName: file.originalname,
                    filePath: file.path,
                    mimeType: file.mimetype,
                    fileSize: file.size
                });
                // Xoá file temp sau khi đọc
                fs.unlinkSync(file.path);
            }
        }

        // Lưu tin nhắn user
        await Message.create({
            conversationId: conversation._id,
            role: 'user',
            content: prompt || '',
            attachments: attachmentsMeta
        });

        // Lấy lịch sử hội thoại (giới hạn 20 messages gần nhất)
        const previousMessages = await Message.find({
            conversationId: conversation._id
        }).sort({ createdAt: 1 }).limit(20).lean();

        const history = previousMessages.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content || '' }]
        }));

        // === STREAM SSE ===
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Conversation-Id', conversation._id.toString());

        // Gửi conversation ID
        res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: conversation._id })}\n\n`);

        const startTime = Date.now();
        let fullText = '';
        let tokenInput = 0;
        let tokenOutput = 0;

        try {
            const streamResult = await agentPlatform.generateTextStream({
                prompt: prompt || '',
                history,
                attachments,
                modelId,
                user: req.user
            });

            const reader = streamResult.stream.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr || jsonStr === '[DONE]') continue;

                        try {
                            const chunk = JSON.parse(jsonStr);
                            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (text) {
                                fullText += text;
                                res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                            }

                            // Parse usage từ chunk cuối
                            if (chunk.usageMetadata) {
                                const usage = tokenCounter.parseUsageMetadata(chunk);
                                tokenInput = usage.tokenInput;
                                tokenOutput = usage.tokenOutput;
                            }
                        } catch (e) {
                            // Skip invalid JSON chunks
                        }
                    }
                }
            }

            const responseTime = Date.now() - startTime;

            // Lưu tin nhắn AI
            await Message.create({
                conversationId: conversation._id,
                role: 'assistant',
                content: fullText,
                modelUsed: streamResult.modelUsed,
                tokenInput,
                tokenOutput
            });

            // Cập nhật conversation
            await Conversation.findByIdAndUpdate(conversation._id, {
                lastMessageAt: new Date(),
                $inc: { messageCount: 2 }
            });

            // Ghi log
            tokenCounter.logUsage({
                userId: req.user._id,
                username: req.user.username,
                modelUsed: streamResult.modelUsed,
                category: 'text',
                prompt: prompt?.substring(0, 1000),
                responseContent: fullText?.substring(0, 2000),
                tokenInput,
                tokenOutput,
                apiKeyName: streamResult.apiKeyName,
                responseTime,
                status: 'success'
            });

            // Gửi done
            res.write(`data: ${JSON.stringify({ type: 'done', tokenInput, tokenOutput })}\n\n`);
            res.end();

        } catch (streamError) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error('Chat error:', error);
        // Nếu chưa bắt đầu stream
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi xử lý chat'
            });
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
        }
    }
});

module.exports = router;
