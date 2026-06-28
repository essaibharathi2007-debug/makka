require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    message: 'வந்து மக்கள் குரல் - Server Running'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  const file = path.join(__dirname, 'public', req.path);
  const fs = require('fs');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.sendFile(file);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});
// MongoDB Atlas Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Atlas Connected - வந்து மக்கள் குரல் DB Ready');
  console.log(`📦 Database: panchayat @ cluster0.lcnuxxz.mongodb.net`);
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB Atlas connection error:', err.message);
  process.exit(1);
});