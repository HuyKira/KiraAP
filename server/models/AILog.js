const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    username: {
        type: String,
        default: ''
    },
    modelUsed: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['text', 'image', 'video', 'tts'],
        required: true
    },
    prompt: {
        type: String,
        default: '',
        maxlength: 1000
    },
    responseContent: {
        type: String,
        default: '',
        maxlength: 2000
    },
    tokenInput: {
        type: Number,
        default: 0
    },
    tokenOutput: {
        type: Number,
        default: 0
    },
    tokenTotal: {
        type: Number,
        default: 0
    },
    apiKeyName: {
        type: String,
        default: ''
    },
    responseTime: {
        type: Number,
        default: 0 // milliseconds
    },
    status: {
        type: String,
        enum: ['success', 'error'],
        default: 'success'
    },
    errorMessage: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes cho dashboard analytics
aiLogSchema.index({ createdAt: -1 });
aiLogSchema.index({ userId: 1, createdAt: -1 });
aiLogSchema.index({ category: 1, createdAt: -1 });
aiLogSchema.index({ modelUsed: 1, createdAt: -1 });

module.exports = mongoose.model('AILog', aiLogSchema);
