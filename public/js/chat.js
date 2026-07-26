/* ====== Chat ====== */
let chatFiles = [];
let isStreaming = false;

// File attach
document.getElementById('chatAttachBtn')?.addEventListener('click', () => {
    document.getElementById('chatFileInput').click();
});

document.getElementById('chatFileInput')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (chatFiles.length >= 5) return showToast('Tối đa 5 file', 'error');
        chatFiles.push(file);
    });
    renderChatFilePreview();
    e.target.value = '';
});

function renderChatFilePreview() {
    const preview = document.getElementById('chatFilePreview');
    if (chatFiles.length === 0) { preview.style.display = 'none'; return; }
    preview.style.display = 'flex';
    preview.innerHTML = chatFiles.map((f, i) => {
        const isImg = f.type.startsWith('image/');
        const thumb = isImg ? `<img src="${URL.createObjectURL(f)}" alt="">` : `<i class="fas fa-file"></i>`;
        return `<div class="file-preview-item">${thumb} <span>${f.name}</span><button class="file-preview-remove" onclick="removeChatFile(${i})">&times;</button></div>`;
    }).join('');
}

function removeChatFile(index) {
    chatFiles.splice(index, 1);
    renderChatFilePreview();
}

// Auto-resize textarea
const chatInput = document.getElementById('chatInput');
chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

// Send with Enter
chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);

async function sendChatMessage() {
    if (!requireAuth()) return;
    if (isStreaming) return;
    const prompt = chatInput.value.trim();
    if (!prompt && chatFiles.length === 0) return;

    isStreaming = true;
    const sendBtn = document.getElementById('chatSendBtn');
    sendBtn.disabled = true;

    const container = document.getElementById('chatMessages');
    // Remove welcome
    const welcome = container.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Add user message
    let attachHTML = '';
    chatFiles.forEach(f => {
        if (f.type.startsWith('image/')) {
            attachHTML += `<div class="message-attachment"><img src="${URL.createObjectURL(f)}" alt=""></div>`;
        } else {
            attachHTML += `<div class="message-attachment" style="padding:6px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-size:.82rem;"><i class="fas fa-file"></i> ${f.name}</div>`;
        }
    });
    if (attachHTML) attachHTML = `<div class="message-attachments">${attachHTML}</div>`;

    container.innerHTML += `<div class="message message-user">
        <div class="message-avatar"><i class="fas fa-user"></i></div>
        <div class="message-bubble">${prompt}${attachHTML}</div>
    </div>`;

    // Add AI typing
    const aiMsgId = 'ai-' + Date.now();
    container.innerHTML += `<div class="message message-assistant" id="${aiMsgId}">
        <div class="message-avatar"><i class="fas fa-bolt"></i></div>
        <div class="message-bubble">
            <div class="thinking-box" style="display:flex;align-items:center;gap:8px;padding:4px 0;color:var(--brown2);font-size:0.88rem;">
                <i class="fas fa-circle-notch fa-spin" style="color:var(--accent);font-size:1rem;"></i>
                <span>Đang suy nghĩ...</span>
            </div>
        </div>
    </div>`;
    container.scrollTop = container.scrollHeight;

    // Build FormData
    const formData = new FormData();
    formData.append('prompt', prompt);
    const selectedModel = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    if (selectedModel) formData.append('modelId', selectedModel);
    if (currentConversationId) formData.append('conversationId', currentConversationId);
    chatFiles.forEach(f => formData.append('files', f));

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatFiles = [];
    renderChatFilePreview();

    // Stream SSE via fetch
    try {
        const token = getToken();
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let hasReceivedText = false;
        const aiBubble = document.querySelector(`#${aiMsgId} .message-bubble`);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;
                    try {
                        const chunk = JSON.parse(jsonStr);
                        if (chunk.type === 'meta' && chunk.conversationId) {
                            currentConversationId = chunk.conversationId;
                        } else if (chunk.type === 'text') {
                            if (!hasReceivedText) {
                                aiBubble.innerHTML = '';
                                hasReceivedText = true;
                            }
                            fullText += chunk.content;
                            aiBubble.innerHTML = parseMarkdown(fullText);
                            container.scrollTop = container.scrollHeight;
                        } else if (chunk.type === 'error') {
                            aiBubble.innerHTML = '<span style="color:var(--error);">Lỗi: ' + chunk.message + '</span>';
                        } else if (chunk.type === 'done') {
                            // Stream complete
                        }
                    } catch (e) { /* skip */ }
                }
            }
        }

        // Reload history
        loadHistory('chat');

    } catch (error) {
        const aiBubble = document.querySelector(`#${aiMsgId} .message-bubble`);
        if (aiBubble) aiBubble.innerHTML = '<span style="color:var(--error);">Lỗi kết nối. Vui lòng thử lại.</span>';
    }

    isStreaming = false;
    sendBtn.disabled = false;
}

