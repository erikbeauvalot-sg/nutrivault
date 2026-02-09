/**
 * Test Server
 * Creates an Express app instance for supertest without starting the HTTP server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Create a fresh Express app for testing
function createTestApp() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Test server is running' });
  });

  // Import routes (these will use the test database via models/index.js)
  const authRoutes = require('../../src/routes/auth');
  const patientRoutes = require('../../src/routes/patients');
  const visitRoutes = require('../../src/routes/visits');
  const userRoutes = require('../../src/routes/users');
  const billingRoutes = require('../../src/routes/billing');
  const customFieldsRoutes = require('../../src/routes/customFields');
  const roleRoutes = require('../../src/routes/roles');
  const measureRoutes = require('../../src/routes/measures');
  const patientMeasureRoutes = require('../../src/routes/patientMeasures');
  const emailTemplatesRoutes = require('../../src/routes/emailTemplates');
  const billingTemplatesRoutes = require('../../src/routes/billingTemplates');
  const invoiceCustomizationsRoutes = require('../../src/routes/invoiceCustomizations');
  const exportRoutes = require('../../src/routes/export');
  const measureAlertsRoutes = require('../../src/routes/measureAlerts');
  const appointmentRemindersRoutes = require('../../src/routes/appointmentReminders');
  const themeRoutes = require('../../src/routes/themes');
  const campaignRoutes = require('../../src/routes/campaigns');
  const documentRoutes = require('../../src/routes/documents');
  const recipeRoutes = require('../../src/routes/recipes');
  const ingredientRoutes = require('../../src/routes/ingredients');
  const gdprRoutes = require('../../src/routes/gdpr');
  const analyticsRoutes = require('../../src/routes/analytics');
  const dashboardRoutes = require('../../src/routes/dashboard');
  const followupRoutes = require('../../src/routes/followups');
  const visitTypeRoutes = require('../../src/routes/visitTypes');
  const annotationRoutes = require('../../src/routes/annotations');
  const aiConfigRoutes = require('../../src/routes/aiConfig');
  const aiPromptRoutes = require('../../src/routes/aiPrompts');
  const formulaRoutes = require('../../src/routes/formulas');
  const pageViewRoutes = require('../../src/routes/pageViews');
  const emailLogRoutes = require('../../src/routes/emailLogs');
  const schedulerRoutes = require('../../src/routes/scheduler');
  const googleCalendarRoutes = require('../../src/routes/googleCalendar');
  const portalRoutes = require('../../src/routes/portal');

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/visits', visitRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/custom-fields', customFieldsRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/measures', measureRoutes);
  app.use('/api', patientMeasureRoutes);
  app.use('/api/email-templates', emailTemplatesRoutes);
  app.use('/api/billing-templates', billingTemplatesRoutes);
  app.use('/api/invoice-customizations', invoiceCustomizationsRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api', measureAlertsRoutes);
  app.use('/api/appointment-reminders', appointmentRemindersRoutes);
  app.use('/api/themes', themeRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/recipes', recipeRoutes);
  app.use('/api/ingredients', ingredientRoutes);
  app.use('/api/gdpr', gdprRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/followups', followupRoutes);
  app.use('/api/visit-types', visitTypeRoutes);
  app.use('/api', annotationRoutes);
  app.use('/api/ai-config', aiConfigRoutes);
  app.use('/api/ai-prompts', aiPromptRoutes);
  app.use('/api/formulas', formulaRoutes);
  app.use('/api/page-views', pageViewRoutes);
  app.use('/api/email-logs', emailLogRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api/calendar', googleCalendarRoutes);
  app.use('/api/portal', portalRoutes);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  // Error handler
  app.use((err, req, res, next) => {
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

  return app;
}

// Export a singleton app instance
let app = null;

function getApp() {
  if (!app) {
    app = createTestApp();
  }
  return app;
}

// Allow recreating the app (useful when database is reset)
function resetApp() {
  // Clear require cache for routes to ensure fresh instances
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/src/routes/') || key.includes('/src/controllers/') || key.includes('/src/services/')) {
      delete require.cache[key];
    }
  });
  app = createTestApp();
  return app;
}

module.exports = getApp();
module.exports.getApp = getApp;
module.exports.resetApp = resetApp;
module.exports.createTestApp = createTestApp;
