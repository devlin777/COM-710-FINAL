// backend/routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ctrl = require('../controllers/recipeController');

/* ---------- visibility + clamping ---------- */
const VIZ = new Set(['public', 'private']);
const clampStr = (v, max) => {
  v = String(v || '').trim();
  return v.length > max ? v.slice(0, max) : v;
};

// clamp only if the key exists in the incoming body (so PUT can be partial)
function sanitizeRecipe(req, _res, next) {
  const b = req.body || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);

  if (has('title'))        b.title        = clampStr(b.title, 100);
  if (has('description'))  b.description  = clampStr(b.description, 400);
  if (has('category'))     b.category     = clampStr(b.category, 40);
  if (has('ingredients'))  b.ingredients  = clampStr(b.ingredients, 4000);
  if (has('instructions')) b.instructions = clampStr(b.instructions, 8000);
  if (has('visibility'))   b.visibility   = VIZ.has(String(b.visibility)) ? String(b.visibility) : 'public';

  req.body = b;
  next();
}

/* ---------- uploads (recipe images) ---------- */
const uploadsDir = path.join(__dirname, '../../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
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

/* ---------- public list/search ---------- */
router.get('/', ctrl.listPublic);

/* ---------- my recipes ---------- */
router.get('/mine', ctrl.listMine);
router.get('/user/:userId', (req, res, next) => {
  req.query.user_id = req.params.userId;
  ctrl.listMine(req, res, next);
});

/* ---------- read one ---------- */
router.get('/:id', ctrl.getOne);

/* ---------- create / update / delete ---------- */
// multer must run before sanitize so req.body is populated from multipart
router.post('/', upload.single('image'), sanitizeRecipe, ctrl.create);
router.put('/:id', upload.single('image'), sanitizeRecipe, ctrl.update);
router.delete('/:id', ctrl.remove);

/* ---------- favorites ---------- */
router.post('/:id/favorite', ctrl.favorite);
router.get('/:id/favorites', ctrl.favoritesCount);

/* ---------- comments ---------- */
router.post('/:id/comments', ctrl.addComment);
router.get('/:id/comments', ctrl.listComments);
router.put('/comments/:commentId', ctrl.updateComment);
router.delete('/comments/:commentId', ctrl.deleteComment);

module.exports = router;
