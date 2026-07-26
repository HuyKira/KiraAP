/**
 * Middleware kiểm tra quyền admin
 * Phải đặt SAU middleware auth
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        // Nếu là request từ admin panel (EJS), redirect về login
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect('/admin/login');
        }
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chức năng này'
        });
    }
    next();
};

module.exports = adminOnly;
