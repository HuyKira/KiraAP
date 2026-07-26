const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const UserApiKey = require('../../models/UserApiKey');

router.use(auth);

/**
 * GET /api/user/api-keys
 * Danh sách API key của user hiện tại
 */
router.get('/', async (req, res) => {
    try {
        const keys = await UserApiKey.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: keys });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/user/api-keys
 * Tạo API key mới
 */
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên API key là bắt buộc' });
        }

        // Giới hạn mỗi user tối đa 10 key
        const count = await UserApiKey.countDocuments({ userId: req.user._id });
        if (count >= 10) {
            return res.status(400).json({ success: false, message: 'Bạn chỉ được tạo tối đa 10 API key' });
        }

        const key = UserApiKey.generateKey();
        const apiKey = await UserApiKey.create({
            userId: req.user._id,
            name: name.trim(),
            key
        });

        // Trả key đầy đủ LẦN DUY NHẤT khi tạo
        res.json({
            success: true,
            data: {
                _id: apiKey._id,
                name: apiKey.name,
                key: apiKey.key, // Full key — chỉ show 1 lần
                createdAt: apiKey.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * DELETE /api/user/api-keys/:id
 * Xoá API key
 */
router.delete('/:id', async (req, res) => {
    try {
        const apiKey = await UserApiKey.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id // Chỉ xoá key của chính user
        });

        if (!apiKey) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy API key' });
        }

        res.json({ success: true, message: 'Đã xoá API key' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
