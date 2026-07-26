const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');

const Media = require('../../models/Media');

/**
 * GET /api/user/profile
 * Lấy thông tin user
 */
router.get('/profile', auth, async (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                displayName: req.user.displayName,
                avatar: req.user.avatar,
                role: req.user.role,
                createdAt: req.user.createdAt
            }
        }
    });
});

/**
 * PUT /api/user/profile
 * Cập nhật thông tin cá nhân
 */
router.put('/profile', auth, async (req, res) => {
    try {
        const { displayName } = req.body;
        const updates = {};

        if (displayName !== undefined) updates.displayName = displayName;

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            message: 'Cập nhật thành công',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi cập nhật thông tin'
        });
    }
});

/**
 * GET /api/user/media
 * Lấy danh sách media đã tạo của user (phân trang + lọc theo type)
 */
router.get('/media', auth, async (req, res) => {
    try {
        const { type, page = 1, limit = 60 } = req.query;
        const query = { userId: req.user._id };
        if (type) query.type = type;

        const media = await Media.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const total = await Media.countDocuments(query);

        res.json({
            success: true,
            data: {
                media,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get user media error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách media'
        });
    }
});

/**
 * DELETE /api/user/media/:id
 * Xoá 1 item media của user
 */
router.delete('/media/:id', auth, async (req, res) => {
    try {
        const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });
        if (!media) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tệp media'
            });
        }
        await Media.findByIdAndDelete(media._id);
        res.json({
            success: true,
            message: 'Đã xoá tệp media'
        });
    } catch (error) {
        console.error('Delete user media error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xoá tệp media'
        });
    }
});

module.exports = router;
