/**
 * NutriVault - Express Application
 *
 * Express app configuration without server startup
 * This allows tests to import the app without starting the server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const compression = require('compression');
const swaggerSpec = require('./config/swagger');

// Import database
const db = require('../models');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logging');
const { globalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const auditRoutes = require('./routes/audit.routes');
const usersRoutes = require('./routes/users.routes');
const patientsRoutes = require('./routes/patients.routes');
const visitsRoutes = require('./routes/visits.routes');
const billingRoutes = require('./routes/billing.routes');
const reportsRoutes = require('./routes/reports.routes');
const documentsRoutes = require('./routes/documents.routes');
const exportRoutes = require('./routes/export.routes');

// Initialize Express app
const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173';

// Security middleware - Environment-aware Helmet configuration
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in future
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  } : false // Disabled in development for ease of debugging
}));

// CORS configuration - Environment-aware
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ALLOWED_ORIGINS.split(',');

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow any origin in development
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Rate limiting
app.use(globalLimiter);

// Request logging
app.use(requestLogger);

// Enable compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug logging for all requests in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`, {
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'none',
        'content-type': req.headers['content-type']
      },
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined
    });
    next();
  });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'NutriVault API',
    version: '1.0.0',
    environment: NODE_ENV,
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      patients: '/api/patients',
      visits: '/api/visits',
      billing: '/api/billing',
      reports: '/api/reports',
      documents: '/api/documents',
      export: '/api/export',
      audit: '/api/audit-logs'
    }
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NutriVault API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/export', exportRoutes);

// 404 handler
app.use((req, res) => {
  console.error(`[404] Cannot ${req.method} ${req.path}`, {
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'none',
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;