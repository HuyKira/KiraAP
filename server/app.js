require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/api/chat');
const imageRoutes = require('./routes/api/image');
const videoRoutes = require('./routes/api/video');
const ttsRoutes = require('./routes/api/tts');
const conversationRoutes = require('./routes/api/conversations');
const userRoutes = require('./routes/api/user');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminUsersRoutes = require('./routes/admin/users');
const adminApiKeysRoutes = require('./routes/admin/apiKeys');
const adminModelsRoutes = require('./routes/admin/models');
const adminMediaRoutes = require('./routes/admin/media');
const adminLogsRoutes = require('./routes/admin/logs');
const adminUserApiKeysRoutes = require('./routes/admin/userApiKeys');
const userApiKeysRoutes = require('./routes/api/apiKeys');
const modelsRoutes = require('./routes/api/models');
const proxyRoutes = require('./routes/api/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// === Kết nối MongoDB ===
connectDB();

// === Middleware ===
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// === Static files ===
app.use(express.static(path.join(__dirname, '..', 'public')));

// === EJS Template Engine (Admin) ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// === API Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/ai/chat', chatRoutes);
app.use('/api/ai/image', imageRoutes);
app.use('/api/ai/video', videoRoutes);
app.use('/api/ai/tts', ttsRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/api-keys', userApiKeysRoutes);
app.use('/api/models', modelsRoutes);

// === Proxy API (OpenAI-compatible) ===
app.use('/v1', proxyRoutes);

// === Admin Routes ===
app.use('/admin', adminDashboardRoutes);
app.use('/admin/users', adminUsersRoutes);
app.use('/admin/api-keys', adminApiKeysRoutes);
app.use('/admin/models', adminModelsRoutes);
app.use('/admin/media', adminMediaRoutes);
app.use('/admin/logs', adminLogsRoutes);
app.use('/admin/user-api-keys', adminUserApiKeysRoutes);

// === User Pages (SSR) ===
app.get('/', (req, res) => {
    res.render('user/chat', { layout: 'layouts/user', activePage: 'chat', pageTitle: 'Trò chuyện' });
});
app.get('/chat', (req, res) => {
    res.render('user/chat', { layout: 'layouts/user', activePage: 'chat', pageTitle: 'Trò chuyện' });
});
app.get('/image', (req, res) => {
    res.render('user/image', { layout: 'layouts/user', activePage: 'image', pageTitle: 'Tạo hình ảnh' });
});
app.get('/video', (req, res) => {
    res.render('user/video', { layout: 'layouts/user', activePage: 'video', pageTitle: 'Tạo video' });
});
app.get('/tts', (req, res) => {
    res.render('user/tts', { layout: 'layouts/user', activePage: 'tts', pageTitle: 'Tạo giọng nói' });
});
app.get('/profile', (req, res) => {
    res.render('user/profile', { layout: 'layouts/user', activePage: 'profile', pageTitle: 'Cài đặt tài khoản' });
});
app.get('/api-keys', (req, res) => {
    res.render('user/api-keys', { layout: 'layouts/user', activePage: 'apiKeys', pageTitle: 'API Keys', extraCSS: '<link rel="stylesheet" href="/css/api-keys.css">' });
});
app.get('/docs', (req, res) => {
    res.render('user/docs', { layout: 'layouts/user', activePage: 'docs', pageTitle: 'Tài liệu API', extraCSS: '<link rel="stylesheet" href="/css/docs.css">' });
});

// === Error Handler ===
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Lỗi server nội bộ'
    });
});

// === 404 Handler ===
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint không tồn tại'
        });
    }
    if (req.path.startsWith('/admin')) {
        return res.status(404).render('admin/404', { layout: false });
    }
    // Fallback: redirect về trang chủ
    res.redirect('/');
});

// === Start Server ===
app.listen(PORT, () => {
    console.log(`\n🚀 Kira Agent Platform đang chạy tại: http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`💬 User App: http://localhost:${PORT}\n`);
});

module.exports = app;
