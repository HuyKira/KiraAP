const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Helper: kiểm tra request có phải admin page (HTML) không
 */
function isAdminPageRequest(req) {
    return req.originalUrl.startsWith('/admin') && !req.originalUrl.includes('/api');
}

/**
 * Helper: trả lỗi auth — redirect cho admin pages, JSON cho API
 */
function authError(req, res, status, message) {
    if (isAdminPageRequest(req)) {
        return res.redirect('/admin/login');
    }
    return res.status(status).json({ success: false, message });
}

/**
 * Middleware xác thực JWT token
 * Kiểm tra: header Authorization → cookie → query string
 */
const auth = async (req, res, next) => {
    try {
        let token = null;

        // 1. Lấy token từ header Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // 2. Hoặc từ cookie (cho admin panel EJS)
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return authError(req, res, 401, 'Vui lòng đăng nhập để tiếp tục');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Tìm user
        const user = await User.findById(decoded.id);
        if (!user) {
            return authError(req, res, 401, 'Token không hợp lệ, người dùng không tồn tại');
        }

        if (!user.isActive) {
            return authError(req, res, 403, 'Tài khoản của bạn đã bị khoá');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return authError(req, res, 401, 'Token không hợp lệ hoặc đã hết hạn');
        }
        return authError(req, res, 500, 'Lỗi xác thực');
    }
};

module.exports = auth;
