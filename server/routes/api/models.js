const express = require('express');
const router = express.Router();
const ModelConfig = require('../../models/ModelConfig');
const Voice = require('../../models/Voice');

/**
 * GET /api/models
 * Lấy danh sách model đang hoạt động (cho user chọn trên UI)
 */
router.get('/', async (req, res) => {
    try {
        const query = { isActive: true };
        if (req.query.category) {
            query.category = req.query.category;
        }
        const models = await ModelConfig.find(query)
            .sort({ isDefault: -1, displayName: 1 })
            .select('modelId displayName category isDefault parameters')
            .lean();

        res.json({ success: true, data: models });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/models/voices
 * Lấy danh sách giọng đọc TTS
 */
router.get('/voices', async (req, res) => {
    try {
        const voices = await Voice.find({ isActive: true }).sort({ name: 1 }).lean();
        res.json({ success: true, data: voices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
