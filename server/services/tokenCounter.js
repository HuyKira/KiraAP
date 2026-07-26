const AILog = require('../models/AILog');

/**
 * Token Counter – Ước tính & ghi log token usage
 */
class TokenCounter {
    /**
     * Ước tính số token đầu vào (rough estimate)
     * ~4 chars = 1 token (xấp xỉ cho tiếng Anh, tiếng Việt có thể khác)
     */
    estimateInputTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Parse usageMetadata từ response API Google
     */
    parseUsageMetadata(responseData) {
        const usage = responseData?.usageMetadata;
        if (!usage) {
            return {
                tokenInput: 0,
                tokenOutput: 0,
                tokenTotal: 0
            };
        }

        return {
            tokenInput: usage.promptTokenCount || 0,
            tokenOutput: usage.candidatesTokenCount || 0,
            tokenTotal: usage.totalTokenCount || 0
        };
    }

    /**
     * Ghi log AI usage vào database
     */
    async logUsage({ userId, username, modelUsed, category, prompt, responseContent, tokenInput, tokenOutput, apiKeyName, responseTime, status, errorMessage }) {
        try {
            const tokenTotal = (tokenInput || 0) + (tokenOutput || 0);

            await AILog.create({
                userId,
                username: username || '',
                modelUsed: modelUsed || '',
                category: category || 'text',
                prompt: prompt ? prompt.substring(0, 1000) : '',
                responseContent: responseContent ? responseContent.substring(0, 2000) : '',
                tokenInput: tokenInput || 0,
                tokenOutput: tokenOutput || 0,
                tokenTotal,
                apiKeyName: apiKeyName || '',
                responseTime: responseTime || 0,
                status: status || 'success',
                errorMessage: errorMessage || ''
            });
        } catch (error) {
            console.error('Lỗi ghi AI log:', error);
        }
    }
}

module.exports = new TokenCounter();
