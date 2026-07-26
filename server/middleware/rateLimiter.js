const rateLimit = require('express-rate-limit');

// Rate limit cho API AI (tránh spam)
const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 30, // Tối đa 30 request / phút
    message: {
        success: false,
        message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 1 phút'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limit cho đăng nhập (chống brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 10, // Tối đa 10 lần / 15 phút
    message: {
        success: false,
        message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limit chung cho API
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { aiLimiter, authLimiter, apiLimiter };
