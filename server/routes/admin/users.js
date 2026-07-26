const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const User = require('../../models/User');

router.use(auth, adminOnly);

// GET /admin/users
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || '';
    const query = search ? { $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
    ] } : {};
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await User.countDocuments(query);
    res.render('admin/users', { pageTitle: 'Người dùng', activePage: 'users', adminUser: req.user, users, total, page, totalPages: Math.ceil(total / limit), search });
});

// PUT /admin/users/api/:id
router.put('/api/:id', async (req, res) => {
    try {
        const { role, isActive, displayName, email, password } = req.body;
        const user = await User.findById(req.params.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

        if (displayName !== undefined) user.displayName = displayName;
        if (role !== undefined) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (email !== undefined && email.trim()) user.email = email.trim();
        if (password && password.trim().length >= 6) {
            user.password = password.trim();
        }

        await user.save();
        res.json({ success: true, data: user });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /admin/users/api/:id
router.delete('/api/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Không thể xoá admin' });
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
