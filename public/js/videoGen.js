/* ====== Video Generation ====== */
let videoAspect = '16:9';
let videoDuration = 6;
let videoRefFile = null;

// Aspect ratio
document.querySelectorAll('.aspect-ratio-group .aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.aspect-ratio-group .aspect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        videoAspect = btn.dataset.ratio;
    });
});

// Duration
document.querySelectorAll('.duration-group .duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.duration-group .duration-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        videoDuration = parseInt(btn.dataset.dur, 10);
    });
});

// Upload zone for reference image/video
const videoUploadZone = document.getElementById('videoUploadZone');
const videoRefInput = document.getElementById('videoRefInput');

videoUploadZone?.addEventListener('click', (e) => {
    if (e.target.closest('.upload-remove')) return;
    videoRefInput.click();
});
videoUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); videoUploadZone.classList.add('dragover'); });
videoUploadZone?.addEventListener('dragleave', () => videoUploadZone.classList.remove('dragover'));
videoUploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    videoUploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        setVideoRef(file);
    }
});

videoRefInput?.addEventListener('change', (e) => {
    if (e.target.files[0]) setVideoRef(e.target.files[0]);
});

function checkHideOptionsForVideoEdit() {
    const currentModel = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    const isOmni = currentModel === 'gemini-omni-flash-preview';
    const isVideo = videoRefFile && videoRefFile.type.startsWith('video/');

    const aspectGroup = document.querySelector('.aspect-ratio-group');
    const durGroup = document.querySelector('.duration-group');

    if (isOmni && isVideo) {
        if (aspectGroup) aspectGroup.style.display = 'none';
        if (durGroup) durGroup.style.display = 'none';
    } else {
        if (aspectGroup) aspectGroup.style.display = 'flex';
        if (durGroup) durGroup.style.display = 'flex';
    }
}

function setVideoRef(file) {
    const currentModel = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    const isVideo = file.type.startsWith('video/');

    if (isVideo && currentModel !== 'gemini-omni-flash-preview') {
        showToast('Tệp video (chỉnh sửa video) chỉ hỗ trợ cho model Gemini Omni Flash Preview', 'error');
        clearVideoRef();
        return;
    }

    videoRefFile = file;
    document.getElementById('videoUploadPlaceholder').style.display = 'none';
    const preview = document.getElementById('videoRefPreview');
    preview.style.display = 'flex';

    const mediaEl = isVideo 
        ? `<video src="${URL.createObjectURL(file)}" style="max-height:80px;border-radius:6px;"></video>`
        : `<img src="${URL.createObjectURL(file)}" style="max-height:80px;border-radius:6px;object-fit:cover;">`;

    preview.innerHTML = `${mediaEl}
        <div style="flex:1;font-size:0.85rem;"><span style="font-weight:600;display:block;">${file.name}</span><span style="color:var(--brown3);">${formatFileSize(file.size)}</span></div>
        <button class="upload-remove" onclick="clearVideoRef()" style="background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;"><i class="fas fa-times"></i></button>`;

    checkHideOptionsForVideoEdit();
}

function clearVideoRef() {
    videoRefFile = null;
    document.getElementById('videoRefPreview').style.display = 'none';
    document.getElementById('videoUploadPlaceholder').style.display = 'block';
    if (videoRefInput) videoRefInput.value = '';
    checkHideOptionsForVideoEdit();
}

