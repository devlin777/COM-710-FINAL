const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({ dest: path.join(__dirname, '../../public/uploads') });

// Set up multer to save uploaded files to /public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});



// POST /api/recipes — handle file + text inputs
router.post('/', upload.single('image'), (req, res) => {
  const { title, ingredients, instructions, category, visibility, userId } = req.body;

  if (!title || !ingredients || !instructions || !category || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    `INSERT INTO recipes (title, image, ingredients, instructions, category, visibility, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, imagePath, ingredients, instructions, category, visibility, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to add recipe' });
      res.status(201).json({ message: 'Recipe added', recipeId: this.lastID });
    }
  );
});

module.exports = router;
