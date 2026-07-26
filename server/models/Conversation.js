const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'Cuộc trò chuyện mới',
        trim: true,
        maxlength: 200
    },
    category: {
        type: String,
        enum: ['chat', 'image', 'video', 'tts'],
        default: 'chat'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    messageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index để query nhanh conversation của user
conversationSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
