// backend/controllers/recipeController.js

const path = require('path');
const db = require('../../config/db');

/* helper: verify recipe owner */
function ownerCheck(recipeId, userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT user_id FROM recipes WHERE id = ?', [recipeId], (e, row) => {
      if (e) return reject(Object.assign(new Error('DB error'), { status: 500 }));
      if (!row) return reject(Object.assign(new Error('Not found'), { status: 404 }));
      if (+row.user_id !== +userId) {
        return reject(Object.assign(new Error('Forbidden (not owner)'), { status: 403 }));
      }
      resolve();
    });
  });
}

/* GET /api/recipes?category=&q=&page=&limit= */
exports.listPublic = async (req, res) => {
  try {
    const { category, q = '', page = 1, limit = 12 } = req.query;
    const L = Math.max(1, Math.min(+limit || 12, 50));
    const offset = (Math.max(1, +page || 1) - 1) * L;

    let sql = `
      SELECT id, user_id, title, image, category, visibility, created_at
      FROM recipes
      WHERE visibility='public'
    `;
    const params = [];

    if (category) { sql += ` AND LOWER(category)=LOWER(?)`; params.push(category); }
    if (q) {
      sql += ` AND (LOWER(title) LIKE ? OR LOWER(ingredients) LIKE ?)`;
      const like = `%${String(q).toLowerCase()}%`;
      params.push(like, like);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(L, offset);

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch recipes' });
      res.json(rows);
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

/* GET /api/recipes/mine?user_id=&q=&page=&limit=&meta=1 */
exports.listMine = (req, res) => {
  const { user_id, q = '', page = 1, limit = 12, meta } = req.query;
  const uid = +user_id;
  if (!uid) return res.status(400).json({ error: 'user_id required' });

  const L = Math.max(1, Math.min(+limit || 12, 50));
  const offset = (Math.max(1, +page || 1) - 1) * L;

  let base = `FROM recipes WHERE user_id = ?`;
  const params = [uid];

  if (q) {
    base += ` AND (LOWER(title) LIKE ? OR LOWER(ingredients) LIKE ?)`;
    const like = `%${String(q).toLowerCase()}%`;
    params.push(like, like);
  }

  const dataSql = `
    SELECT id, user_id, title, image, category, visibility, created_at
    ${base}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`;
  const dataParams = params.concat([L, offset]);

  if (String(meta) === '1') {
    const countSql = `SELECT COUNT(*) AS total ${base}`;
    db.get(countSql, params, (err, c) => {
      if (err) return res.status(500).json({ error: 'Failed to count recipes' });
      db.all(dataSql, dataParams, (e, rows) => {
        if (e) return res.status(500).json({ error: 'Failed to fetch recipes' });
        res.json({ items: rows, total: c.total });
      });
    });
  } else {
    db.all(dataSql, dataParams, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch recipes' });
      res.json(rows);
    });
  }
};

/* GET /api/recipes/:id */
exports.getOne = (req, res) => {
  db.get('SELECT * FROM recipes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch recipe' });
    if (!row) return res.status(404).json({ error: 'Recipe not found' });
    res.json(row);
  });
};

