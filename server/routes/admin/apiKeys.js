const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const ApiKey = require('../../models/ApiKey');

router.use(auth, adminOnly);

// GET /admin/api-keys
router.get('/', async (req, res) => {
    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    res.render('admin/api-keys', { pageTitle: 'Khoá API', activePage: 'apiKeys', adminUser: req.user, keys });
});

// POST /admin/api-keys (API)
router.post('/api', async (req, res) => {
    try {
        const { name, key, projectNumber } = req.body;
        if (!name || !key) {
            return res.status(400).json({ success: false, message: 'Tên và API Key là bắt buộc' });
        }
        const apiKey = await ApiKey.create({ name, key, projectNumber: projectNumber || '' });
        res.json({ success: true, data: apiKey });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /admin/api-keys/api/:id
router.put('/api/:id', async (req, res) => {
    try {
        const { name, key, projectNumber, isActive } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (key !== undefined) updates.key = key;
        if (projectNumber !== undefined) updates.projectNumber = projectNumber;
        if (isActive !== undefined) updates.isActive = isActive;

        const apiKey = await ApiKey.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!apiKey) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, data: apiKey });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /admin/api-keys/api/:id
router.delete('/api/:id', async (req, res) => {
    try {
        await ApiKey.findByIdAndDelete(req.params.id);
        const apiKeyManager = require('../../services/apiKeyManager');
        apiKeyManager.invalidateCache();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
