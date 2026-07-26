const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const AILog = require('../../models/AILog');

router.use(auth, adminOnly);

// GET /admin/logs
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const { category, status, username } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (username) query.username = { $regex: username, $options: 'i' };
    const logs = await AILog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await AILog.countDocuments(query);
    res.render('admin/logs', { pageTitle: 'Nhật ký AI', activePage: 'logs', adminUser: req.user, logs, total, page, totalPages: Math.ceil(total / limit), filters: { category, status, username } });
});

// GET /admin/logs/export (CSV)
router.get('/export', async (req, res) => {
    try {
        const { category, status } = req.query;
        const query = {};
        if (category) query.category = category;
        if (status) query.status = status;
        const logs = await AILog.find(query).sort({ createdAt: -1 }).limit(5000).lean();

        let csv = 'Thời gian,Người dùng,Model,Loại,Token vào,Token ra,Tổng token,Thời gian phản hồi (ms),Trạng thái,Lỗi\n';
        logs.forEach(log => {
            csv += `"${new Date(log.createdAt).toLocaleString('vi-VN')}","${log.username}","${log.modelUsed}","${log.category}",${log.tokenInput},${log.tokenOutput},${log.tokenTotal},${log.responseTime},"${log.status}","${log.errorMessage || ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=ai_logs.csv');
        res.send('\uFEFF' + csv); // BOM for Excel
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /admin/logs/api/:id (Chi tiết log)
router.get('/api/:id', async (req, res) => {
    try {
        const log = await AILog.findById(req.params.id).lean();
        if (!log) return res.status(404).json({ success: false, message: 'Không tìm thấy nhật ký' });
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
