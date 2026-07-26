const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    fileName: String,
    originalName: String,
    filePath: String,
    mimeType: String,
    fileSize: Number
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    mediaUrl: {
        type: String,
        default: ''
    },
    mediaType: {
        type: String,
        enum: ['', 'image', 'video', 'audio'],
        default: ''
    },
    attachments: [attachmentSchema],
    modelUsed: {
        type: String,
        default: ''
    },
    tokenInput: {
        type: Number,
        default: 0
    },
    tokenOutput: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index cho query messages theo conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
