const mongoose = require('mongoose');

const voiceSchema = new mongoose.Schema({
    voiceId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    mappedTo: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'vi-VN'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Voice', voiceSchema);
