/* ====== User API Keys Management ====== */

// Set base URL
document.addEventListener('DOMContentLoaded', () => {
    const base = window.location.origin;
    const baseUrlEl = document.getElementById('baseUrl');
    const baseUrlExampleEl = document.getElementById('baseUrlExample');
    if (baseUrlEl) baseUrlEl.textContent = base;
    if (baseUrlExampleEl) baseUrlExampleEl.textContent = base;

    if (isLoggedIn()) {
        loadKeys();
    } else {
        showAuthModal();
    }
});

// Load danh sách key
async function loadKeys() {
    const list = document.getElementById('keyList');
    const loading = document.getElementById('keyLoading');
    const empty = document.getElementById('keyEmpty');

    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';

    try {
        const res = await apiFetch('/api/user/api-keys');
        if (!res) return;
        const data = await res.json();

        if (loading) loading.style.display = 'none';

        if (!data.success || data.data.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        list.innerHTML = data.data.map(k => `
            <div class="api-key-card" data-id="${k._id}">
                <div class="api-key-info">
                    <div class="api-key-name">${escapeHtml(k.name)}</div>
                    <div class="api-key-value"><code>${maskKey(k.key)}</code></div>
                    <div class="api-key-meta">
                        <span><i class="fas fa-chart-bar"></i> ${k.usageCount || 0} lượt gọi</span>
                        <span><i class="fas fa-clock"></i> ${k.lastUsedAt ? timeAgo(k.lastUsedAt) : 'Chưa sử dụng'}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(k.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
                <div class="api-key-actions">
                    <button class="api-key-copy" onclick="copyToClipboard('${k.key}')" title="Sao chép">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="api-key-delete" onclick="deleteKey('${k._id}')" title="Xoá">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        if (loading) loading.style.display = 'none';
        list.innerHTML = '<p style="text-align:center;color:var(--error);padding:20px;">Lỗi tải danh sách API key</p>';
    }
}

// Tạo key mới
document.getElementById('createKeyBtn')?.addEventListener('click', async () => {
    if (!requireAuth()) return;

    const name = await showPromptDialog('Tạo API key', 'Nhập tên cho API key (ví dụ: My App):', '');
    if (!name || !name.trim()) return;

    try {
        const res = await apiFetch('/api/user/api-keys', {
            method: 'POST',
            body: JSON.stringify({ name: name.trim() })
        });
        if (!res) return;
        const data = await res.json();

        if (data.success) {
            // Show key đầy đủ — chỉ 1 lần
            showKeyCreatedModal(data.data.key);
            loadKeys();
        } else {
            showToast(data.message || 'Lỗi tạo API key', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
    }
});

// Show modal key vừa tạo
function showKeyCreatedModal(fullKey) {
    // Tạo modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:520px;">
            <div class="modal-header">
                <h3><i class="fas fa-check-circle" style="color:var(--success);margin-right:8px;"></i>API key đã tạo</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="font-size:.85rem;color:var(--brown3);margin-bottom:16px;">
                    <strong style="color:var(--error);">Lưu ý:</strong> Key này chỉ hiện <strong>một lần duy nhất</strong>. Hãy sao chép và lưu lại ngay.
                </p>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" value="${fullKey}" readonly id="newKeyInput"
                        style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:.82rem;background:var(--bg2);color:var(--brown);">
                    <button onclick="copyNewKey()" style="padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Copy key
function copyNewKey() {
    const input = document.getElementById('newKeyInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            showToast('Đã sao chép API key', 'success');
        });
    }
}

// Xoá key
async function deleteKey(id) {
    const ok = await showConfirm('Xoá API key', 'API key sẽ bị vô hiệu hoá ngay lập tức. Bạn có chắc?');
    if (!ok) return;

    try {
        const res = await apiFetch('/api/user/api-keys/' + id, { method: 'DELETE' });
        if (!res) return;
        const data = await res.json();
        if (data.success) {
            showToast('Đã xoá API key', 'success');
            loadKeys();
        } else {
            showToast(data.message || 'Lỗi xoá', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
    }
}

// Helpers
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' phút trước';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' giờ trước';
    return Math.floor(seconds / 86400) + ' ngày trước';
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Đã sao chép API key', 'success');
        }).catch(err => {
            showToast('Không thể sao chép API key', 'error');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Đã sao chép API key', 'success');
        } catch (err) {
            showToast('Không thể sao chép API key', 'error');
        }
        document.body.removeChild(textarea);
    }
}

function maskKey(key) {
    if (!key) return '';
    if (key.startsWith('kira_sk_••••••••')) return key;
    return 'kira_sk_••••••••' + key.slice(-4);
}
