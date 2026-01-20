require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../../models');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check against allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers)
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import authentication and authorization middleware
const authenticate = require('./middleware/authenticate');
const { requirePermission } = require('./middleware/rbac');

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'NutriVault POC Server is running' });
});

// Authentication routes (public)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Patient routes (protected - RBAC enforced in routes file)
const patientRoutes = require('./routes/patients');
app.use('/api/patients', patientRoutes);

// Visit routes (protected - RBAC enforced in routes file)
const visitRoutes = require('./routes/visits');
app.use('/api/visits', visitRoutes);

// User routes (protected - RBAC enforced in routes file)
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// Billing routes (protected - RBAC enforced in routes file)
const billingRoutes = require('./routes/billing');
app.use('/api/billing', billingRoutes);

// Document routes (protected - RBAC enforced in routes file)
const documentRoutes = require('./routes/documents');
app.use('/api/documents', documentRoutes);

// Export routes (protected - RBAC enforced in routes file)
const exportRoutes = require('./routes/export');
app.use('/api/export', exportRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: `${e.path} already exists`
      }))
    });
  }
  
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Sync database and start server
db.sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ NutriVault POC server running on http://localhost:${PORT}`);
      console.log(`🌐 Accessible on network at http://0.0.0.0:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`👥 Patients API: http://localhost:${PORT}/api/patients`);
      console.log(`📅 Visits API: http://localhost:${PORT}/api/visits`);
      console.log(`👤 Users API: http://localhost:${PORT}/api/users`);
      console.log(`💰 Billing API: http://localhost:${PORT}/api/billing`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    process.exit(1);
  });

module.exports = app;
