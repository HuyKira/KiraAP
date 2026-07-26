/* ====== Profile Page ====== */

// Load dữ liệu profile khi trang load
document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
});

function loadProfileData() {
    const user = getUser();
    if (!user) return;
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const roleEl = document.getElementById('profileRole');
    if (nameEl) nameEl.value = user.displayName || user.username || '';
    if (emailEl) emailEl.value = user.email || '';
    if (roleEl) roleEl.value = user.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
}

// Lưu profile
document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    if (!requireAuth()) return;
    const name = document.getElementById('profileName').value.trim();
    const currentPw = document.getElementById('currentPw').value;
    const newPw = document.getElementById('newPw').value;

    if (!name) return showToast('Vui lòng nhập tên hiển thị', 'error');

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    try {
        // Cập nhật tên
        const res = await apiFetch('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ displayName: name })
        });
        if (res) {
            const data = await res.json();
            if (data.success) {
                const user = getUser();
                user.displayName = name;
                setUser(user);
                updateUIForAuthState();
                showToast('Đã cập nhật thông tin', 'success');
            } else {
                showToast(data.message || 'Lỗi cập nhật', 'error');
            }
        }

        // Đổi mật khẩu nếu có
        if (currentPw && newPw) {
            const pwRes = await apiFetch('/api/auth/password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
            });
            if (pwRes) {
                const pwData = await pwRes.json();
                if (pwData.success) {
                    showToast('Đã đổi mật khẩu', 'success');
                    document.getElementById('currentPw').value = '';
                    document.getElementById('newPw').value = '';
                } else {
                    showToast(pwData.message || 'Lỗi đổi mật khẩu', 'error');
                }
            }
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
});

// Đăng xuất
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const ok = await showConfirm('Đăng xuất', 'Bạn muốn đăng xuất khỏi tài khoản?');
    if (ok) {
        removeToken();
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/';
    }
});
