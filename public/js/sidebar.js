/* ====== Sidebar (Multi-page SSR) ====== */
let currentConversationId = null;

// Hamburger (mobile)
document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('show');
    document.getElementById('sidebarOverlay').classList.add('show');
});

document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// Load conversation history
async function loadHistory(category) {
    const list = document.getElementById('historyList');
    if (!list) return;

    // Guest → không tải history
    if (!isLoggedIn()) {
        list.innerHTML = '<p style="text-align:center;color:var(--brown3);font-size:.82rem;padding:16px;">Đăng nhập để xem lịch sử</p>';
        return;
    }

    list.innerHTML = '<div class="gen-loading"><div class="spinner"></div></div>';

    try {
        const catMap = { chat: 'chat', image: 'image', video: 'video', tts: 'tts' };
        const res = await apiFetch('/api/conversations?category=' + (catMap[category] || category) + '&limit=30');
        if (!res) return;
        const data = await res.json();

        if (!data.success || data.data.conversations.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--brown3);font-size:.82rem;padding:16px;">Chưa có lịch sử</p>';
            return;
        }

        // Group by date
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let html = '';
        let lastGroup = '';

        data.data.conversations.forEach(conv => {
            const d = new Date(conv.lastMessageAt || conv.createdAt).toDateString();
            let group = d === today ? 'Hôm nay' : d === yesterday ? 'Hôm qua' : new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString('vi-VN');
            if (group !== lastGroup) {
                html += '<div class="history-date">' + group + '</div>';
                lastGroup = group;
            }
            const active = conv._id === currentConversationId ? ' active' : '';
            html += `<div class="history-item${active}" data-id="${conv._id}">
                <span class="history-item-title">${conv.title || 'Cuộc trò chuyện'}</span>
                <div class="history-item-actions">
                    <button class="history-more-btn" title="Tuỳ chọn" onclick="event.stopPropagation();toggleHistoryDropdown(this)"><i class="fas fa-ellipsis-v"></i></button>
                    <div class="history-item-dropdown">
                        <button onclick="renameConversation('${conv._id}')"><i class="fas fa-pen"></i> Đổi tên</button>
                        <button class="danger" onclick="deleteConversation('${conv._id}')"><i class="fas fa-trash"></i> Xoá</button>
                    </div>
                </div>
            </div>`;
        });

        list.innerHTML = html;

        // Click to load conversation
        list.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const convId = item.dataset.id;
                // Navigate to chat page with conversation
                if (window.location.pathname !== '/' && window.location.pathname !== '/chat') {
                    window.location.href = '/?conv=' + convId;
                } else {
                    currentConversationId = convId;
                    list.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    loadConversation(convId);
                    closeSidebar();
                }
            });
        });
    } catch (err) {
        list.innerHTML = '<p style="text-align:center;color:var(--brown3);font-size:.82rem;padding:16px;">Lỗi tải lịch sử</p>';
    }
}

// Toggle dropdown
function toggleHistoryDropdown(btn) {
    const dropdown = btn.nextElementSibling;
    document.querySelectorAll('.history-item-dropdown.show').forEach(d => { if (d !== dropdown) d.classList.remove('show'); });
    dropdown.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
    document.querySelectorAll('.history-item-dropdown.show').forEach(d => d.classList.remove('show'));
});

// Delete conversation
async function deleteConversation(id) {
    const ok = await showConfirm('Xoá cuộc trò chuyện', 'Bạn có chắc muốn xoá cuộc trò chuyện này?');
    if (!ok) return;

    try {
        const res = await apiFetch('/api/conversations/' + id, { method: 'DELETE' });
        if (res) {
            const data = await res.json();
            if (data.success) {
                showToast('Đã xoá', 'success');
                if (currentConversationId === id) {
                    currentConversationId = null;
                    if (typeof resetChatUI === 'function') resetChatUI();
                }
                // Detect current page for history category
                const page = detectCurrentPage();
                loadHistory(page);
            }
        }
    } catch (err) {
        showToast('Lỗi xoá cuộc trò chuyện', 'error');
    }
}

// Rename conversation
async function renameConversation(id) {
    const newTitle = await showPromptDialog('Đổi tên', 'Nhập tên mới cho cuộc trò chuyện:', '');
    if (!newTitle) return;

    try {
        const res = await apiFetch('/api/conversations/' + id, {
            method: 'PUT',
            body: JSON.stringify({ title: newTitle })
        });
        if (res) {
            const data = await res.json();
            if (data.success) {
                showToast('Đã đổi tên', 'success');
                const page = detectCurrentPage();
                loadHistory(page);
            }
        }
    } catch (err) {
        showToast('Lỗi đổi tên', 'error');
    }
}

// Detect current page from URL
function detectCurrentPage() {
    const path = window.location.pathname;
    if (path === '/image') return 'image';
    if (path === '/video') return 'video';
    if (path === '/tts') return 'tts';
    return 'chat';
}

// Responsive sidebar
function handleResize() {
    if (window.innerWidth >= 1024) {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }
}
window.addEventListener('resize', handleResize);
