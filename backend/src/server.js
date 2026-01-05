/**
 * NutriVault - Express Server
 *
 * Main application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import database
const db = require('../../models');

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
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ALLOWED_ORIGINS.split(',');
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging (Morgan for console, custom logger for audit)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Audit logging middleware
app.use(requestLogger);

// Global rate limiting (fallback protection)
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: db.sequelize.options.dialect,
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'NutriVault API',
    version: '1.0.0',
    description: 'Secure nutrition practice management system',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      patients: '/api/patients',
      visits: '/api/visits',
      billing: '/api/billing',
      reports: '/api/reports',
      audit: '/api/audit-logs',
      documents: '/api/documents',
      export: '/api/export'
    }
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
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

// Database connection and server start
async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log(`✓ Database connected (${db.sequelize.options.dialect})`);

    // Sync database (only in development)
    if (NODE_ENV === 'development') {
      // Don't sync in production - use migrations instead
      console.log('✓ Database models loaded');
    }

    // Start server
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════╗');
      console.log('║          NutriVault API Server            ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`API Info: http://localhost:${PORT}/api`);
      console.log('');
      console.log('Press CTRL+C to stop');
      console.log('');
    });

  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
