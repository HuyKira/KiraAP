/* ====== Auth (Popup Modal) ====== */

/**
 * Sau khi login/register thành công — reload trang hiện tại
 */
function handleLoginSuccess(data) {
    const token = data.data.token;
    const user = data.data.user;
    setToken(token);
    setUser(user);
    document.cookie = 'token=' + token + '; path=/; max-age=' + (7 * 24 * 60 * 60) + '; SameSite=Lax';
    closeAuthModal();
    // Reload trang hiện tại để cập nhật UI
    window.location.reload();
}

function initAuthEvents() {
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    });

    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });

    // Login
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.auth-btn');
        btn.textContent = 'Đang đăng nhập...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('loginEmail').value,
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await res.json();
            if (data.success) {
                handleLoginSuccess(data);
            } else {
                showToast(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }

        btn.textContent = 'Đăng nhập';
        btn.disabled = false;
    });

    // Register
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.auth-btn');
        btn.textContent = 'Đang đăng ký...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('regUsername').value,
                    email: document.getElementById('regEmail').value,
                    password: document.getElementById('regPassword').value
                })
            });
            const data = await res.json();
            if (data.success) {
                handleLoginSuccess(data);
            } else {
                showToast(data.message || 'Đăng ký thất bại', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }

        btn.textContent = 'Đăng ký';
        btn.disabled = false;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthEvents);
} else {
    initAuthEvents();
}

