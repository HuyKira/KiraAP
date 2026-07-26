/* ====== Image Generation ====== */
let selectedAspectRatio = '1:1';
let selectedCount = 1;
let imageRefFiles = [];

// Aspect ratio & count buttons
document.querySelectorAll('.gen-options .aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('count-btn')) {
            document.querySelectorAll('.count-group .count-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCount = parseInt(btn.dataset.count, 10) || 1;
        } else {
            document.querySelectorAll('.aspect-ratio-group .aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedAspectRatio = btn.dataset.ratio;
        }
    });
});

// Upload zone
const imageUploadZone = document.getElementById('imageUploadZone');
const imageRefInput = document.getElementById('imageRefInput');

imageUploadZone?.addEventListener('click', (e) => {
    if (e.target.closest('.upload-remove')) return;
    imageRefInput.click();
});
imageUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadZone.classList.add('dragover'); });
imageUploadZone?.addEventListener('dragleave', () => imageUploadZone.classList.remove('dragover'));
imageUploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadZone.classList.remove('dragover');
    if (e.dataTransfer.files?.length) {
        addRefFiles(Array.from(e.dataTransfer.files));
    }
});

imageRefInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) {
        addRefFiles(Array.from(e.target.files));
    }
});

function addRefFiles(files) {
    const validImageFiles = files.filter(f => f.type.startsWith('image/'));
    for (const f of validImageFiles) {
        if (imageRefFiles.length < 3) {
            imageRefFiles.push(f);
        }
    }
    if (files.length > 3 || imageRefFiles.length >= 3) {
        if (imageRefFiles.length >= 3) {
            showToast('Đã đạt tối đa 3 ảnh tham chiếu', 'info');
        }
    }
    renderRefPreviews();
}

function renderRefPreviews() {
    const preview = document.getElementById('imageRefPreview');
    const placeholder = document.getElementById('imageUploadPlaceholder');

    if (imageRefFiles.length === 0) {
        preview.style.display = 'none';
        placeholder.style.display = 'block';
        if (imageRefInput) imageRefInput.value = '';
        return;
    }

    placeholder.style.display = 'none';
    preview.style.display = 'flex';
    preview.innerHTML = imageRefFiles.map((file, idx) => `
        <div style="position:relative;display:inline-block;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--bg2);">
            <img src="${URL.createObjectURL(file)}" alt="" style="width:100%;height:100%;object-fit:cover;">
            <button class="upload-remove" onclick="removeRefFile(${idx})" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeRefFile(index) {
    imageRefFiles.splice(index, 1);
    renderRefPreviews();
}

function clearImageRef() {
    imageRefFiles = [];
    renderRefPreviews();
}

// Generate
document.getElementById('imageGenBtn')?.addEventListener('click', async () => {
    if (!requireAuth()) return;
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) return showToast('Vui lòng nhập mô tả hình ảnh', 'error');

    const btn = document.getElementById('imageGenBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang tạo...';

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('aspectRatio', selectedAspectRatio);
    formData.append('count', selectedCount);

    const selectedModel = typeof getSelectedModelId === 'function' ? getSelectedModelId() : '';
    if (selectedModel) formData.append('modelId', selectedModel);

    imageRefFiles.slice(0, 3).forEach(file => {
        formData.append('refImages', file);
    });

    try {
        const token = getToken();
        const res = await fetch('/api/ai/image', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            const results = document.getElementById('imageResults');
            const urls = data.data.imageUrls || [data.data.imageUrl];

            const gridHTML = `
                <div class="gen-result-card" style="margin-bottom:16px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:12px;">
                        ${urls.map(url => `
                            <div style="position:relative;border-radius:8px;overflow:hidden;background:var(--bg3);text-align:center;">
                                <img src="${url}" alt="${prompt}" onclick="window.open('${url}', '_blank')" style="width:100%;max-height:280px;object-fit:cover;cursor:pointer;border-radius:8px;">
                                <div style="padding:6px;"><a href="${url}" download class="btn btn-sm btn-secondary" style="font-size:0.8rem;padding:4px 10px;"><i class="fas fa-download"></i> Tải về</a></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="gen-result-info">
                        <div class="gen-result-prompt" title="${prompt}">${prompt}</div>
                    </div>
                </div>
            `;

            results.insertAdjacentHTML('afterbegin', gridHTML);
            showToast(`Tạo thành công ${urls.length} ảnh!`, 'success');
            loadImageGallery();
        } else {
            showToast(data.message || 'Lỗi tạo ảnh', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối server', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> Tạo ảnh';
});

// ====== Image Gallery Logic ======
async function loadImageGallery() {
    const grid = document.getElementById('imageGalleryGrid');
    if (!grid) return;
    if (!isLoggedIn()) {
        grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-lock"></i>Đăng nhập để xem bộ sưu tập ảnh đã tạo</div>';
        return;
    }

    grid.innerHTML = '<div class="gen-loading"><div class="spinner"></div> Đang tải bộ sưu tập...</div>';

    try {
        const res = await apiFetch('/api/user/media?type=image&limit=60');
        if (!res) return;
        const data = await res.json();

        if (!data.success || !data.data.media || data.data.media.length === 0) {
            grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-image"></i>Chưa có ảnh nào được tạo</div>';
            return;
        }

        grid.innerHTML = data.data.media.map(item => `
            <div class="gallery-card" id="media-card-${item._id}">
                <div class="gallery-card-media">
                    <img src="${item.filePath}" alt="${escapeHtml(item.prompt || 'Ảnh AI')}" onclick="window.open('${item.filePath}', '_blank')">
                </div>
                <div class="gallery-card-body">
                    <div class="gallery-card-prompt" title="${escapeHtml(item.prompt || '')}">${escapeHtml(item.prompt || 'Ảnh không có mô tả')}</div>
                    <div class="gallery-card-meta">
                        <span>${item.modelUsed || 'AI Model'}</span>
                        <span>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div class="gallery-card-actions">
                        <a href="${item.filePath}" download target="_blank" title="Tải về"><i class="fas fa-download"></i> Tải</a>
                        <button onclick="copyToClipboard('${item.filePath}')" title="Sao chép link"><i class="fas fa-copy"></i> Link</button>
                        <button class="btn-delete" onclick="deleteUserMedia('${item._id}')" title="Xoá ảnh"><i class="fas fa-trash"></i> Xoá</button>
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

// Initial load
function initImageGallery() {
    document.getElementById('refreshImageGallery')?.addEventListener('click', loadImageGallery);
    if (document.getElementById('imageGalleryGrid')) {
        loadImageGallery();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageGallery);
} else {
    initImageGallery();
}
