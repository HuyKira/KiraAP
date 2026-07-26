/* ====== TTS Generation ====== */
let selectedVoice = 'alloy';
let currentSampleAudio = null;

// Voice selection & Audio sample playback
document.querySelectorAll('.voice-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedVoice = card.dataset.voice;

        // Play voice sample audio
        const sampleUrl = card.dataset.sample;
        if (sampleUrl) {
            if (currentSampleAudio) {
                currentSampleAudio.pause();
                currentSampleAudio.currentTime = 0;
            }
            currentSampleAudio = new Audio(sampleUrl);
            currentSampleAudio.play().catch(err => {
                console.log('Autoplay audio sample blocked or failed:', err);
            });
        }
    });
});

// File upload
const ttsUploadZone = document.getElementById('ttsUploadZone');
const ttsFileInput = document.getElementById('ttsFileInput');

ttsUploadZone?.addEventListener('click', () => ttsFileInput.click());

ttsFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('ttsText').value = ev.target.result;
            showToast('Đã tải nội dung từ file', 'success');
        };
        reader.readAsText(file);
    }
});

// Generate
document.getElementById('ttsGenBtn')?.addEventListener('click', async () => {
    if (!requireAuth()) return;
    const text = document.getElementById('ttsText').value.trim();
    if (!text) return showToast('Vui lòng nhập văn bản', 'error');

    const btn = document.getElementById('ttsGenBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang tạo...';

    try {
        const modelId = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
        const res = await apiFetch('/api/ai/tts', {
            method: 'POST',
            body: JSON.stringify({ text, voiceName: selectedVoice, modelId })
        });
        if (!res) return;
        const data = await res.json();

        if (data.success) {
            const results = document.getElementById('ttsResults');
            results.insertAdjacentHTML('afterbegin', `
                <div class="audio-result-card">
                    <audio src="${data.data.audioUrl}" controls autoplay></audio>
                    <div class="gen-result-info">
                        <div class="gen-result-prompt" title="${text}">${text.substring(0, 100)}...</div>
                        <div class="gen-result-actions">
                            <a href="${data.data.audioUrl}" download>Tải về</a>
                            <span style="font-size:.78rem;color:var(--brown3);">${selectedVoice}</span>
                        </div>
                    </div>
                </div>
            `);
            showToast('Tạo giọng nói thành công!', 'success');
            loadTTSGallery();
        } else {
            showToast(data.message || 'Lỗi tạo giọng nói', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối server', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-volume-up"></i> Tạo giọng nói';
});

// ====== TTS Gallery Logic ======
async function loadTTSGallery() {
    const grid = document.getElementById('ttsGalleryGrid');
    if (!grid) return;
    if (!isLoggedIn()) {
        grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-lock"></i>Đăng nhập để xem bộ sưu tập giọng nói đã tạo</div>';
        return;
    }

    grid.innerHTML = '<div class="gen-loading"><div class="spinner"></div> Đang tải bộ sưu tập...</div>';

    try {
        const res = await apiFetch('/api/user/media?type=audio&limit=60');
        if (!res) return;
        const data = await res.json();

        if (!data.success || !data.data.media || data.data.media.length === 0) {
            grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-headphones"></i>Chưa có tệp âm thanh nào được tạo</div>';
            return;
        }

        grid.innerHTML = data.data.media.map(item => `
            <div class="gallery-card" id="media-card-${item._id}">
                <div class="gallery-card-audio">
                    <audio src="${item.filePath}" controls preload="metadata"></audio>
                </div>
                <div class="gallery-card-body">
                    <div class="gallery-card-prompt" title="${escapeHtml(item.prompt || '')}">${escapeHtml(item.prompt || 'Âm thanh không có mô tả')}</div>
                    <div class="gallery-card-meta">
                        <span>${item.modelUsed || 'TTS Model'}</span>
                        <span>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="gallery-card-actions">
                        <a href="${item.filePath}" download target="_blank" title="Tải về"><i class="fas fa-download"></i> Tải</a>
                        <button onclick="copyToClipboard('${item.filePath}')" title="Sao chép link"><i class="fas fa-copy"></i> Link</button>
                        <button class="btn-delete" onclick="deleteUserMedia('${item._id}')" title="Xoá âm thanh"><i class="fas fa-trash"></i> Xoá</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = '<div class="gallery-empty">Lỗi tải bộ sưu tập</div>';
    }
}

async function deleteUserMedia(id) {
    const ok = await showConfirm('Xoá tệp', 'Bạn có chắc chắn muốn xoá tệp này khỏi bộ sưu tập?');
    if (!ok) return;
    try {
        const res = await apiFetch('/api/user/media/' + id, { method: 'DELETE' });
        if (res) {
            const data = await res.json();
            if (data.success) {
                showToast('Đã xoá tệp', 'success');
                const card = document.getElementById('media-card-' + id);
                if (card) card.remove();
            }
        }
    } catch (err) {
        showToast('Lỗi xoá media', 'error');
    }
}

function initTTSGallery() {
    document.getElementById('refreshTTSGallery')?.addEventListener('click', loadTTSGallery);
    if (document.getElementById('ttsGalleryGrid')) {
        loadTTSGallery();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTSGallery);
} else {
    initTTSGallery();
}
