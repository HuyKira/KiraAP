const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { aiLimiter } = require('../../middleware/rateLimiter');
const agentPlatform = require('../../services/agentPlatform');
const tokenCounter = require('../../services/tokenCounter');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Media = require('../../models/Media');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const upload = multer({
    dest: path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'temp'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file ảnh hoặc video'), false);
        }
    }
});

/**
 * POST /api/ai/video
 * Khởi tạo tạo video (LRO)
 */
router.post('/', auth, aiLimiter, upload.single('refMedia'), async (req, res) => {
    try {
        const { prompt, aspectRatio, durationSeconds, modelId, conversationId } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mô tả video'
            });
        }

        let refBase64 = null;
        let refMimeType = null;

        if (req.file) {
            const buffer = fs.readFileSync(req.file.path);
            refBase64 = buffer.toString('base64');
            refMimeType = req.file.mimetype;
            fs.unlinkSync(req.file.path);
        }

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
                title: prompt.substring(0, 100),
                category: 'video'
            });
        }

        // Lưu message user
        await Message.create({
            conversationId: conversation._id,
            role: 'user',
            content: prompt
        });

        // Khởi tạo LRO
        const result = await agentPlatform.initiateVideo({
            prompt,
            refBase64,
            refMimeType,
            aspectRatio: aspectRatio || '16:9',
            durationSeconds: durationSeconds || 6,
            modelId,
            user: req.user
        });

        res.json({
            success: true,
            data: {
                operationName: result.operationName,
                modelUsed: result.modelUsed,
                conversationId: conversation._id,
                apiKey: result.apiKey,
                projectNumber: result.projectNumber
            }
        });

    } catch (error) {
        console.error('Video initiation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khởi tạo tạo video'
        });
    }
});

/**
 * POST /api/ai/video/status
 * Polling trạng thái video
 */
router.post('/status', auth, async (req, res) => {
    try {
        const { operationName, modelId, apiKey, projectNumber, conversationId } = req.body;

        if (!operationName) {
            return res.status(400).json({
                success: false,
                message: 'operationName là bắt buộc'
            });
        }

        const result = await agentPlatform.pollVideo({
            operationName,
            modelId,
            apiKey,
            projectNumber
        });

        if (result.done) {
            // Lưu media vào DB
            await Media.create({
                userId: req.user._id,
                type: 'video',
                filePath: result.videoUrl,
                fileName: result.fileName,
                originalName: result.fileName,
                fileSize: result.fileSize,
                mimeType: result.mimeType,
                prompt: req.body.prompt?.substring(0, 500) || '',
                modelUsed: modelId || ''
            });

            // Lưu message AI
            if (conversationId) {
                await Message.create({
                    conversationId,
                    role: 'assistant',
                    content: '',
                    mediaUrl: result.videoUrl,
                    mediaType: 'video',
                    modelUsed: modelId || ''
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessageAt: new Date(),
                    $inc: { messageCount: 1 }
                });
            }

            // Log usage
            tokenCounter.logUsage({
                userId: req.user._id,
                username: req.user.username,
                modelUsed: modelId || 'veo',
                category: 'video',
                prompt: req.body.prompt?.substring(0, 500),
                apiKeyName: '',
                status: 'success'
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Video polling error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi kiểm tra trạng thái video'
        });
    }
});

module.exports = router;
