const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['image', 'video', 'audio'],
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        default: ''
    },
    fileSize: {
        type: Number,
        default: 0
    },
    mimeType: {
        type: String,
        default: ''
    },
    prompt: {
        type: String,
        default: ''
    },
    modelUsed: {
        type: String,
        default: ''
    },
    width: {
        type: Number,
        default: 0
    },
    height: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index để query media theo user và type
mediaSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
