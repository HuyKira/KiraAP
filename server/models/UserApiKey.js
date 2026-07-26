const mongoose = require('mongoose');
const crypto = require('crypto');

const userApiKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Tên API Key là bắt buộc'],
        trim: true,
        maxlength: 100
    },
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null // null = vĩnh viễn
    }
}, {
    timestamps: true
});

/**
 * Generate API key dạng kira_sk_xxxx
 */
userApiKeySchema.statics.generateKey = function () {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `kira_sk_${randomBytes}`;
};

/**
 * Mask key để hiển thị an toàn (chỉ show 4 ký tự cuối)
 */
userApiKeySchema.methods.maskedKey = function () {
    if (!this.key) return '';
    return 'kira_sk_••••••••' + this.key.slice(-4);
};

/**
 * Kiểm tra key còn hợp lệ không
 */
userApiKeySchema.methods.isValid = function () {
    if (!this.isActive) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    return true;
};

module.exports = mongoose.model('UserApiKey', userApiKeySchema);
