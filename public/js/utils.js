/* ====== Utils ====== */
const TOKEN_KEY = 'kiraap_token';
const USER_KEY = 'kiraap_user';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function removeToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
function isLoggedIn() { return !!getToken() && !!getUser(); }

// API helper
async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        removeToken();
        updateUIForAuthState();
        showAuthModal();
        return null;
    }
    return res;
}

/**
 * Kiểm tra auth trước khi thực hiện action.
 * Trả true nếu đã login, false + hiện popup nếu chưa.
 */
function requireAuth() {
    if (isLoggedIn()) return true;
    showAuthModal();
    return false;
}

// Auth Modal
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset về form login
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

// Cập nhật UI theo trạng thái auth (guest / logged in)
function updateUIForAuthState() {
    const user = getUser();
    const logged = isLoggedIn();

    const loginBtn = document.getElementById('loginSidebarBtn');
    const userFooter = document.getElementById('userFooter');
    const adminMenu = document.getElementById('menuAdmin');

    if (loginBtn) loginBtn.style.display = logged ? 'none' : 'flex';
    if (userFooter) userFooter.style.display = logged ? 'flex' : 'none';
    if (adminMenu) adminMenu.style.display = (logged && user?.role === 'admin') ? 'flex' : 'none';

    if (logged && user) {
        document.getElementById('userDisplayName').textContent = user.displayName || user.username;
    }
}

// Toast
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span>' + message + '</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
}

// Toggle password visibility
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye-slash';
    }
}

// Simple Markdown parser
function parseMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>');
    html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<pre')) {
        html = '<p>' + html + '</p>';
    }
    return html;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Custom Confirm Dialog (thay thế confirm() native)
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '99999';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:380px;">
                <div class="modal-header">
                    <h3>${title || 'Xác nhận'}</h3>
                    <button class="modal-close confirm-cancel">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:var(--brown2, #B8A08C);font-size:.92rem;">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary confirm-cancel">Huỷ</button>
                    <button class="btn btn-primary confirm-ok">Đồng ý</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.opacity = '1');
        overlay.querySelectorAll('.confirm-ok').forEach(btn => {
            btn.addEventListener('click', () => { overlay.remove(); resolve(true); });
        });
        overlay.querySelectorAll('.confirm-cancel').forEach(btn => {
            btn.addEventListener('click', () => { overlay.remove(); resolve(false); });
        });
    });
}

// Custom Prompt Dialog (thay thế prompt() native)
function showPromptDialog(title, message, defaultValue) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '99999';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:400px;">
                <div class="modal-header">
                    <h3>${title || 'Nhập thông tin'}</h3>
                    <button class="modal-close prompt-cancel">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:var(--brown2, #B8A08C);font-size:.92rem;margin-bottom:12px;">${message || ''}</p>
                    <input type="text" class="prompt-input" value="${defaultValue || ''}" style="width:100%;padding:10px 14px;background:var(--bg, #FAF6F1);border:1px solid var(--border, #E8DDD0);border-radius:8px;color:var(--brown, #4A2C2A);font-size:.9rem;font-family:'Be Vietnam Pro',sans-serif;outline:none;">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary prompt-cancel">Huỷ</button>
                    <button class="btn btn-primary prompt-ok">Xác nhận</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.prompt-input');
        requestAnimationFrame(() => { overlay.style.opacity = '1'; input.focus(); input.select(); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { overlay.remove(); resolve(input.value.trim() || null); }
            if (e.key === 'Escape') { overlay.remove(); resolve(null); }
        });
        overlay.querySelectorAll('.prompt-ok').forEach(btn => {
            btn.addEventListener('click', () => { overlay.remove(); resolve(input.value.trim() || null); });
        });
        overlay.querySelectorAll('.prompt-cancel').forEach(btn => {
            btn.addEventListener('click', () => { overlay.remove(); resolve(null); });
        });
    });
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy to Clipboard
function copyToClipboard(text) {
    if (!text) return;
    const fullUrl = text.startsWith('http') ? text : window.location.origin + text;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('Đã sao chép đường dẫn', 'success');
    }).catch(() => {
        showToast('Không thể sao chép đường dẫn', 'error');
    });
}
