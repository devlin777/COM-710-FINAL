// config/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database.db'), (err) => {
  if (err) console.error('Failed to connect to database:', err.message);
  else console.log('Connected to SQLite database.');
});

// Always enforce foreign keys in SQLite
db.run('PRAGMA foreign_keys = ON');

db.serialize(() => {
  // --- Core tables ---
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      image TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      description TEXT,
      category TEXT,
      visibility TEXT DEFAULT 'public',
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      recipe_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)   ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, recipe_id),
      FOREIGN KEY(user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // --- Safe, one-time migrations (add columns if missing) ---
  function addColumnIfMissing(table, column, ddl) {
    db.all(`PRAGMA table_info(${table})`, (err, cols) => {
      if (err) return console.error(`PRAGMA error for ${table}:`, err.message);
      const exists = Array.isArray(cols) && cols.some(c => c.name === column);
      if (!exists) {
        // FIX: include the column name before its DDL
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`, (e) => {
          if (e) {
            console.warn(`ALTER TABLE ${table} ADD COLUMN ${column}:`, e.message);
          } else {
            console.log(`Added column '${column}' to '${table}'.`);
          }
        });
      }
    });
  }

  // Add profile fields to users if they don't exist yet
  addColumnIfMissing('users', 'bio', 'TEXT');
  addColumnIfMissing('users', 'avatar', 'TEXT'); // store /uploads/filename.ext

  // --- Helpful indexes (no-op if already present) ---
  db.run(`CREATE INDEX IF NOT EXISTS idx_recipes_visibility_created ON recipes (visibility, created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes (category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes (title)`);
});

module.exports = db;
