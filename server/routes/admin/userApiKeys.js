const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const UserApiKey = require('../../models/UserApiKey');

router.use(auth, adminOnly);

// GET /admin/user-api-keys — Trang quản lý
router.get('/', async (req, res) => {
    const keys = await UserApiKey.find()
        .populate('userId', 'username displayName email')
        .sort({ createdAt: -1 })
        .lean();
    res.render('admin/user-api-keys', {
        pageTitle: 'User API Keys',
        activePage: 'userApiKeys',
        adminUser: req.user,
        keys
    });
});

// PUT /admin/user-api-keys/api/:id — Bật/tắt key
router.put('/api/:id', async (req, res) => {
    try {
        const { isActive } = req.body;
        const key = await UserApiKey.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        );
        if (!key) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, data: key });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /admin/user-api-keys/api/:id — Xoá key
router.delete('/api/:id', async (req, res) => {
    try {
        const key = await UserApiKey.findByIdAndDelete(req.params.id);
        if (!key) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
