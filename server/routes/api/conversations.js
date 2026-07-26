const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');

/**
 * GET /api/conversations
 * Lấy danh sách conversation của user
 */
router.get('/', auth, async (req, res) => {
    try {
        const { category, page = 1, limit = 50 } = req.query;

        const query = { userId: req.user._id };
        if (category) query.category = category;

        const conversations = await Conversation.find(query)
            .sort({ lastMessageAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Conversation.countDocuments(query);

        res.json({
            success: true,
            data: {
                conversations,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách hội thoại'
        });
    }
});

/**
 * POST /api/conversations
 * Tạo conversation mới
 */
router.post('/', auth, async (req, res) => {
    try {
        const { title, category = 'chat' } = req.body;

        const conversation = await Conversation.create({
            userId: req.user._id,
            title: title || 'Cuộc trò chuyện mới',
            category
        });

        res.status(201).json({
            success: true,
            data: { conversation }
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo hội thoại mới'
        });
    }
});

/**
 * GET /api/conversations/:id/messages
 * Lấy messages của conversation
 */
router.get('/:id/messages', auth, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội thoại'
            });
        }

        const messages = await Message.find({
            conversationId: conversation._id
        }).sort({ createdAt: 1 }).lean();

        res.json({
            success: true,
            data: {
                conversation,
                messages
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy tin nhắn'
        });
    }
});

/**
 * PUT /api/conversations/:id
 * Cập nhật conversation (đổi tên)
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const { title } = req.body;

        const conversation = await Conversation.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { title },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội thoại'
            });
        }

        res.json({
            success: true,
            data: { conversation }
        });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi cập nhật hội thoại'
        });
    }
});

/**
 * DELETE /api/conversations/:id
 * Xoá conversation và tất cả messages
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hội thoại'
            });
        }

        // Xoá tất cả messages
        await Message.deleteMany({ conversationId: conversation._id });
        // Xoá conversation
        await Conversation.findByIdAndDelete(conversation._id);

        res.json({
            success: true,
            message: 'Đã xoá hội thoại'
        });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xoá hội thoại'
        });
    }
});

module.exports = router;
