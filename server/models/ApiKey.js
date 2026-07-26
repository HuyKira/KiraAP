const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tên API Key là bắt buộc'],
        trim: true
    },
    key: {
        type: String,
        required: [true, 'API Key là bắt buộc'],
        trim: true
    },
    projectNumber: {
        type: String,
        trim: true,
        default: ''
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
    lastError: {
        type: String,
        default: ''
    },
    lastErrorAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