// ====== Load Conversation Messages ======
async function loadConversation(convId) {
    if (!convId) return;
    currentConversationId = convId;

    const container = document.getElementById('chatMessages');
    if (!container) return;

    container.innerHTML = '<div class="gen-loading"><div class="spinner"></div> Đang tải cuộc trò chuyện...</div>';

    try {
        const res = await apiFetch(`/api/conversations/${convId}/messages`);
        if (!res) return;
        const data = await res.json();

        if (!data.success || !data.data.messages) {
            showToast('Không thể tải cuộc trò chuyện', 'error');
            return;
        }

        const messages = data.data.messages;
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments"></i>
                    <h3>Cuộc trò chuyện mới</h3>
                    <p>Hãy gửi tin nhắn đầu tiên để bắt đầu!</p>
                </div>`;
            return;
        }

        let html = '';
        messages.forEach(msg => {
            if (msg.role === 'user') {
                let attachHTML = '';
                if (msg.mediaUrl) {
                    if (msg.mediaType === 'image' || msg.mediaUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
                        attachHTML = `<div class="message-attachments"><div class="message-attachment"><img src="${msg.mediaUrl}" alt=""></div></div>`;
                    } else {
                        attachHTML = `<div class="message-attachments"><div class="message-attachment" style="padding:6px 10px;background:rgba(255,255,255,0.15);border-radius:6px;font-size:.82rem;"><i class="fas fa-file"></i> Tệp đính kèm</div></div>`;
                    }
                }
                html += `<div class="message message-user">
                    <div class="message-avatar"><i class="fas fa-user"></i></div>
                    <div class="message-bubble">${escapeHtml(msg.content || '')}${attachHTML}</div>
                </div>`;
            } else {
                let mediaHTML = '';
                if (msg.mediaUrl) {
                    if (msg.mediaType === 'image' || msg.mediaUrl.match(/\.(png|jpg|jpeg|webp)$/i)) {
                        mediaHTML = `<div style="margin-top:8px;"><img src="${msg.mediaUrl}" alt="" style="max-width:100%;max-height:300px;border-radius:8px;cursor:pointer;" onclick="window.open('${msg.mediaUrl}', '_blank')"></div>`;
                    } else if (msg.mediaType === 'video' || msg.mediaUrl.match(/\.(mp4|webm)$/i)) {
                        mediaHTML = `<div style="margin-top:8px;"><video src="${msg.mediaUrl}" controls style="max-width:100%;border-radius:8px;"></video></div>`;
                    } else if (msg.mediaType === 'audio' || msg.mediaUrl.match(/\.(mp3|wav|ogg)$/i)) {
                        mediaHTML = `<div style="margin-top:8px;"><audio src="${msg.mediaUrl}" controls style="width:100%;"></audio></div>`;
                    }
                }
                const contentHTML = msg.content ? parseMarkdown(msg.content) : '';
                html += `<div class="message message-assistant">
                    <div class="message-avatar"><i class="fas fa-bolt"></i></div>
                    <div class="message-bubble">${contentHTML}${mediaHTML}</div>
                </div>`;
            }
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;

        // Highlight active item in sidebar
        document.querySelectorAll('#historyList .history-item').forEach(item => {
            if (item.dataset.id === convId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

    } catch (err) {
        console.error('Load conversation error:', err);
        showToast('Lỗi tải cuộc trò chuyện', 'error');
    }
}

// New chat button reset
document.getElementById('newChatBtn')?.addEventListener('click', (e) => {
    if (window.location.pathname === '/' || window.location.pathname === '/chat') {
        e.preventDefault();
        currentConversationId = null;
        const container = document.getElementById('chatMessages');
        if (container) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments"></i>
                    <h3>Bắt đầu trò chuyện</h3>
                    <p>Tôi có thể giúp gì cho bạn hôm nay?</p>
                </div>`;
        }
        document.querySelectorAll('#historyList .history-item').forEach(i => i.classList.remove('active'));
        if (window.history.pushState) {
            window.history.pushState({}, '', window.location.pathname);
        }
    }
});

// Auto load conversation if URL query string contains ?conv=
function checkURLForConversation() {
    const urlParams = new URLSearchParams(window.location.search);
    const convParam = urlParams.get('conv');
    if (convParam) {
        loadConversation(convParam);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkURLForConversation);
} else {
    checkURLForConversation();
}