// Generate
document.getElementById('videoGenBtn')?.addEventListener('click', async () => {
    if (!requireAuth()) return;
    const prompt = document.getElementById('videoPrompt').value.trim();
    if (!prompt) return showToast('Vui lòng nhập mô tả video', 'error');

    const btn = document.getElementById('videoGenBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang khởi tạo...';

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('aspectRatio', videoAspect);
    formData.append('durationSeconds', videoDuration);

    const modelId = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    if (modelId) formData.append('modelId', modelId);

    if (videoRefFile) {
        if (videoRefFile.type.startsWith('video/') && modelId !== 'gemini-omni-flash-preview') {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-film"></i> Tạo video';
            return showToast('Tệp video (chỉnh sửa video) chỉ hỗ trợ cho model Gemini Omni Flash Preview', 'error');
        }
        formData.append('refMedia', videoRefFile);
    }

    try {
        const token = getToken();
        const res = await fetch('/api/ai/video', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast('Đang khởi tạo tạo video, vui lòng chờ...', 'info');
            const progress = document.getElementById('videoProgress');
            progress.style.display = 'flex';
            document.getElementById('progressText').textContent = 'Đang xử lý...';

            pollVideoStatus(data.data, prompt);
        } else {
            showToast(data.message || 'Lỗi tạo video', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối server', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-film"></i> Tạo video';
});

async function pollVideoStatus(operationData, prompt) {
    const progressRing = document.getElementById('progressRing');
    const progressText = document.getElementById('progressText');
    let attempts = 0;
    const maxAttempts = 60; // 5 phút max

    const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
            progressText.textContent = 'Hết thời gian chờ';
            showToast('Tạo video quá lâu, vui lòng thử lại', 'error');
            return;
        }

        // Animate progress ring
        const progress = Math.min((attempts / 30) * 100, 95);
        const offset = 283 - (283 * progress / 100);
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `Đang xử lý... ${Math.round(progress)}%`;

        try {
            const res = await apiFetch('/api/ai/video/status', {
                method: 'POST',
                body: JSON.stringify({
                    operationName: operationData.operationName,
                    modelId: operationData.modelUsed,
                    apiKey: operationData.apiKey,
                    projectNumber: operationData.projectNumber,
                    conversationId: operationData.conversationId,
                    prompt: prompt
                })
            });
            if (!res) return;
            const data = await res.json();

            if (data.success && data.data.done) {
                // Done
                progressRing.style.strokeDashoffset = 0;
                progressText.textContent = 'Hoàn tất!';

                const results = document.getElementById('videoResults');
                results.insertAdjacentHTML('afterbegin', `
                    <div class="gen-result-card">
                        <video src="${data.data.videoUrl}" controls autoplay muted></video>
                        <div class="gen-result-info">
                            <div class="gen-result-prompt" title="${prompt}">${prompt}</div>
                            <div class="gen-result-actions">
                                <a href="${data.data.videoUrl}" download>Tải về</a>
                            </div>
                        </div>
                    </div>
                `);

                setTimeout(() => {
                    document.getElementById('videoProgress').style.display = 'none';
                    progressRing.style.strokeDashoffset = 283;
                }, 2000);

                showToast('Tạo video thành công!', 'success');
                loadVideoGallery();
                return;
            }

            // Not done, continue polling
            setTimeout(poll, 5000);
        } catch (error) {
            progressText.textContent = 'Lỗi, đang thử lại...';
            setTimeout(poll, 10000);
        }
    };

    setTimeout(poll, 5000);
}

// Cập nhật UI theo model video được chọn (Tất cả model được tạo video từ ảnh, riêng Omni hỗ trợ video file & 10s)
function updateUIForVideoModel(modelId) {
    const isOmni = modelId === 'gemini-omni-flash-preview';
    const dur10Btn = document.querySelector('.duration-group [data-dur="10"]');

    if (dur10Btn) {
        dur10Btn.style.display = isOmni ? 'inline-block' : 'none';
        if (!isOmni && videoDuration === 10) {
            document.querySelectorAll('.duration-group .duration-btn').forEach(b => b.classList.remove('active'));
            const default6Btn = document.querySelector('.duration-group [data-dur="6"]');
            if (default6Btn) default6Btn.classList.add('active');
            videoDuration = 6;
        }
    }

    if (!isOmni && videoRefFile && videoRefFile.type.startsWith('video/')) {
        showToast('Tệp video (chỉnh sửa video) chỉ hỗ trợ cho model Gemini Omni Flash Preview', 'info');
        clearVideoRef();
    }
}

window.addEventListener('modelChanged', (e) => {
    updateUIForVideoModel(e.detail?.modelId);
});

setTimeout(() => {
    const currentModel = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    updateUIForVideoModel(currentModel);
}, 200);

// ====== Video Gallery Logic ======
async function loadVideoGallery() {
    const grid = document.getElementById('videoGalleryGrid');
    if (!grid) return;
    if (!isLoggedIn()) {
        grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-lock"></i>Đăng nhập để xem bộ sưu tập video đã tạo</div>';
        return;
    }

    grid.innerHTML = '<div class="gen-loading"><div class="spinner"></div> Đang tải bộ sưu tập...</div>';

    try {
        const res = await apiFetch('/api/user/media?type=video&limit=60');
        if (!res) return;
        const data = await res.json();

        if (!data.success || !data.data.media || data.data.media.length === 0) {
            grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-film"></i>Chưa có video nào được tạo</div>';
            return;
        }

        grid.innerHTML = data.data.media.map(item => `
            <div class="gallery-card" id="media-card-${item._id}">
                <div class="gallery-card-media">
                    <video src="${item.filePath}" controls preload="metadata"></video>
                </div>
                <div class="gallery-card-body">
                    <div class="gallery-card-prompt" title="${escapeHtml(item.prompt || '')}">${escapeHtml(item.prompt || 'Video không có mô tả')}</div>
                    <div class="gallery-card-meta">
                        <span>${item.modelUsed || 'Veo Model'}</span>
                        <span>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="gallery-card-actions">
                        <a href="${item.filePath}" download target="_blank" title="Tải về"><i class="fas fa-download"></i> Tải</a>
                        <button onclick="copyToClipboard('${item.filePath}')" title="Sao chép link"><i class="fas fa-copy"></i> Link</button>
                        <button class="btn-delete" onclick="deleteUserMedia('${item._id}')" title="Xoá video"><i class="fas fa-trash"></i> Xoá</button>
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

function initVideoGallery() {
    document.getElementById('refreshVideoGallery')?.addEventListener('click', loadVideoGallery);
    if (document.getElementById('videoGalleryGrid')) {
        loadVideoGallery();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoGallery);
} else {
    initVideoGallery();
}
