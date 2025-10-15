// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ctrl = require('../controllers/authController');

// avatar uploads
const uploadsDir = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`);
  }
});
// allow only images up to ~3MB
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpeg|jpg|webp|gif)/.test(file.mimetype || '');
    cb(ok ? null : new Error('Only PNG/JPG/WEBP/GIF images allowed (max ~3MB)'), ok);
  }
});

// auth
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);

// profile
router.get('/me/:id', ctrl.me);
router.post('/me/:id', upload.single('avatar'), ctrl.updateMe);

module.exports = router;
