const express = require('express');
const router = express.Router();
const proxyAuth = require('../../middleware/proxyAuth');
const agentPlatform = require('../../services/agentPlatform');
const ModelConfig = require('../../models/ModelConfig');
const { v4: uuidv4 } = require('uuid');

// Tất cả proxy routes yêu cầu API key
router.use(proxyAuth);

// ==========================================
// GET /v1/models — Danh sách models
// ==========================================
router.get('/models', async (req, res) => {
    try {
        const query = { isActive: true };
        if (req.query.category) {
            query.category = req.query.category;
        }
        const models = await ModelConfig.find(query)
            .sort({ isDefault: -1, displayName: 1 })
            .lean();
        const data = models.map(m => ({
            id: m.modelId,
            object: 'model',
            created: Math.floor(new Date(m.createdAt).getTime() / 1000),
            owned_by: 'kira-agent-platform',
            category: m.category,
            display_name: m.displayName,
            is_default: m.isDefault || false
        }));
        res.json({ object: 'list', data });
    } catch (error) {
        res.status(500).json({ error: { message: error.message, type: 'server_error' } });
    }
});

// ==========================================
// GET /v1/user/profile — Thông tin user
// ==========================================
router.get('/user/profile', async (req, res) => {
    try {
        res.json({
            object: 'user',
            data: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                display_name: req.user.displayName,
                role: req.user.role,
                created_at: req.user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message, type: 'server_error' } });
    }
});

// ==========================================
// GET /v1/user/api-keys — Danh sách API key
// ==========================================
router.get('/user/api-keys', async (req, res) => {
    try {
        const UserApiKey = require('../../models/UserApiKey');
        const keys = await UserApiKey.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const data = keys.map(k => ({
            id: k._id,
            name: k.name,
            key: 'kira_sk_••••••••' + k.key.slice(-4),
            is_active: k.isActive,
            usage_count: k.usageCount || 0,
            last_used_at: k.lastUsedAt || null,
            created_at: k.createdAt
        }));

        res.json({ object: 'list', data });
    } catch (error) {
        res.status(500).json({ error: { message: error.message, type: 'server_error' } });
    }
});
function extractMessageText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map(part => {
                if (typeof part === 'string') return part;
                if (part && typeof part === 'object') {
                    if (part.type === 'text' && typeof part.text === 'string') return part.text;
                    if (typeof part.text === 'string') return part.text;
                }
                return '';
            })
            .filter(Boolean)
            .join('\n');
    }
    if (typeof content === 'object' && typeof content.text === 'string') {
        return content.text;
    }
    return String(content);
}

