const mongoose = require('mongoose');

const modelConfigSchema = new mongoose.Schema({
    category: {
        type: String,
        required: [true, 'Danh mục là bắt buộc'],
        enum: ['text', 'image', 'video', 'tts']
    },
    modelId: {
        type: String,
        required: [true, 'Model ID là bắt buộc'],
        trim: true
    },
    displayName: {
        type: String,
        required: [true, 'Tên hiển thị là bắt buộc'],
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    systemPrompt: {
        type: String,
        default: ''
    },
    parameters: {
        temperature: { type: Number, default: 0.7 },
        maxOutputTokens: { type: Number, default: 65536 },
        topP: { type: Number, default: 0.95 },
        topK: { type: Number, default: 40 },
        aspectRatio: { type: String, default: '1:1' },
        voiceName: { type: String, default: 'Puck' },
        durationSeconds: { type: Number, default: 6 }
    }
}, {
    timestamps: true
});

// Đảm bảo chỉ có 1 model mặc định cho mỗi category
modelConfigSchema.pre('save', async function() {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { category: this.category, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
});

module.exports = mongoose.model('ModelConfig', modelConfigSchema);
