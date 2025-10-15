// File: seed.js
const db = require('./config/db');

db.run(`
  INSERT INTO recipes (title, image, description, category, visibility, user_id, ingredients, instructions)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`, [
  'Test Dish',
  '/uploads/test.jpg',
  'This is a test recipe for debugging.',
  'Dinner',
  'public',
  1,
  'salt, pepper, onions',
  'Chop ingredients. Mix. Cook. Done.'
], function (err) {
  if (err) {
    console.error('❌ Failed to insert test recipe:', err.message);
  } else {
    console.log('✅ Test recipe inserted with ID:', this.lastID);
  }
  db.close();
});
