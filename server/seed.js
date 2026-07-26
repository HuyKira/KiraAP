require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ModelConfig = require('./models/ModelConfig');
const Voice = require('./models/Voice');

/**
 * Seed dữ liệu mặc định: Admin account + Default models
 */
async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB');

        // === Seed Admin ===
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@kiraai.vn';
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const existingAdmin = await User.findOne({ $or: [{ email: adminEmail }, { username: adminUsername }] });

        if (!existingAdmin) {
            await User.create({
                username: process.env.ADMIN_USERNAME || 'admin',
                email: adminEmail,
                password: process.env.ADMIN_PASSWORD || 'Admin@123',
                displayName: 'Admin',
                role: 'admin'
            });
            console.log(`✅ Đã tạo tài khoản admin: ${adminEmail}`);
        } else {
            console.log(`ℹ️  Admin đã tồn tại: ${adminEmail}`);
        }

        // === Seed Default Models ===
        const defaultModels = [
            // --- Text / Chat Models ---
            {
                category: 'text',
                modelId: 'gemini-3.6-flash',
                displayName: 'Gemini 3.6 Flash',
                isDefault: true,
                systemPrompt: 'Bạn là Kira Agent Platform, một trợ lý AI thông minh, thân thiện và hữu ích. Trả lời bằng tiếng Việt khi người dùng hỏi bằng tiếng Việt.',
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-3.5-flash',
                displayName: 'Gemini 3.5 Flash',
                isDefault: false,
                systemPrompt: 'Bạn là Kira Agent Platform, một trợ lý AI thông minh, thân thiện và hữu ích.',
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-3.5-flash-lite',
                displayName: 'Gemini 3.5 Flash Lite',
                isDefault: false,
                systemPrompt: 'Bạn là Kira Agent Platform, một trợ lý AI thông minh, thân thiện và hữu ích.',
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-3.1-pro',
                displayName: 'Gemini 3.1 Pro',
                isDefault: false,
                systemPrompt: 'Bạn là Kira Agent Platform, một trợ lý AI thông minh, thân thiện và hữu ích.',
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-3-flash-preview',
                displayName: 'Gemini 3 Flash Preview',
                isDefault: false,
                systemPrompt: 'Bạn là Kira Agent Platform, một trợ lý AI thông minh, thân thiện và hữu ích.',
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-2.5-flash',
                displayName: 'Gemini 2.5 Flash',
                isDefault: false,
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },
            {
                category: 'text',
                modelId: 'gemini-2.5-pro',
                displayName: 'Gemini 2.5 Pro',
                isDefault: false,
                parameters: { temperature: 0.7, maxOutputTokens: 65536 }
            },


            // --- Image Generation Models ---
            {
                category: 'image',
                modelId: 'gemini-3.1-flash-image',
                displayName: 'Gemini 3.1 Flash Image',
                isDefault: true,
                parameters: { aspectRatio: '1:1' }
            },
            {
                category: 'image',
                modelId: 'gemini-3.1-flash-lite-image',
                displayName: 'Gemini 3.1 Flash Lite Image',
                isDefault: false,
                parameters: { aspectRatio: '1:1' }
            },
            {
                category: 'image',
                modelId: 'gemini-3-pro-image',
                displayName: 'Gemini 3 Pro Image',
                isDefault: false,
                parameters: { aspectRatio: '1:1' }
            },
            {
                category: 'image',
                modelId: 'gemini-2.5-flash-image',
                displayName: 'Gemini 2.5 Flash Image',
                isDefault: false,
                parameters: { aspectRatio: '1:1' }
            },

            // --- Video Generation Models ---
            {
                category: 'video',
                modelId: 'veo-3.1-lite-generate-001',
                displayName: 'Veo 3.1 Lite',
                isDefault: true,
                parameters: { aspectRatio: '16:9', durationSeconds: 4 }
            },
            {
                category: 'video',
                modelId: 'veo-3.0-generate-001',
                displayName: 'Veo 3.0',
                isDefault: false,
                parameters: { aspectRatio: '16:9', durationSeconds: 4 }
            },
            {
                category: 'video',
                modelId: 'veo-2.0-generate-001',
                displayName: 'Veo 2.0',
                isDefault: false,
                parameters: { aspectRatio: '16:9', durationSeconds: 5 }
            },
            {
                category: 'video',
                modelId: 'gemini-omni-flash-preview',
                displayName: 'Gemini Omni Flash Preview',
                isDefault: false,
                parameters: { aspectRatio: '16:9', durationSeconds: 4 }
            },

            // --- Text-to-Speech Models ---
            {
                category: 'tts',
                modelId: 'gemini-3.1-flash-tts-preview',
                displayName: 'Gemini 3.1 Flash TTS (Bản mới nhất)',
                isDefault: true,
                parameters: { voiceName: 'alloy' }
            },
            {
                category: 'tts',
                modelId: 'gemini-2.5-flash-tts',
                displayName: 'Gemini 2.5 Flash TTS (Bản chuẩn)',
                isDefault: false,
                parameters: { voiceName: 'alloy' }
            },
            {
                category: 'tts',
                modelId: 'gemini-2.5-flash-preview-tts',
                displayName: 'Gemini 2.5 Flash TTS Preview',
                isDefault: false,
                parameters: { voiceName: 'alloy' }
            }
        ];

        for (const model of defaultModels) {
            const existing = await ModelConfig.findOne({
                category: model.category,
                modelId: model.modelId
            });

            if (!existing) {
                await ModelConfig.create(model);
                console.log(`✅ Đã tạo model: ${model.displayName} (${model.category})`);
            } else {
                console.log(`ℹ️  Model đã tồn tại: ${model.displayName}`);
            }
        }

        // === Seed Voices (danh sách giọng đọc TTS) ===
        const voices = [
            // KiraAI / OpenAI Mapped Voices
            {
                voiceId: 'alloy',
                name: 'Alloy',
                mappedTo: 'Kore',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ miền Bắc tự nhiên, nhẹ nhàng, tốc độ vừa phải.',
                language: 'vi-VN'
            },
            {
                voiceId: 'echo',
                name: 'Echo',
                mappedTo: 'Fenrir',
                gender: 'Nam (Male)',
                description: 'Giọng nam miền Bắc trầm ấm, rõ ràng, truyền cảm.',
                language: 'vi-VN'
            },
            {
                voiceId: 'fable',
                name: 'Fable',
                mappedTo: 'Aoede',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ miền Nam trẻ trung, ngọt ngào, dễ thương.',
                language: 'vi-VN'
            },
            {
                voiceId: 'onyx',
                name: 'Onyx',
                mappedTo: 'Charon',
                gender: 'Nam (Male)',
                description: 'Giọng nam miền Nam dõng dạc, mạnh mẽ, phù hợp đọc tin tức.',
                language: 'vi-VN'
            },
            {
                voiceId: 'nova',
                name: 'Nova',
                mappedTo: 'Aoede',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ miền Bắc chuyên nghiệp, ấm áp, phù hợp đọc truyện.',
                language: 'vi-VN'
            },
            {
                voiceId: 'shimmer',
                name: 'Shimmer',
                mappedTo: 'Kore',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ miền Bắc trong trẻo, hoạt ngôn, năng động.',
                language: 'vi-VN'
            },
            // Gemini Prebuilt Voices
            {
                voiceId: 'Kore',
                name: 'Kore',
                mappedTo: 'Kore',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ Gemini chuẩn, rõ ràng.',
                language: 'vi-VN'
            },
            {
                voiceId: 'Puck',
                name: 'Puck',
                mappedTo: 'Puck',
                gender: 'Nam (Male)',
                description: 'Giọng nam Gemini trẻ trung, truyền cảm.',
                language: 'vi-VN'
            },
            {
                voiceId: 'Charon',
                name: 'Charon',
                mappedTo: 'Charon',
                gender: 'Nam (Male)',
                description: 'Giọng nam Gemini trầm ấm, quyền lực.',
                language: 'vi-VN'
            },
            {
                voiceId: 'Fenrir',
                name: 'Fenrir',
                mappedTo: 'Fenrir',
                gender: 'Nam (Male)',
                description: 'Giọng nam Gemini dõng dạc, mạnh mẽ.',
                language: 'vi-VN'
            },
            {
                voiceId: 'Aoede',
                name: 'Aoede',
                mappedTo: 'Aoede',
                gender: 'Nữ (Female)',
                description: 'Giọng nữ Gemini ấm áp, truyền cảm.',
                language: 'vi-VN'
            }
        ];

        for (const v of voices) {
            await Voice.findOneAndUpdate(
                { voiceId: v.voiceId },
                v,
                { upsert: true, new: true }
            );
            console.log(`✅ Đã seed giọng đọc: ${v.name} (${v.voiceId}) -> ${v.mappedTo}`);
        }

        console.log('\n🎉 Seed hoàn tất!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed:', error);
        process.exit(1);
    }
}

seed();
