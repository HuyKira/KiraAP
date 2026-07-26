const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * Tạo JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới
 */
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email này đã được sử dụng'
            });
        }

        // Kiểm tra username đã tồn tại
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập này đã được sử dụng'
            });
        }

        // Tạo user mới
        const user = await User.create({
            username,
            email,
            password,
            displayName: displayName || username
        });

        // Tạo token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau'
        });
    }
});

/**
 * POST /api/auth/login
 * Đăng nhập
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, username, account, password } = req.body;
        const loginIdentifier = (account || email || username || '').trim();

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên đăng nhập hoặc email và mật khẩu'
            });
        }

        // Tìm user theo email hoặc username kèm password
        const user = await User.findOne({
            $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập / email hoặc mật khẩu không đúng'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khoá'
            });
        }

        // So sánh password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập / email hoặc mật khẩu không đúng'
            });
        }

        // Tạo token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau'
        });
    }
});

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại
 */
router.get('/me', auth, async (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                displayName: req.user.displayName,
                avatar: req.user.avatar,
                role: req.user.role,
                createdAt: req.user.createdAt
            }
        }
    });
});

/**
 * PUT /api/auth/profile
 * Cập nhật thông tin cá nhân
 */
router.put('/profile', auth, async (req, res) => {
    try {
        const { displayName, avatar } = req.body;
        const updates = {};

        if (displayName !== undefined) updates.displayName = displayName;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi cập nhật thông tin'
        });
    }
});

/**
 * PUT /api/auth/password
 * Đổi mật khẩu
 */
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        const user = await User.findById(req.user._id).select('+password');
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi đổi mật khẩu'
        });
    }
});

module.exports = router;
