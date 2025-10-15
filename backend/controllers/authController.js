// backend/controllers/authController.js

const bcrypt = require('bcrypt');
const db = require('../../config/db');

// simple validators
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE  = /^[A-Za-z0-9_]{3,30}$/;
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

// introspect users table so profile fields are safe if optional columns don't exist
function getUserColumns(cb) {
  db.all('PRAGMA table_info(users)', (err, cols) => {
    if (err) return cb(err);
    const names = (cols || []).map(c => c.name);
    const has = (n) => names.includes(n);
    cb(null, { has, names });
  });
}

/* -----------------------------
   POST /api/auth/register
----------------------------- */
exports.register = async (req, res) => {
  let { username, email, password } = req.body || {};
  username = String(username || '').trim();
  email    = String(email || '').trim().toLowerCase();
  password = String(password || '');

  if (!EMAIL_RE.test(email))       return bad(res, 'Invalid email');
  if (!USER_RE.test(username))     return bad(res, 'Username must be 3–30 chars (letters/numbers/_)');
  if (password.length < 8 || password.length > 72)
                                   return bad(res, 'Password must be 8–72 chars');

  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    stmt.run(username, email, hashed, function (err) {
      if (err) {
        const msg = String(err.message || '');
        if (/UNIQUE/i.test(msg) && /email/i.test(msg))    return bad(res, 'Email already in use', 409);
        if (/UNIQUE/i.test(msg) && /username/i.test(msg)) return bad(res, 'Username already in use', 409);
        return bad(res, 'Registration failed', 500);
      }
      return res.status(201).json({ message: 'User registered successfully', id: this.lastID });
    });
  } catch {
    return bad(res, 'Server error', 500);
  }
};

/* -----------------------------
   POST /api/auth/login
----------------------------- */
exports.login = (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');

  if (!EMAIL_RE.test(email) || !password) return bad(res, 'Invalid credentials');

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err)   return bad(res, 'Database error', 500);
    if (!user) return bad(res, 'User not found', 404);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return bad(res, 'Incorrect password', 401);

    res.json({
      userId: user.id,
      username: user.username,
      email: user.email,
      // optional columns returned only if present
      avatar: user.avatar ?? null
    });
  });
};

/* -----------------------------
   GET /api/auth/me/:id
----------------------------- */
exports.me = (req, res) => {
  const id = +req.params.id;
  if (!id) return bad(res, 'Invalid id');

  getUserColumns((err, info) => {
    if (err) return bad(res, 'Introspection failed', 500);

    const fields = ['id', 'username', 'email'];
    if (info.has('bio'))    fields.push('bio');
    if (info.has('avatar')) fields.push('avatar');

    const sql = `SELECT ${fields.join(', ')} FROM users WHERE id = ?`;
    db.get(sql, [id], (e, row) => {
      if (e)   return bad(res, 'Failed to fetch profile', 500);
      if (!row) return bad(res, 'User not found', 404);
      res.json(row);
    });
  });
};

/* -----------------------------
   POST /api/auth/me/:id
   Accepts fields: username, bio, password
   And optional file field: avatar
----------------------------- */
exports.updateMe = async (req, res) => {
  const id = +req.params.id;
  if (!id) return bad(res, 'Invalid id');

  const { username, bio, password } = req.body || {};
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

  // early validation where applicable
  if (typeof username !== 'undefined' && !USER_RE.test(String(username || '')))
    return bad(res, 'Username must be 3–30 chars (letters/numbers/_)');
  if (typeof password !== 'undefined') {
    const pwd = String(password || '');
    if (!pwd) return bad(res, 'Password cannot be empty');
    if (pwd.length < 8 || pwd.length > 72) return bad(res, 'Password must be 8–72 chars');
  }

  getUserColumns(async (err, info) => {
    if (err) return bad(res, 'Introspection failed', 500);

    const sets = [];
    const params = [];

    if (typeof username !== 'undefined') {
      sets.push('username = ?'); params.push(String(username).trim());
    }
    if (info.has('bio') && typeof bio !== 'undefined') {
      sets.push('bio = ?'); params.push(String(bio || '').trim());
    }
    if (info.has('avatar') && avatarPath) {
      sets.push('avatar = ?'); params.push(avatarPath);
    }
    if (typeof password !== 'undefined') {
      try {
        const hashed = await bcrypt.hash(String(password), 10);
        sets.push('password = ?'); params.push(hashed);
      } catch {
        return bad(res, 'Failed to hash password', 500);
      }
    }

    if (!sets.length) return res.json({ message: 'Nothing to update' });

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function (e) {
      if (e) {
        const msg = String(e.message || '');
        if (/UNIQUE/i.test(msg) && /email/i.test(msg))    return bad(res, 'Email already in use', 409);
        if (/UNIQUE/i.test(msg) && /username/i.test(msg)) return bad(res, 'Username already in use', 409);
        return bad(res, 'Failed to update profile', 500);
      }
      res.json({ message: 'Profile updated' });
    });
  });
};
