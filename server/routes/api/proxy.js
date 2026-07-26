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
        const models = await ModelConfig.find({ isActive: true }).lean();
        const data = models.map(m => ({
            id: m.modelId,
            object: 'model',
            created: Math.floor(new Date(m.createdAt).getTime() / 1000),
            owned_by: 'kira-agent-platform'
        }));
        res.json({ object: 'list', data });
    } catch (error) {
        res.status(500).json({ error: { message: error.message, type: 'server_error' } });
    }
});

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
        let lastUserPrompt = '';

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt = msg.content;
            } else if (msg.role === 'user') {
                lastUserPrompt = msg.content;
                history.push({ role: 'user', parts: [{ text: msg.content }] });
            } else if (msg.role === 'assistant') {
                history.push({ role: 'model', parts: [{ text: msg.content }] });
            }
        }

        // Lấy prompt cuối từ history
        const prompt = lastUserPrompt;
        const geminiHistory = history.slice(0, -1); // Bỏ message cuối (sẽ là prompt)

        if (stream) {
            // === Streaming (SSE) ===
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

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

                const reader = apiResponse.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr) continue;

                        try {
                            const parsed = JSON.parse(jsonStr);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (text) {
                                const chunk = {
                                    id: chatId,
                                    object: 'chat.completion.chunk',
                                    created,
                                    model: model || 'gemini-2.5-flash',
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

                // Final chunk
                const finalChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created,
                    model: model || 'gemini-2.5-flash',
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                };
                res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            } catch (error) {
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
                model: result.modelUsed || model || 'gemini-2.5-flash',
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
        if (result.audioPath) {
            const fs = require('fs');
            const audioPath = require('path').join(__dirname, '..', '..', '..', 'public', result.audioPath);
            if (fs.existsSync(audioPath)) {
                res.setHeader('Content-Type', 'audio/wav');
                return fs.createReadStream(audioPath).pipe(res);
            }
        }

        res.json({
            url: result.audioPath ? `${req.protocol}://${req.get('host')}${result.audioPath}` : null
        });
    } catch (error) {
        res.status(500).json({
            error: { message: error.message, type: 'server_error' }
        });
    }
});

module.exports = router;
