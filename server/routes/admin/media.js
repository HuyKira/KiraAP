const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const Media = require('../../models/Media');

router.use(auth, adminOnly);

// GET /admin/media
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 24;
    const type = req.query.type || '';
    const query = type ? { type } : {};
    const media = await Media.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username displayName').lean();
    const total = await Media.countDocuments(query);
    res.render('admin/media', { pageTitle: 'Thư viện', activePage: 'media', adminUser: req.user, media, total, page, totalPages: Math.ceil(total / limit), type });
});

// DELETE /admin/media/api/:id
router.delete('/api/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        // Xoá file
        const filePath = path.join(__dirname, '..', '..', '..', 'public', media.filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await Media.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
