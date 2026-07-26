let currentSelectedModelId = '';

async function loadModelSelector() {
    const selectEl = document.getElementById('globalModelSelect');
    if (!selectEl) return;

    const page = detectCurrentPage();
    const categoryMap = {
        chat: 'text',
        image: 'image',
        video: 'video',
        tts: 'tts'
    };
    const category = categoryMap[page] || 'text';

    try {
        const res = await fetch('/api/models?category=' + category);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            selectEl.innerHTML = data.data.map(m => `
                <option value="${m.modelId}" ${m.isDefault ? 'selected' : ''}>
                    ${m.displayName}
                </option>
            `).join('');

            const selectedOption = selectEl.value;
            currentSelectedModelId = selectedOption;
        } else {
            selectEl.innerHTML = `<option value="">Mặc định</option>`;
        }
    } catch (e) {
        selectEl.innerHTML = `<option value="">Mặc định</option>`;
    }

    window.dispatchEvent(new CustomEvent('modelChanged', { detail: { modelId: currentSelectedModelId } }));

    selectEl.addEventListener('change', (e) => {
        currentSelectedModelId = e.target.value;
        window.dispatchEvent(new CustomEvent('modelChanged', { detail: { modelId: currentSelectedModelId } }));
    });
}

function getSelectedModelId() {
    const selectEl = document.getElementById('globalModelSelect');
    return selectEl && selectEl.value ? selectEl.value : currentSelectedModelId;
}

function initApp() {
    updateUIForAuthState();
    loadModelSelector();

    // Load history cho trang hiện tại
    const page = detectCurrentPage();
    if (isLoggedIn()) {
        loadHistory(page);
    } else {
        // Guest: show empty history
        loadHistory(page);
    }

    // Nếu trang chat có param conv → load conversation
    if (page === 'chat') {
        const params = new URLSearchParams(window.location.search);
        const convId = params.get('conv');
        if (convId && isLoggedIn()) {
            currentConversationId = convId;
            loadConversation(convId);
        }
    }
}

// Topbar avatar → mở profile page (nếu đã login) hoặc popup login
document.getElementById('userAvatarTop')?.addEventListener('click', () => {
    if (!isLoggedIn()) {
        showAuthModal();
        return;
    }
    window.location.href = '/profile';
});

// Start app
document.addEventListener('DOMContentLoaded', initApp);