// ==========================================
// POST /v1/chat/completions — Chat
// ==========================================
router.post('/chat/completions', async (req, res) => {
    try {
        const { model, messages, stream, temperature, max_tokens } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: { message: 'messages là bắt buộc', type: 'invalid_request_error' }
            });
        }

        // Convert OpenAI messages → Gemini format
        let systemPrompt = '';
        const history = [];

        for (const msg of messages) {
            const textContent = extractMessageText(msg.content);
            const role = msg.role;

            if (role === 'system' || role === 'developer') {
                systemPrompt = systemPrompt ? `${systemPrompt}\n${textContent}` : textContent;
            } else if (role === 'user') {
                history.push({ role: 'user', parts: [{ text: textContent }] });
            } else if (role === 'assistant' || role === 'model') {
                history.push({ role: 'model', parts: [{ text: textContent }] });
            }
        }

        if (history.length === 0) {
            return res.status(400).json({
                error: { message: 'Cần có ít nhất 1 message từ user', type: 'invalid_request_error' }
            });
        }

        // Tìm prompt cuối cùng từ user
        let prompt = '';
        let lastUserIndex = -1;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'user') {
                prompt = history[i].parts[0]?.text || '';
                lastUserIndex = i;
                break;
            }
        }

        // Gemini history là tất cả messages trước prompt cuối
        const geminiHistory = lastUserIndex >= 0 ? history.slice(0, lastUserIndex) : history.slice(0, -1);

        if (stream) {
            // === Streaming (SSE) ===
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            const chatId = 'chatcmpl-' + uuidv4().replace(/-/g, '').substring(0, 29);
            const created = Math.floor(Date.now() / 1000);

            try {
                const apiResponse = await agentPlatform.generateTextStream({
                    prompt,
                    history: geminiHistory,
                    modelId: model,
                    systemPrompt,
                    user: req.user
                });

                const modelUsed = apiResponse.modelUsed || model || 'gemini-3.6-flash';

                // Gửi chunk khởi tạo ban đầu với role assistant (Chuẩn OpenAI SSE cho VS Code / Continue)
                const initialChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created,
                    model: modelUsed,
                    choices: [{
                        index: 0,
                        delta: { role: 'assistant', content: '' },
                        finish_reason: null
                    }]
                };
                res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

                const streamObj = apiResponse.stream;
                const reader = streamObj && streamObj.getReader ? streamObj.getReader() : null;
                let buffer = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += new TextDecoder().decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const jsonStr = line.slice(6).trim();
                            if (!jsonStr || jsonStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                if (text) {
                                    const chunk = {
                                        id: chatId,
                                        object: 'chat.completion.chunk',
                                        created,
                                        model: modelUsed,
                                        choices: [{
                                            index: 0,
                                            delta: { content: text },
                                            finish_reason: null
                                        }]
                                    };
                                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                                }
                            } catch (e) { /* skip invalid JSON */ }
                        }
                    }
                } else if (streamObj && typeof streamObj.on === 'function') {
                    for await (const chunk of streamObj) {
                        buffer += chunk.toString('utf8');
                        const lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const jsonStr = line.slice(6).trim();
                            if (!jsonStr || jsonStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                if (text) {
                                    const chunkObj = {
                                        id: chatId,
                                        object: 'chat.completion.chunk',
                                        created,
                                        model: modelUsed,
                                        choices: [{
                                            index: 0,
                                            delta: { content: text },
                                            finish_reason: null
                                        }]
                                    };
                                    res.write(`data: ${JSON.stringify(chunkObj)}\n\n`);
                                }
                            } catch (e) { /* skip invalid JSON */ }
                        }
                    }
                }

                // Final chunk
                const finalChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created,
                    model: modelUsed,
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                };
                res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            } catch (error) {
                console.error('Proxy stream error:', error);
                res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
                res.end();
            }
        } else {
            // === Non-streaming ===
            const result = await agentPlatform.generateText({
                prompt,
                history: geminiHistory,
                modelId: model,
                systemPrompt,
                user: req.user
            });

            res.json({
                id: 'chatcmpl-' + uuidv4().replace(/-/g, '').substring(0, 29),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: result.modelUsed || model || 'gemini-3.6-flash',
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: result.text },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: result.tokenInput || 0,
                    completion_tokens: result.tokenOutput || 0,
                    total_tokens: (result.tokenInput || 0) + (result.tokenOutput || 0)
                }
            });
        }
    } catch (error) {
        console.error('Proxy non-stream error:', error);
        res.status(500).json({
            error: { message: error.message, type: 'server_error' }
        });
    }
});

// ==========================================
// POST /v1/images/generations — Tạo ảnh
// ==========================================
router.post('/images/generations', async (req, res) => {
    try {
        const { prompt, size } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: { message: 'prompt là bắt buộc', type: 'invalid_request_error' }
            });
        }

        // Parse size → aspect ratio
        let aspectRatio = '1:1';
        if (size === '1792x1024' || size === '16:9') aspectRatio = '16:9';
        else if (size === '1024x1792' || size === '9:16') aspectRatio = '9:16';
        else if (size === '4:3') aspectRatio = '4:3';

        const result = await agentPlatform.generateImage({
            prompt,
            aspectRatio,
            user: req.user
        });

        const data = result.images.map((img, i) => ({
            url: img.url ? `${req.protocol}://${req.get('host')}${img.url}` : undefined,
            b64_json: img.base64 || undefined,
            revised_prompt: prompt
        }));

        res.json({ created: Math.floor(Date.now() / 1000), data });
    } catch (error) {
        res.status(500).json({
            error: { message: error.message, type: 'server_error' }
        });
    }
});

// ==========================================
// POST /v1/audio/speech — TTS
// ==========================================
router.post('/audio/speech', async (req, res) => {
    try {
        const { input, voice } = req.body;

        if (!input) {
            return res.status(400).json({
                error: { message: 'input là bắt buộc', type: 'invalid_request_error' }
            });
        }

        const result = await agentPlatform.generateTTS({
            text: input,
            voiceName: voice || 'Kore',
            user: req.user
        });

        // Trả audio file
        const relativeUrl = result.audioUrl || result.audioPath;
        if (relativeUrl) {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(__dirname, '..', '..', '..', 'public', relativeUrl.replace(/^\//, ''));
            if (fs.existsSync(fullPath)) {
                res.setHeader('Content-Type', result.mimeType || 'audio/wav');
                return fs.createReadStream(fullPath).pipe(res);
            }
        }

        res.json({
            url: relativeUrl ? `${req.protocol}://${req.get('host')}${relativeUrl}` : null
        });
    } catch (error) {
        res.status(500).json({
            error: { message: error.message, type: 'server_error' }
        });
    }
});

module.exports = router;
