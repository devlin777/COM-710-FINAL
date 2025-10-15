// /src/login.js

const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const pwdEl = document.getElementById('password');
const errEl = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');

document.getElementById('togglePwd')?.addEventListener('click', () => {
  pwdEl.type = pwdEl.type === 'password' ? 'text' : 'password';
});

function showError(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }
function clearError() { errEl.textContent = ''; errEl.style.display = 'none'; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = String(emailEl.value || '').trim().toLowerCase();
  const password = String(pwdEl.value || '');

  if (!email || !email.includes('@') || !email.includes('.')) {
    showError('Please enter a valid email address.');
    emailEl.focus(); return;
  }
  if (password.length < 8) {
    showError('Password must be at least 8 characters.');
    pwdEl.focus(); return;
  }

  btn.disabled = true; btn.textContent = 'Signing in…';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.error || 'Login failed. Please check your details.');
      btn.disabled = false; btn.textContent = 'Login'; return;
    }

    try {
      localStorage.setItem('userId', data.userId);
      if (data.username) localStorage.setItem('username', data.username);
      if (data.email) localStorage.setItem('email', data.email);
      if (data.avatar) localStorage.setItem('avatar', data.avatar);
    } catch {}

    window.location.href = '/index.html';
  } catch {
    showError('Network error. Please try again.');
    btn.disabled = false; btn.textContent = 'Login';
  }
});