/* POST /api/recipes  (multipart) */
exports.create = (req, res) => {
  const { user_id, title, ingredients, instructions, category, visibility, description } = req.body || {};
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!user_id || !title || !ingredients || !instructions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO recipes (user_id, title, image, ingredients, instructions, description, category, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const vals = [user_id, title, imagePath, ingredients, instructions, description ?? null, category ?? null, visibility ?? 'public'];

  db.run(sql, vals, function (err) {
    if (err) return res.status(500).json({ error: 'Failed to add recipe', details: err.message });
    res.status(201).json({ message: 'Recipe added', recipeId: this.lastID });
  });
};

/* PUT /api/recipes/:id  (multipart) */
exports.update = async (req, res) => {
  const id = +req.params.id;
  const uid = +(req.body.user_id || req.query.user_id);
  if (!uid) return res.status(400).json({ error: 'user_id required' });

  try {
    await ownerCheck(id, uid);

    const { title, ingredients, instructions, description, category, visibility } = req.body || {};
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const sets = [];
    const params = [];

    if (title)        { sets.push('title=?');        params.push(title); }
    if (ingredients)  { sets.push('ingredients=?');  params.push(ingredients); }
    if (instructions) { sets.push('instructions=?'); params.push(instructions); }
    if (description!==undefined) { sets.push('description=?'); params.push(description || null); }
    if (category!==undefined)    { sets.push('category=?');    params.push(category || null); }
    if (visibility)   { sets.push('visibility=?');   params.push(visibility); }
    if (imagePath)    { sets.push('image=?');        params.push(imagePath); }

    if (!sets.length) return res.json({ message: 'Nothing to update' });

    const sql = `UPDATE recipes SET ${sets.join(', ')} WHERE id=?`;
    params.push(id);

    db.run(sql, params, function (e) {
      if (e) return res.status(500).json({ error: 'Failed to update recipe', details: e.message });
      res.json({ message: 'Recipe updated' });
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Update failed' });
  }
};

/* DELETE /api/recipes/:id?user_id=123 */
exports.remove = (req, res) => {
  const rid = +req.params.id;
  const uid = +req.query.user_id;
  if (!rid || !uid) return res.status(400).json({ error: 'id and user_id required' });

  // Check ownership first
  db.get('SELECT user_id FROM recipes WHERE id = ?', [rid], (e, row) => {
    if (e) return res.status(500).json({ error: 'Failed to fetch recipe', details: e.message });
    if (!row) return res.status(404).json({ error: 'Recipe not found' });
    if (+row.user_id !== +uid) return res.status(403).json({ error: 'Not your recipe' });

    // Manually cascade to be extra safe (favorites, comments), then delete recipe
    db.serialize(() => {
      db.run('DELETE FROM favorites WHERE recipe_id = ?', [rid]);
      db.run('DELETE FROM comments  WHERE recipe_id = ?', [rid]);
      db.run('DELETE FROM recipes   WHERE id = ?', [rid], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete recipe', details: err.message });
        return res.json({ message: 'Recipe deleted' });
      });
    });
  });
};
/* POST /api/recipes/:id/favorite */
exports.favorite = (req, res) => {
  const { userId } = req.body;
  const recipeId = req.params.id;

  db.run(
    'INSERT OR IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)',
    [userId, recipeId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to favorite' });
      res.json({ message: 'Recipe favorited' });
    }
  );
};

/* GET /api/recipes/:id/favorites */
exports.favoritesCount = (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM favorites WHERE recipe_id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Failed to count favorites' });
      res.json({ count: row.count });
    }
  );
};

/* POST /api/recipes/:id/comments */
exports.addComment = (req, res) => {
  const { content, userId } = req.body;
  const recipeId = req.params.id;

  if (!content || !userId) {
    return res.status(400).json({ error: 'Missing content or user' });
  }

  db.run(
    'INSERT INTO comments (content, recipe_id, user_id) VALUES (?, ?, ?)',
    [content, recipeId, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to post comment' });
      res.json({ message: 'Comment added', id: this.lastID });
    }
  );
};

/* GET /api/recipes/:id/comments */
exports.listComments = (req, res) => {
  db.all(
    `SELECT comments.id, comments.user_id, comments.content, comments.created_at, users.username 
     FROM comments 
     JOIN users ON comments.user_id = users.id 
     WHERE recipe_id = ?
     ORDER BY created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch comments' });
      res.json(rows);
    }
  );
};

/* PUT /api/recipes/comments/:commentId */
exports.updateComment = (req, res) => {
  const id = +req.params.commentId;
  const { content, userId } = req.body;
  if (!content || !userId) return res.status(400).json({ error: 'content and userId required' });

  db.get('SELECT user_id FROM comments WHERE id=?', [id], (e, row) => {
    if (e) return res.status(500).json({ error: 'Failed', details: e.message });
    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (+row.user_id !== +userId) return res.status(403).json({ error: 'Forbidden (not owner)' });

    db.run('UPDATE comments SET content=? WHERE id=?', [content, id], function (err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ message: 'Comment updated' });
    });
  });
};

/* DELETE /api/recipes/comments/:commentId */
exports.deleteComment = (req, res) => {
  const id = +req.params.commentId;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.get('SELECT user_id FROM comments WHERE id=?', [id], (e, row) => {
    if (e) return res.status(500).json({ error: 'Failed', details: e.message });
    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (+row.user_id !== +userId) return res.status(403).json({ error: 'Forbidden (not owner)' });

    db.run('DELETE FROM comments WHERE id=?', [id], function (err) {
      if (err) return res.status(500).json({ error: 'Delete failed' });
      res.json({ message: 'Comment deleted' });
    });
  });
};
