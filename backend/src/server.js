require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('../../models');
const schedulerService = require('./services/scheduler.service');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);

    // Always allow Capacitor native app
    if (origin === 'capacitor://localhost') return callback(null, true);

    // In development, allow known local origins
    if (process.env.NODE_ENV === 'development') {
      const devOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];
      if (devOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
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
app.use(helmet({
  contentSecurityPolicy: false, // Managed by frontend/nginx
  crossOriginEmbedderPolicy: false // Allow loading external images
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import authentication and authorization middleware
const authenticate = require('./middleware/authenticate');
const { requirePermission } = require('./middleware/rbac');

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'NutriVault Server is running',
    version: process.env.APP_VERSION || require('../../package.json').version || 'dev',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public document sharing routes (no authentication required)
const publicDocumentRoutes = require('./routes/publicDocuments');
app.use('/public/documents', publicDocumentRoutes);

// Public contact form route (no authentication required)
const publicContactRoutes = require('./routes/publicContact');
app.use('/api/public/contact', publicContactRoutes);

// Authentication routes (public)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Patient portal routes (mixed public/protected)
const portalRoutes = require('./routes/portal');
app.use('/api/portal', portalRoutes);

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

// Alerts routes (protected - authentication required)
const alertsRoutes = require('./routes/alerts');
app.use('/api/alerts', alertsRoutes);

// GDPR routes (protected - RBAC enforced in routes file)
const gdprRoutes = require('./routes/gdpr');
app.use('/api/gdpr', gdprRoutes);

// Custom Fields routes (protected - RBAC enforced in routes file)
const customFieldsRoutes = require('./routes/customFields');
app.use('/api/custom-fields', customFieldsRoutes);

// Role routes (protected - RBAC enforced in routes file)
const roleRoutes = require('./routes/roles');
app.use('/api/roles', roleRoutes);

// Formula routes (protected - RBAC enforced in routes file)
const formulaRoutes = require('./routes/formulas');
app.use('/api/formulas', formulaRoutes);

// Measure Definition routes (protected - RBAC enforced in routes file)
const measureRoutes = require('./routes/measures');
app.use('/api/measures', measureRoutes);

// Patient Measures routes (protected - RBAC enforced in routes file)
const patientMeasureRoutes = require('./routes/patientMeasures');
app.use('/api', patientMeasureRoutes);

// Annotation routes (protected - RBAC enforced in routes file)
const annotationRoutes = require('./routes/annotations');
app.use('/api', annotationRoutes);

// Measure Alerts routes (protected - RBAC enforced in routes file)
const measureAlertsRoutes = require('./routes/measureAlerts');
app.use('/api', measureAlertsRoutes);

// Email Templates routes (protected - RBAC enforced in routes file)
const emailTemplatesRoutes = require('./routes/emailTemplates');
app.use('/api/email-templates', emailTemplatesRoutes);

// Appointment Reminders routes (protected - RBAC enforced in routes file)
const appointmentRemindersRoutes = require('./routes/appointmentReminders');
app.use('/api/appointment-reminders', appointmentRemindersRoutes);

// Billing Templates routes (protected - RBAC enforced in routes file)
const billingTemplatesRoutes = require('./routes/billingTemplates');
app.use('/api/billing-templates', billingTemplatesRoutes);

// Invoice Customizations routes (protected - RBAC enforced in routes file)
const invoiceCustomizationsRoutes = require('./routes/invoiceCustomizations');
app.use('/api/invoice-customizations', invoiceCustomizationsRoutes);

// AI Follow-up routes (protected - RBAC enforced in routes file)
const followupsRoutes = require('./routes/followups');
app.use('/api/followups', followupsRoutes);

// AI Configuration routes (protected - Admin only)
const aiConfigRoutes = require('./routes/aiConfig');
app.use('/api/ai-config', aiConfigRoutes);

// AI Prompts routes (protected - Admin only for management)
const aiPromptsRoutes = require('./routes/aiPrompts');
app.use('/api/ai-prompts', aiPromptsRoutes);

// Email logs routes (protected)
const emailLogsRoutes = require('./routes/emailLogs');
app.use('/api/email-logs', emailLogsRoutes);

// Analytics routes (protected)
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// Google Calendar routes (protected - RBAC enforced in routes file)
const googleCalendarRoutes = require('./routes/googleCalendar');
app.use('/api/calendar', googleCalendarRoutes);

// Visit Types routes (protected - RBAC enforced in routes file)
const visitTypesRoutes = require('./routes/visitTypes');
app.use('/api/visit-types', visitTypesRoutes);

// Recipe routes (protected - RBAC enforced in routes file)
const recipeRoutes = require('./routes/recipes');
app.use('/api/recipes', recipeRoutes);
app.use('/api/recipe-categories', (req, res, next) => {
  // Redirect /api/recipe-categories to /api/recipes/categories
  req.url = '/categories' + req.url;
  recipeRoutes(req, res, next);
});

// Ingredient routes (protected - RBAC enforced in routes file)
const ingredientRoutes = require('./routes/ingredients');
app.use('/api/ingredients', ingredientRoutes);

// Recipe access routes (for revoking/updating shares)
const recipeController = require('./controllers/recipeController');
app.delete('/api/recipe-access/:id', authenticate, requirePermission('recipes.share'), recipeController.revokeAccess);
app.put('/api/recipe-access/:id', authenticate, requirePermission('recipes.share'), recipeController.updateShareNotes);
app.get('/api/patients/:id/recipes', authenticate, requirePermission('recipes.read'), recipeController.getPatientRecipes);

// Theme routes (protected - RBAC enforced in routes file)
const themeRoutes = require('./routes/themes');
app.use('/api/themes', themeRoutes);

// Dashboard routes (protected - authentication required)
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Scheduler routes (protected - Admin only)
const schedulerRoutes = require('./routes/scheduler');
app.use('/api/scheduler', schedulerRoutes);

// Campaign routes (protected - RBAC enforced in routes file)
const campaignRoutes = require('./routes/campaigns');
app.use('/api/campaigns', campaignRoutes);

// Discord webhook routes (protected - Admin only)
const discordRoutes = require('./routes/discord');
app.use('/api/discord', discordRoutes);

// Page Views routes (partially public - tracking is public, stats require auth)
const pageViewsRoutes = require('./routes/pageViews');
app.use('/api/page-views', pageViewsRoutes);

// Device Tokens routes (push notification registration)
const deviceTokenRoutes = require('./routes/deviceTokens');
app.use('/api/device-tokens', deviceTokenRoutes);

// Notification Preferences routes
const notificationPreferencesRoutes = require('./routes/notificationPreferences');
app.use('/api/notification-preferences', notificationPreferencesRoutes);

// Messages routes (dietitian-facing messaging)
const messagesRoutes = require('./routes/messages');
app.use('/api/messages', messagesRoutes);

// Notifications routes (in-app notification center)
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Apple App Site Association — iOS credential autofill
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.json({
    webcredentials: {
      apps: ['QH6XZ5KJ4Y.com.beauvalot.nutrivault']
    }
  });
});

// Serve uploaded files (logos, signatures)
// Use /app in production (Docker), process.cwd() in development
const uploadsBasePath = process.env.NODE_ENV === 'production' ? '/app/uploads' : path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsBasePath));

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
  
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error')
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
console.log('Starting database sync...');
db.sequelize.sync()
  .then(async () => {
    console.log('Database synchronized successfully');

    // Initialize scheduled jobs
    console.log('Initializing scheduled jobs...');
    await schedulerService.initializeScheduledJobs();
    console.log('Scheduled jobs initialized');

    // Initialize push notification service (silent if Firebase config missing)
    const pushNotificationService = require('./services/pushNotification.service');
    await pushNotificationService.initialize();

    const appVersion = process.env.APP_VERSION || require('../../package.json').version || 'dev';
    console.log(`Starting server on port ${PORT}...`);
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`  NutriVault Server v${appVersion}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log(`  🌐 Server:      http://localhost:${PORT}`);
      console.log(`  📊 Health:      http://localhost:${PORT}/health`);
      console.log(`  👥 Patients:    http://localhost:${PORT}/api/patients`);
      console.log(`  📅 Visits:      http://localhost:${PORT}/api/visits`);
      console.log(`  👤 Users:       http://localhost:${PORT}/api/users`);
      console.log(`  💰 Billing:     http://localhost:${PORT}/api/billing`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  });

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  schedulerService.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  schedulerService.stopAllJobs();
  process.exit(0);
});

module.exports = app;
