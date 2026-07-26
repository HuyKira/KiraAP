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

// Multer cho ảnh tham chiếu
const upload = multer({
    dest: path.join(__dirname, '..', '..', '..', 'public', 'uploads', 'temp'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file ảnh'), false);
        }
    }
});

/**
 * POST /api/ai/image
 * Tạo ảnh từ prompt (+ ảnh tham chiếu tuỳ chọn)
 */
router.post('/', auth, aiLimiter, upload.array('refImages', 3), async (req, res) => {
    try {
        const { prompt, aspectRatio, modelId, conversationId, count } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mô tả hình ảnh'
            });
        }

        // Xử lý danh sách ảnh tham chiếu (tối đa 3 ảnh)
        const refImages = [];
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files.slice(0, 3)) {
                const fileBuffer = fs.readFileSync(file.path);
                refImages.push({
                    base64: fileBuffer.toString('base64'),
                    mimeType: file.mimetype
                });
                fs.unlinkSync(file.path);
            }
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
                category: 'image'
            });
        }

        // Lưu message user
        await Message.create({
            conversationId: conversation._id,
            role: 'user',
            content: prompt
        });

        // Gọi API tạo ảnh (truyền count & refImages)
        const result = await agentPlatform.generateImage({
            prompt,
            refImages,
            aspectRatio: aspectRatio || '1:1',
            count: count ? parseInt(count, 10) : 1,
            modelId,
            user: req.user
        });

        const urls = result.imageUrls || [result.imageUrl];

        // Lưu message AI cho từng ảnh
        for (const url of urls) {
            await Message.create({
                conversationId: conversation._id,
                role: 'assistant',
                content: result.textResponse || '',
                mediaUrl: url,
                mediaType: 'image',
                modelUsed: result.modelUsed,
                tokenInput: Math.round((result.tokenInput || 0) / urls.length),
                tokenOutput: Math.round((result.tokenOutput || 0) / urls.length)
            });
        }

        // Cập nhật conversation
        await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessageAt: new Date(),
            $inc: { messageCount: 1 + urls.length }
        });

        res.json({
            success: true,
            data: {
                imageUrl: result.imageUrl,
                imageUrls: urls,
                textResponse: result.textResponse,
                conversationId: conversation._id,
                modelUsed: result.modelUsed
            }
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi tạo ảnh'
        });
    }
});

module.exports = router;
