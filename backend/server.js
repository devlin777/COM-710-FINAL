const path = require('path');
const db = require('../config/db');
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from public folder
app.use(express.static(path.join(__dirname, '../public')));
app.use('/src', express.static(path.join(__dirname, '../src')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));


// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


const recipeRoutes = require('./routes/recipeRoutes');
app.use('/api/recipes', recipeRoutes); 

// Default route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
