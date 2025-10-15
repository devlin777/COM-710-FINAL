// /src/register.js

const form   = document.getElementById('registerForm');
const userEl = document.getElementById('username');
const emailEl= document.getElementById('email');
const pwdEl  = document.getElementById('password');
const errEl  = document.getElementById('registerError');
const btn    = document.getElementById('registerBtn');
const toggle = document.getElementById('togglePwd');

function showError(msg){
  errEl.textContent = msg;
  errEl.style.display = 'block';
}
function clearError(){
  errEl.textContent = '';
  errEl.style.display = 'none';
}

// show/hide password
toggle?.addEventListener('click', () => {
  pwdEl.type = pwdEl.type === 'password' ? 'text' : 'password';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  // gather + trim
  const username = String(userEl.value || '').trim();
  const email    = String(emailEl.value || '').trim().toLowerCase();
  const password = String(pwdEl.value || '');

  // client checks (server validates again)
  const USER_RE  = /^[A-Za-z0-9_]{3,30}$/;
  if (!USER_RE.test(username)){
    showError('Username must be 3–30 characters (letters, numbers, underscore).');
    userEl.focus(); return;
  }
  if (!email || !email.includes('@') || !email.includes('.')){
    showError('Please enter a valid email address.');
    emailEl.focus(); return;
  }
  if (password.length < 8 || password.length > 72){
    showError('Password must be between 8 and 72 characters.');
    pwdEl.focus(); return;
  }

  // lock button
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok){
      showError(data.error || 'Registration failed.');
      btn.disabled = false;
      btn.textContent = 'Create Account';
      return;
    }

    // optional: remember username/email for next page UX
    try {
      localStorage.setItem('username', username);
      localStorage.setItem('email', email);
    } catch {}

    // redirect to login
    window.location.href = '/login.html';
  } catch (err){
    showError('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});
