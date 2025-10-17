const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // security headers

const app = express();

// Init DB (creates tables on require)
require('../config/db');

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // explicitly off
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, '../public')));
app.use('/src', express.static(path.join(__dirname, '../src')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipeRoutes'));

// Root -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// Basic error handler (keeps JSON shape consistent)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Export for tests
module.exports = app;

// Start only when run directly (not when required by tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
