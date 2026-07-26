const UserApiKey = require('../models/UserApiKey');
const User = require('../models/User');

/**
 * Middleware xác thực Proxy API bằng User API Key
 * Đọc Authorization: Bearer kira_sk_xxxxx
 */
const proxyAuth = async (req, res, next) => {
    try {
        let apiKey = null;

        // Lấy key từ header Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            apiKey = req.headers.authorization.split(' ')[1];
        }

        if (!apiKey || !apiKey.startsWith('kira_sk_')) {
            return res.status(401).json({
                error: {
                    message: 'API key không hợp lệ. Vui lòng sử dụng format: Authorization: Bearer kira_sk_xxxxx',
                    type: 'invalid_api_key',
                    code: 'invalid_api_key'
                }
            });
        }

        // Tìm key trong DB
        const userApiKey = await UserApiKey.findOne({ key: apiKey });

        if (!userApiKey) {
            return res.status(401).json({
                error: {
                    message: 'API key không tồn tại',
                    type: 'invalid_api_key',
                    code: 'invalid_api_key'
                }
            });
        }

        // Kiểm tra key hợp lệ
        if (!userApiKey.isValid()) {
            const reason = !userApiKey.isActive ? 'đã bị vô hiệu hoá' : 'đã hết hạn';
            return res.status(401).json({
                error: {
                    message: `API key ${reason}`,
                    type: 'expired_api_key',
                    code: 'expired_api_key'
                }
            });
        }

        // Tìm user sở hữu key
        const user = await User.findById(userApiKey.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                error: {
                    message: 'Tài khoản không hợp lệ hoặc đã bị khoá',
                    type: 'account_disabled',
                    code: 'account_disabled'
                }
            });
        }

        // Cập nhật usage (async)
        UserApiKey.findByIdAndUpdate(userApiKey._id, {
            $inc: { usageCount: 1 },
            lastUsedAt: new Date()
        }).catch(err => console.error('Lỗi cập nhật usage:', err));

        // Gắn vào request
        req.user = user;
        req.apiKey = userApiKey;
        next();
    } catch (error) {
        console.error('Proxy auth error:', error);
        return res.status(500).json({
            error: {
                message: 'Lỗi xác thực API key',
                type: 'server_error',
                code: 'server_error'
            }
        });
    }
};

module.exports = proxyAuth;
