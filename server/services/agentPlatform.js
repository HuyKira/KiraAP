const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const apiKeyManager = require('./apiKeyManager');
const tokenCounter = require('./tokenCounter');
const ModelConfig = require('../models/ModelConfig');
const Media = require('../models/Media');

/**
 * Agent Platform Service
 * Wrapper thống nhất gọi tất cả API của Google Agent Platform
 */
class AgentPlatformService {

    /**
     * Lấy model config mặc định cho category
     */
    async getDefaultModel(category) {
        let model = await ModelConfig.findOne({ category, isDefault: true, isActive: true });
        if (!model) {
            model = await ModelConfig.findOne({ category, isActive: true });
        }
        if (!model) {
            const defaults = {
                text: { modelId: 'gemini-3.6-flash', systemPrompt: '' },
                image: { modelId: 'gemini-3.1-flash-image' },
                video: { modelId: 'veo-3.1-lite-generate-001' },
                tts: { modelId: 'gemini-3.1-flash-tts-preview', parameters: { voiceName: 'Puck' } }
            };
            model = defaults[category];
        }
        return model;
    }

    // ==========================================
    // TEXT GENERATION (Chat)
    // ==========================================

    /**
     * Sinh text (đồng bộ)
     * @param {Object} params
     * @param {string} params.prompt - Nội dung prompt
     * @param {Array} params.history - Lịch sử hội thoại [{role, parts}]
     * @param {Array} params.attachments - File đính kèm [{base64, mimeType}]
     * @param {string} params.modelId - Model ID (tuỳ chọn)
     * @param {string} params.systemPrompt - System prompt (tuỳ chọn)
     * @param {Object} params.user - User info cho logging
     */
    async generateText({ prompt, history = [], attachments = [], modelId, systemPrompt, user }) {
        const startTime = Date.now();
        const apiKeyInfo = await apiKeyManager.getNextKey();

        // Lấy model config
        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId, isActive: true });
        }
        if (!model) {
            model = await this.getDefaultModel('text');
        }
        if (!model) {
            throw new Error('Không có model text nào được cấu hình');
        }

        const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model.modelId}:generateContent?key=${apiKeyInfo.key}`;

        // Xây dựng parts cho message cuối
        const userParts = [];
        if (prompt) userParts.push({ text: prompt });

        // Thêm file đính kèm
        for (const att of attachments) {
            userParts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.base64
                }
            });
        }

        // Xây dựng contents
        const contents = [...history, { role: 'user', parts: userParts }];

        // Xây dựng payload
        const payload = {
            contents,
            generationConfig: {
                temperature: model.parameters?.temperature || 0.7,
                maxOutputTokens: model.parameters?.maxOutputTokens || 65536,
                topP: model.parameters?.topP || 0.95
            }
        };

        // System instruction
        const sysPrompt = systemPrompt || model.systemPrompt;
        if (sysPrompt) {
            payload.systemInstruction = { parts: [{ text: sysPrompt }] };
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || `API Error (${response.status})`);
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const usage = tokenCounter.parseUsageMetadata(data);
            const responseTime = Date.now() - startTime;

            // Ghi log
            if (user) {
                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model.modelId,
                    category: 'text',
                    prompt: prompt?.substring(0, 1000),
                    responseContent: text?.substring(0, 2000),
                    tokenInput: usage.tokenInput,
                    tokenOutput: usage.tokenOutput,
                    apiKeyName: apiKeyInfo.name,
                    responseTime,
                    status: 'success'
                });
            }

            return {
                text,
                modelUsed: model.modelId,
                ...usage,
                responseTime
            };

        } catch (error) {
            // Ghi log lỗi
            if (user) {
                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model.modelId,
                    category: 'text',
                    prompt: prompt?.substring(0, 500),
                    apiKeyName: apiKeyInfo.name,
                    responseTime: Date.now() - startTime,
                    status: 'error',
                    errorMessage: error.message
                });
            }
            throw error;
        }
    }

    /**
     * Sinh text stream (SSE)
     * Trả về response stream để pipe trực tiếp đến client
     */
    async generateTextStream({ prompt, history = [], attachments = [], modelId, systemPrompt, user }) {
        const apiKeyInfo = await apiKeyManager.getNextKey();

        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId, isActive: true });
        }
        if (!model) {
            model = await this.getDefaultModel('text');
        }
        if (!model) {
            throw new Error('Không có model text nào được cấu hình');
        }

        const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model.modelId}:streamGenerateContent?alt=sse&key=${apiKeyInfo.key}`;

        const userParts = [];
        if (prompt) userParts.push({ text: prompt });

        for (const att of attachments) {
            userParts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.base64
                }
            });
        }

        const contents = [...history, { role: 'user', parts: userParts }];

        const payload = {
            contents,
            generationConfig: {
                temperature: model.parameters?.temperature || 0.7,
                maxOutputTokens: model.parameters?.maxOutputTokens || 65536,
                topP: model.parameters?.topP || 0.95
            }
        };

        const sysPrompt = systemPrompt || model.systemPrompt;
        if (sysPrompt) {
            payload.systemInstruction = { parts: [{ text: sysPrompt }] };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error (${response.status})`);
        }

        return {
            stream: response.body,
            modelUsed: model.modelId,
            apiKeyName: apiKeyInfo.name,
            userId: user?._id || user?.id,
            username: user?.username
        };
    }

    // ==========================================
    // IMAGE GENERATION
    // ==========================================

    /**
     * Tạo 1 hoặc nhiều ảnh
     * @param {Object} params
     * @param {string} params.prompt
     * @param {Array} params.refImages
     * @param {string} params.refImageBase64
     * @param {string} params.refImageMimeType
     * @param {string} params.aspectRatio
     * @param {number} params.count - Số lượng ảnh cần tạo (mặc định 1)
     * @param {string} params.modelId
     * @param {Object} params.user
     */
    async generateImage(params) {
        const count = Math.min(Math.max(parseInt(params.count, 10) || 1, 1), 4);

        if (count === 1) {
            const result = await this.generateSingleImage(params);
            return {
                ...result,
                imageUrls: [result.imageUrl],
                images: [{ url: result.imageUrl }]
            };
        }

        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push(this.generateSingleImage(params));
        }

        const results = await Promise.all(promises);
        const imageUrls = results.map(r => r.imageUrl);
        const images = results.map(r => ({ url: r.imageUrl }));

        return {
            imageUrl: results[0].imageUrl,
            imageUrls,
            images,
            textResponse: results[0].textResponse || '',
            modelUsed: results[0].modelUsed,
            tokenInput: results.reduce((sum, r) => sum + (r.tokenInput || 0), 0),
            tokenOutput: results.reduce((sum, r) => sum + (r.tokenOutput || 0), 0),
            responseTime: Math.max(...results.map(r => r.responseTime || 0))
        };
    }

    /**
     * Tạo ảnh (hỗ trợ tạo 1 ảnh)
     * @param {Object} params
     * @param {string} params.prompt
     * @param {Array} params.refImages - Danh sách ảnh tham chiếu [{base64, mimeType}] (tối đa 3)
     * @param {string} params.refImageBase64 - Ảnh tham chiếu (tương thích ngược)
     * @param {string} params.refImageMimeType
     * @param {string} params.aspectRatio - '1:1', '16:9', '9:16', '4:3'
     * @param {string} params.modelId
     * @param {Object} params.user
     */
    async generateSingleImage({ prompt, refImages = [], refImageBase64, refImageMimeType, aspectRatio = '1:1', modelId, user }) {
        const startTime = Date.now();
        const apiKeyInfo = await apiKeyManager.getNextKey();

        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId, isActive: true });
        }
        if (!model) {
            model = await this.getDefaultModel('image');
        }
        if (!model) {
            throw new Error('Không có model image nào được cấu hình');
        }

        const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model.modelId}:generateContent?key=${apiKeyInfo.key}`;

        const parts = [{ text: prompt }];

        // Thêm các ảnh tham chiếu (tối đa 3 ảnh)
        if (Array.isArray(refImages) && refImages.length > 0) {
            for (const img of refImages.slice(0, 3)) {
                let cleanB64 = typeof img === 'string' ? img : img.base64;
                let mimeType = (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/png';

                if (cleanB64 && cleanB64.startsWith('data:')) {
                    const matches = cleanB64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
                    if (matches) {
                        mimeType = matches[1];
                        cleanB64 = matches[2];
                    }
                }

                if (cleanB64) {
                    parts.push({
                        inlineData: { mimeType, data: cleanB64 }
                    });
                }
            }
        } else if (refImageBase64) {
            let cleanB64 = refImageBase64;
            let mimeType = refImageMimeType || 'image/png';

            if (refImageBase64.startsWith('data:')) {
                const matches = refImageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
                if (matches) {
                    mimeType = matches[1];
                    cleanB64 = matches[2];
                }
            }

            parts.push({
                inlineData: { mimeType, data: cleanB64 }
            });
        }

        const payload = {
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                imageConfig: { aspectRatio: aspectRatio || model.parameters?.aspectRatio || '1:1' }
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(90000) // 90s timeout
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || `API Error (${response.status})`);
            }

            const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!imagePart) {
                throw new Error('AI không trả về dữ liệu ảnh');
            }

            // Lưu ảnh vào file
            const ext = imagePart.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
            const fileName = `img_${uuidv4()}.${ext}`;
            const filePath = path.join('uploads', 'images', fileName);
            const absolutePath = path.join(__dirname, '..', '..', 'public', filePath);

            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
            fs.writeFileSync(absolutePath, buffer);

            const fileSize = buffer.length;
            const usage = tokenCounter.parseUsageMetadata(data);
            const responseTime = Date.now() - startTime;

            // Lưu media vào DB
            if (user) {
                await Media.create({
                    userId: user._id || user.id,
                    type: 'image',
                    filePath: '/' + filePath,
                    fileName,
                    originalName: fileName,
                    fileSize,
                    mimeType: imagePart.inlineData.mimeType,
                    prompt: prompt?.substring(0, 500),
                    modelUsed: model.modelId
                });

                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model.modelId,
                    category: 'image',
                    prompt: prompt?.substring(0, 1000),
                    responseContent: '/' + filePath,
                    tokenInput: usage.tokenInput,
                    tokenOutput: usage.tokenOutput,
                    apiKeyName: apiKeyInfo.name,
                    responseTime,
                    status: 'success'
                });
            }

            // Lấy text response nếu có
            const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);

            return {
                imageUrl: '/' + filePath,
                mimeType: imagePart.inlineData.mimeType,
                textResponse: textPart?.text || '',
                modelUsed: model.modelId,
                ...usage,
                responseTime
            };

        } catch (error) {
            if (user) {
                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model.modelId,
                    category: 'image',
                    prompt: prompt?.substring(0, 500),
                    apiKeyName: apiKeyInfo.name,
                    responseTime: Date.now() - startTime,
                    status: 'error',
                    errorMessage: error.message
                });
            }
            throw error;
        }
    }

    // ==========================================
    // VIDEO GENERATION (LRO)
    // ==========================================

    /**
     * Khởi tạo tạo video (Long Running Operation)
     */
    async initiateVideo({ prompt, refBase64, refMimeType, aspectRatio = '16:9', durationSeconds = 6, modelId, user }) {
        const apiKeyInfo = await apiKeyManager.getNextKey();

        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId, isActive: true });
        }
        if (!model) {
            model = await this.getDefaultModel('video');
        }
        if (!model) {
            throw new Error('Không có model video nào được cấu hình');
        }

        const projectNumber = apiKeyInfo.projectNumber;
        if (!projectNumber) {
            throw new Error('Chưa cấu hình Project Number cho API Key này. Vui lòng cập nhật trong trang quản trị.');
        }

        // Custom Handler cho model gemini-omni-flash-preview (API Interactions /v1beta1)
        if (model.modelId === 'gemini-omni-flash-preview') {
            const omniEndpoint = `https://aiplatform.googleapis.com/v1beta1/projects/${projectNumber}/locations/global/interactions`;
            const inputs = [{ type: 'text', text: prompt }];

            if (refBase64) {
                let cleanB64 = refBase64;
                let mime = refMimeType || 'image/png';
                if (cleanB64.startsWith('data:')) {
                    const matches = cleanB64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
                    if (matches) { mime = matches[1]; cleanB64 = matches[2]; }
                }
                inputs.push({ type: mime.startsWith('video/') ? 'video' : 'image', data: cleanB64, mime_type: mime });
            }

            const omniPayload = {
                model: 'gemini-omni-flash-preview',
                input: inputs
            };

            const response = await fetch(omniEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Bearer ${apiKeyInfo.key}`
                },
                body: JSON.stringify(omniPayload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || (Array.isArray(data) && data[0]?.error?.message) || 'Lỗi tạo Gemini Omni Video');
            }

            const modelOutputStep = data.steps?.find(s => s.type === 'model_output');
            const videoContent = modelOutputStep?.content?.find(c => c.type === 'video');
            const videoData = videoContent?.data;

            if (videoData) {
                const fileName = `vid_${uuidv4()}.mp4`;
                const filePath = path.join('uploads', 'videos', fileName);
                const absolutePath = path.join(__dirname, '..', '..', 'public', filePath);
                const buffer = Buffer.from(videoData, 'base64');
                fs.writeFileSync(absolutePath, buffer);

                const directOpName = `omni_direct:${fileName}:${buffer.length}:${videoContent.mime_type || 'video/mp4'}`;
                return {
                    operationName: directOpName,
                    modelUsed: model.modelId,
                    apiKey: apiKeyInfo.key,
                    projectNumber,
                    apiKeyName: apiKeyInfo.name
                };
            }
        }

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/us-central1/publishers/google/models/${model.modelId}:predictLongRunning?key=${apiKeyInfo.key}`;

        const instance = { prompt };

        if (refBase64) {
            let cleanB64 = refBase64;
            let mime = refMimeType || 'image/png';
            if (cleanB64.startsWith('data:')) {
                const matches = cleanB64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
                if (matches) {
                    mime = matches[1];
                    cleanB64 = matches[2];
                }
            }
            if (mime.startsWith('video/')) {
                instance.video = { bytesBase64Encoded: cleanB64, mimeType: mime };
            } else {
                instance.image = { bytesBase64Encoded: cleanB64, mimeType: mime };
            }
        }

        const payload = {
            instances: [instance],
            parameters: {
                aspectRatio: aspectRatio || model.parameters?.aspectRatio || '16:9',
                durationSeconds: parseInt(durationSeconds || model.parameters?.durationSeconds || 6),
                sampleCount: 1
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Lỗi khởi tạo tạo video');
        }

        return {
            operationName: data.name,
            modelUsed: model.modelId,
            apiKey: apiKeyInfo.key,
            projectNumber,
            apiKeyName: apiKeyInfo.name
        };
    }

    /**
     * Polling trạng thái video
     */
    async pollVideo({ operationName, modelId, apiKey, projectNumber }) {
        if (operationName && operationName.startsWith('omni_direct:')) {
            const parts = operationName.split(':');
            const fileName = parts[1];
            const fileSize = parseInt(parts[2] || '0');
            const mimeType = parts[3] || 'video/mp4';
            return {
                done: true,
                videoUrl: '/uploads/videos/' + fileName,
                mimeType,
                fileName,
                fileSize
            };
        }
        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId });
        }
        if (!model) {
            model = await this.getDefaultModel('video');
        }

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/us-central1/publishers/google/models/${model.modelId}:fetchPredictOperation?key=${apiKey}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Lỗi kiểm tra trạng thái video');
        }

        if (data.done) {
            if (data.error) {
                throw new Error(data.error.message || 'Tạo video thất bại');
            }

            const videos = data.response?.videos || data.response?.generatedVideos || [];
            const firstVideo = videos[0];
            const videoData = firstVideo?.bytesBase64Encoded || firstVideo?.video?.bytesBase64Encoded;
            const mimeType = firstVideo?.mimeType || firstVideo?.video?.mimeType || 'video/mp4';

            if (!videoData) {
                throw new Error('Dữ liệu video rỗng');
            }

            // Lưu video vào file
            const fileName = `vid_${uuidv4()}.mp4`;
            const filePath = path.join('uploads', 'videos', fileName);
            const absolutePath = path.join(__dirname, '..', '..', 'public', filePath);

            const buffer = Buffer.from(videoData, 'base64');
            fs.writeFileSync(absolutePath, buffer);

            return {
                done: true,
                videoUrl: '/' + filePath,
                mimeType,
                fileName,
                fileSize: buffer.length
            };
        }

        return { done: false };
    }

    // ==========================================
    // TEXT-TO-SPEECH (TTS)
    // ==========================================

    /**
     * Chuyển text thành giọng nói
     */
    async generateTTS({ text, voiceName = 'Kore', modelId, user }) {
        const startTime = Date.now();
        const apiKeyInfo = await apiKeyManager.getNextKey();

        let model;
        if (modelId) {
            model = await ModelConfig.findOne({ modelId, isActive: true });
        }
        if (!model) {
            model = await this.getDefaultModel('tts');
        }
        if (!model) {
            throw new Error('Không có model TTS nào được cấu hình');
        }

        const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model.modelId}:generateContent?key=${apiKeyInfo.key}`;

        const voiceMap = {
            alloy: 'Kore',
            echo: 'Fenrir',
            fable: 'Aoede',
            onyx: 'Charon',
            nova: 'Aoede',
            shimmer: 'Kore'
        };
        const targetVoice = voiceMap[voiceName?.toLowerCase()] || voiceName || model.parameters?.voiceName || 'Kore';

        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text }]
            }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: targetVoice
                        }
                    }
                }
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(90000)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || `API Error (${response.status})`);
            }

            const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p && p.inlineData)?.inlineData;
            if (!audioPart || !audioPart.data) {
                throw new Error('AI không trả về dữ liệu âm thanh');
            }

            // Lưu audio vào file
            const rawMime = audioPart.mimeType || 'audio/mp3';
            const isPCM = rawMime.toLowerCase().includes('l16') || rawMime.toLowerCase().includes('pcm') || rawMime.toLowerCase().includes('wav');
            const ext = isPCM ? 'wav' : 'mp3';
            const mimeType = isPCM ? 'audio/wav' : rawMime;

            const fileName = `audio_${uuidv4()}.${ext}`;
            const filePath = path.join('uploads', 'audios', fileName);
            const absolutePath = path.join(__dirname, '..', '..', 'public', filePath);

            let buffer = Buffer.from(audioPart.data, 'base64');
            if (isPCM) {
                // Add 44-byte WAV header for PCM 24kHz 16bit mono
                const header = Buffer.alloc(44);
                const dataSize = buffer.length;
                header.write('RIFF', 0);
                header.writeUInt32LE(36 + dataSize, 4);
                header.write('WAVE', 8);
                header.write('fmt ', 12);
                header.writeUInt32LE(16, 16);
                header.writeUInt16LE(1, 20);
                header.writeUInt16LE(1, 22);
                header.writeUInt32LE(24000, 24);
                header.writeUInt32LE(48000, 28);
                header.writeUInt16LE(2, 32);
                header.writeUInt16LE(16, 34);
                header.write('data', 36);
                header.writeUInt32LE(dataSize, 40);
                buffer = Buffer.concat([header, buffer]);
            }

            fs.writeFileSync(absolutePath, buffer);

            const fileSize = buffer.length;
            const usage = tokenCounter.parseUsageMetadata(data);
            const responseTime = Date.now() - startTime;

            // Lưu media vào DB
            if (user) {
                await Media.create({
                    userId: user._id || user.id,
                    type: 'audio',
                    filePath: '/' + filePath,
                    fileName,
                    originalName: fileName,
                    fileSize,
                    mimeType,
                    prompt: text?.substring(0, 500),
                    modelUsed: model.modelId
                });

                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model.modelId,
                    category: 'tts',
                    prompt: text?.substring(0, 1000),
                    responseContent: '/' + filePath,
                    tokenInput: usage.tokenInput,
                    tokenOutput: usage.tokenOutput,
                    apiKeyName: apiKeyInfo.name,
                    responseTime,
                    status: 'success'
                });
            }

            return {
                audioUrl: '/' + filePath,
                mimeType,
                modelUsed: model.modelId,
                ...usage,
                responseTime
            };

        } catch (error) {
            if (user) {
                tokenCounter.logUsage({
                    userId: user._id || user.id,
                    username: user.username,
                    modelUsed: model?.modelId || 'unknown',
                    category: 'tts',
                    prompt: text?.substring(0, 500),
                    apiKeyName: apiKeyInfo.name,
                    responseTime: Date.now() - startTime,
                    status: 'error',
                    errorMessage: error.message
                });
            }
            throw error;
        }
    }
}

module.exports = new AgentPlatformService();
