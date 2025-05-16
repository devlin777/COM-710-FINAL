const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../config/db'); 


// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  try {
    stmt.run(username, email, hashedPassword);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Email already used or bad input' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    res.json({ userId: user.id });
  });
});

module.exports = router;
