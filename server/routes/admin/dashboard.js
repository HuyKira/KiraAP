const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const adminOnly = require('../../middleware/adminOnly');
const User = require('../../models/User');
const AILog = require('../../models/AILog');
const ApiKey = require('../../models/ApiKey');
const ModelConfig = require('../../models/ModelConfig');
const Media = require('../../models/Media');

/**
 * GET /admin/login
 */
router.get('/login', (req, res) => {
    res.render('auth/login', { layout: false });
});

/**
 * GET /admin
 * Dashboard tổng quan
 */
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        // Stats cơ bản
        const [totalUsers, totalApiKeys, totalModels, totalMedia] = await Promise.all([
            User.countDocuments(),
            ApiKey.countDocuments({ isActive: true }),
            ModelConfig.countDocuments({ isActive: true }),
            Media.countDocuments()
        ]);

        // Requests hôm nay
        const todayRequests = await AILog.countDocuments({
            createdAt: { $gte: todayStart }
        });

        // Tổng token
        const tokenAgg = await AILog.aggregate([
            { $group: { _id: null, total: { $sum: '$tokenTotal' } } }
        ]);
        const totalTokens = tokenAgg[0]?.total || 0;

        // Top models (7 ngày)
        const topModels = await AILog.aggregate([
            { $match: { createdAt: { $gte: weekStart } } },
            { $group: { _id: '$modelUsed', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Usage chart data (7 ngày gần đây)
        const chartData = await AILog.aggregate([
            { $match: { createdAt: { $gte: weekStart } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    tokens: { $sum: '$tokenTotal' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Recent activity
        const recentLogs = await AILog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.render('admin/dashboard', {
            pageTitle: 'Tổng quan',
            activePage: 'dashboard',
            adminUser: req.user,
            stats: {
                totalUsers,
                totalApiKeys,
                totalModels,
                totalMedia,
                todayRequests,
                totalTokens
            },
            topModels,
            chartData,
            recentLogs
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Lỗi tải dashboard');
    }
});

module.exports = router;
