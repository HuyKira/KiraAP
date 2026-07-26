const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../../middleware/auth');
const { aiLimiter } = require('../../middleware/rateLimiter');
const agentPlatform = require('../../services/agentPlatform');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

// Multer cho file text
const upload = multer({
    dest: path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'temp'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['text/plain', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file TXT hoặc PDF'), false);
        }
    }
});

/**
 * POST /api/ai/tts
 * Chuyển text thành giọng nói
 */
router.post('/', auth, aiLimiter, upload.single('textFile'), async (req, res) => {
    try {
        let { text, voiceName, modelId, conversationId } = req.body;

        // Đọc text từ file nếu có
        if (req.file) {
            const fileContent = fs.readFileSync(req.file.path, 'utf-8');
            text = fileContent;
            fs.unlinkSync(req.file.path);
        }

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập văn bản hoặc tải file text'
            });
        }

        // Giới hạn độ dài text
        if (text.length > 5000) {
            text = text.substring(0, 5000);
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
                title: text.substring(0, 100),
                category: 'tts'
            });
        }

        // Lưu message user
        await Message.create({
            conversationId: conversation._id,
            role: 'user',
            content: text
        });

        // Gọi API TTS
        const result = await agentPlatform.generateTTS({
            text,
            voiceName: voiceName || 'Kore',
            modelId,
            user: req.user
        });

        // Lưu message AI
        await Message.create({
            conversationId: conversation._id,
            role: 'assistant',
            content: '',
            mediaUrl: result.audioUrl,
            mediaType: 'audio',
            modelUsed: result.modelUsed,
            tokenInput: result.tokenInput,
            tokenOutput: result.tokenOutput
        });

        // Cập nhật conversation
        await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessageAt: new Date(),
            $inc: { messageCount: 2 }
        });

        res.json({
            success: true,
            data: {
                audioUrl: result.audioUrl,
                conversationId: conversation._id,
                modelUsed: result.modelUsed
            }
        });

    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi tạo giọng nói'
        });
    }
});

module.exports = router;
