/**
 * Test Database Utilities
 * Manages database lifecycle for integration tests
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Store the sequelize instance
let sequelize = null;
let db = null;

/**
 * Initialize the test database
 * Creates an in-memory SQLite database with all models
 */
async function init() {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Clear ALL require caches related to models, services, and middleware
  // This ensures that all code paths use the same test database instance
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/models/') ||
        key.includes('/config/database') ||
        key.includes('/src/services/') ||
        key.includes('/src/controllers/') ||
        key.includes('/src/middleware/') ||
        key.includes('/src/routes/') ||
        key.includes('/src/auth/')) {
      delete require.cache[key];
    }
  });

  // Import fresh db instance (uses test config with :memory: SQLite)
  db = require('../../../models');
  sequelize = db.sequelize;

  // Sync all models (creates tables)
  await sequelize.sync({ force: true });

  return db;
}

/**
 * Reset all tables to empty state
 * Clears all data while preserving schema
 */
async function reset() {
  if (!sequelize) {
    throw new Error('Database not initialized. Call init() first.');
  }

  // Get all model names in dependency order (reverse to delete properly)
  const models = [
    'EmailLog',
    'InvoiceEmail',
    'Payment',
    'Billing',
    'MeasureAlert',
    'PatientMeasure',
    'MeasureTranslation',
    'MeasureDefinition',
    'VisitCustomFieldValue',
    'Visit',
    'PatientCustomFieldValue',
    'CustomFieldTranslation',
    'CustomFieldDefinition',
    'CustomFieldCategory',
    'PatientTag',
    'DocumentAccessLog',
    'DocumentShare',
    'Document',
    // Recipe models
    'RecipePatientAccess',
    'RecipeIngredient',
    'Recipe',
    'RecipeCategory',
    'Ingredient',
    // Task model
    'Task',
    // Annotation model
    'MeasureAnnotation',
    // Visit types
    'VisitType',
    // Page views
    'PageView',
    // Ingredient category
    'IngredientCategory',
    // Campaign models
    'EmailCampaignRecipient',
    'EmailCampaign',
    // Finance models
    'AccountingEntry',
    'Expense',
    'QuoteItem',
    'Quote',
    'Client',
    'Patient',
    'AuditLog',
    'RefreshToken',
    'ApiKey',
    'BillingTemplateItem',
    'BillingTemplate',
    'EmailTemplate',
    'InvoiceCustomization',
    'AIPrompt',
    'SystemSetting',
    'Theme',
    'RolePermission',
    'User',
    'Permission',
    'Role'
  ];

  // Disable foreign key checks for SQLite
  await sequelize.query('PRAGMA foreign_keys = OFF;');

  // Truncate tables in order
  for (const modelName of models) {
    if (db[modelName]) {
      try {
        await db[modelName].destroy({ where: {}, force: true, truncate: true });
      } catch (error) {
        // Ignore errors for tables that may not exist
      }
    }
  }

  // Re-enable foreign key checks
  await sequelize.query('PRAGMA foreign_keys = ON;');
}

/**
 * Seed base data needed for most tests
 * Creates roles and permissions
 */
async function seedBaseData() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }

  // Create roles (UUIDs will be auto-generated)
  const roles = await db.Role.bulkCreate([
    { name: 'ADMIN', description: 'Administrator with full access', is_active: true },
    { name: 'DIETITIAN', description: 'Dietitian with patient access', is_active: true },
    { name: 'ASSISTANT', description: 'Assistant with limited access', is_active: true },
    { name: 'PATIENT', description: 'Patient with portal access', is_active: true }
  ]);

  // Create permissions (using actual schema: code, description, resource, action)
  const permissionData = [
    // Patient permissions
    { code: 'patients.create', description: 'Create new patients', resource: 'patients', action: 'create' },
    { code: 'patients.read', description: 'View patient information', resource: 'patients', action: 'read' },
    { code: 'patients.update', description: 'Modify patient information', resource: 'patients', action: 'update' },
    { code: 'patients.delete', description: 'Remove patients', resource: 'patients', action: 'delete' },
    { code: 'patients.read.all', description: 'View all patients regardless of assignment', resource: 'patients', action: 'read.all' },

    // Visit permissions
    { code: 'visits.create', description: 'Create new visits', resource: 'visits', action: 'create' },
    { code: 'visits.read', description: 'View visit information', resource: 'visits', action: 'read' },
    { code: 'visits.update', description: 'Modify visit information', resource: 'visits', action: 'update' },
    { code: 'visits.delete', description: 'Remove visits', resource: 'visits', action: 'delete' },

    // Billing permissions
    { code: 'billing.create', description: 'Create invoices', resource: 'billing', action: 'create' },
    { code: 'billing.read', description: 'View billing information', resource: 'billing', action: 'read' },
    { code: 'billing.update', description: 'Modify billing information', resource: 'billing', action: 'update' },
    { code: 'billing.delete', description: 'Remove billing records', resource: 'billing', action: 'delete' },

    // User permissions
    { code: 'users.create', description: 'Create new users', resource: 'users', action: 'create' },
    { code: 'users.read', description: 'View user information', resource: 'users', action: 'read' },
    { code: 'users.update', description: 'Modify user information', resource: 'users', action: 'update' },
    { code: 'users.delete', description: 'Remove users', resource: 'users', action: 'delete' },

    // Role permissions
    { code: 'roles.create', description: 'Create new roles', resource: 'roles', action: 'create' },
    { code: 'roles.read', description: 'View role information', resource: 'roles', action: 'read' },
    { code: 'roles.update', description: 'Modify role information', resource: 'roles', action: 'update' },
    { code: 'roles.delete', description: 'Remove roles', resource: 'roles', action: 'delete' },

    // Custom Fields permissions
    { code: 'custom_fields.create', description: 'Create custom field definitions', resource: 'custom_fields', action: 'create' },
    { code: 'custom_fields.read', description: 'View custom field definitions', resource: 'custom_fields', action: 'read' },
    { code: 'custom_fields.update', description: 'Modify custom field definitions', resource: 'custom_fields', action: 'update' },
    { code: 'custom_fields.delete', description: 'Remove custom field definitions', resource: 'custom_fields', action: 'delete' },

    // Measure permissions
    { code: 'measures.create', description: 'Create measure definitions', resource: 'measures', action: 'create' },
    { code: 'measures.read', description: 'View measure definitions', resource: 'measures', action: 'read' },
    { code: 'measures.update', description: 'Modify measure definitions', resource: 'measures', action: 'update' },
    { code: 'measures.delete', description: 'Remove measure definitions', resource: 'measures', action: 'delete' },

    // Email Template permissions
    { code: 'email_templates.create', description: 'Create email templates', resource: 'email_templates', action: 'create' },
    { code: 'email_templates.read', description: 'View email templates', resource: 'email_templates', action: 'read' },
    { code: 'email_templates.update', description: 'Modify email templates', resource: 'email_templates', action: 'update' },
    { code: 'email_templates.delete', description: 'Remove email templates', resource: 'email_templates', action: 'delete' },

    // Billing Template permissions
    { code: 'billing_templates.create', description: 'Create billing templates', resource: 'billing_templates', action: 'create' },
    { code: 'billing_templates.read', description: 'View billing templates', resource: 'billing_templates', action: 'read' },
    { code: 'billing_templates.update', description: 'Modify billing templates', resource: 'billing_templates', action: 'update' },
    { code: 'billing_templates.delete', description: 'Remove billing templates', resource: 'billing_templates', action: 'delete' },

    // Invoice Customization permissions
    { code: 'invoice_customization.read', description: 'View invoice customization', resource: 'invoice_customization', action: 'read' },
    { code: 'invoice_customization.update', description: 'Modify invoice customization', resource: 'invoice_customization', action: 'update' },

    // Export permissions
    { code: 'export.patients', description: 'Export patient data', resource: 'export', action: 'patients' },
    { code: 'export.visits', description: 'Export visit data', resource: 'export', action: 'visits' },
    { code: 'export.billing', description: 'Export billing data', resource: 'export', action: 'billing' },

    // Admin permissions
    { code: 'admin.settings', description: 'Access admin settings', resource: 'admin', action: 'settings' },
    { code: 'admin.ai_config', description: 'Configure AI settings', resource: 'admin', action: 'ai_config' },

    // Document permissions
    { code: 'documents.read', description: 'View documents', resource: 'documents', action: 'read' },
    { code: 'documents.upload', description: 'Upload documents', resource: 'documents', action: 'upload' },
    { code: 'documents.update', description: 'Update documents', resource: 'documents', action: 'update' },
    { code: 'documents.delete', description: 'Delete documents', resource: 'documents', action: 'delete' },
    { code: 'documents.download', description: 'Download documents', resource: 'documents', action: 'download' },
    { code: 'documents.share', description: 'Share documents', resource: 'documents', action: 'share' },

    // Recipe permissions
    { code: 'recipes.read', description: 'View recipes', resource: 'recipes', action: 'read' },
    { code: 'recipes.create', description: 'Create recipes', resource: 'recipes', action: 'create' },
    { code: 'recipes.update', description: 'Update recipes', resource: 'recipes', action: 'update' },
    { code: 'recipes.delete', description: 'Delete recipes', resource: 'recipes', action: 'delete' },
    { code: 'recipes.share', description: 'Share recipes', resource: 'recipes', action: 'share' },

    // Settings permissions
    { code: 'settings.manage', description: 'Manage settings', resource: 'settings', action: 'manage' },

    // Client permissions
    { code: 'clients.read', description: 'View clients', resource: 'clients', action: 'read' },
    { code: 'clients.create', description: 'Create clients', resource: 'clients', action: 'create' },
    { code: 'clients.update', description: 'Update clients', resource: 'clients', action: 'update' },
    { code: 'clients.delete', description: 'Delete clients', resource: 'clients', action: 'delete' },

    // Quote permissions
    { code: 'quotes.read', description: 'View quotes', resource: 'quotes', action: 'read' },
    { code: 'quotes.create', description: 'Create quotes', resource: 'quotes', action: 'create' },
    { code: 'quotes.update', description: 'Update quotes', resource: 'quotes', action: 'update' },
    { code: 'quotes.delete', description: 'Delete quotes', resource: 'quotes', action: 'delete' },
    { code: 'quotes.send', description: 'Send quotes by email', resource: 'quotes', action: 'send' },
    { code: 'quotes.convert', description: 'Convert quotes to invoices', resource: 'quotes', action: 'convert' },

    // Expense permissions
    { code: 'expenses.read', description: 'View expenses', resource: 'expenses', action: 'read' },
    { code: 'expenses.create', description: 'Create expenses', resource: 'expenses', action: 'create' },
    { code: 'expenses.update', description: 'Update expenses', resource: 'expenses', action: 'update' },
    { code: 'expenses.delete', description: 'Delete expenses', resource: 'expenses', action: 'delete' },

    // Finance permissions
    { code: 'finance.read', description: 'View finance dashboard', resource: 'finance', action: 'read' },

    // Accounting permissions
    { code: 'accounting.read', description: 'View accounting entries', resource: 'accounting', action: 'read' },
    { code: 'accounting.create', description: 'Create accounting entries', resource: 'accounting', action: 'create' },
    { code: 'accounting.update', description: 'Update accounting entries', resource: 'accounting', action: 'update' },
    { code: 'accounting.delete', description: 'Delete accounting entries', resource: 'accounting', action: 'delete' },

    // Portal permissions (PATIENT role)
    { code: 'portal.own_measures', description: 'View own measures', resource: 'portal', action: 'own_measures' },
    { code: 'portal.own_visits', description: 'View own visits', resource: 'portal', action: 'own_visits' },
    { code: 'portal.own_documents', description: 'View own documents', resource: 'portal', action: 'own_documents' },
    { code: 'portal.own_recipes', description: 'View own recipes', resource: 'portal', action: 'own_recipes' },
    { code: 'portal.own_profile', description: 'View and update own profile', resource: 'portal', action: 'own_profile' }
  ];
  const permissions = await db.Permission.bulkCreate(permissionData);

  // Build a permission code to ID map
  const permissionMap = {};
  permissions.forEach(p => {
    permissionMap[p.code] = p.id;
  });

  // Assign all permissions to ADMIN role
  const adminPermissions = permissions.map(p => ({
    role_id: roles[0].id,
    permission_id: p.id
  }));
  await db.RolePermission.bulkCreate(adminPermissions);

  // Assign common permissions to DIETITIAN role
  const dietitianPermissionCodes = [
    'patients.create', 'patients.read', 'patients.update', 'patients.read.all',
    'visits.create', 'visits.read', 'visits.update',
    'billing.create', 'billing.read', 'billing.update',
    'custom_fields.read', 'measures.read', 'measures.create', 'measures.update',
    'email_templates.read', 'billing_templates.read',
    'invoice_customization.read', 'invoice_customization.update',
    'export.patients', 'export.visits', 'export.billing',
    'documents.read', 'documents.upload', 'documents.update', 'documents.delete', 'documents.download', 'documents.share',
    'recipes.read', 'recipes.create', 'recipes.update', 'recipes.delete', 'recipes.share',
    'clients.read', 'clients.create', 'clients.update',
    'quotes.read', 'quotes.create', 'quotes.update', 'quotes.send', 'quotes.convert',
    'expenses.read', 'expenses.create', 'expenses.update',
    'finance.read',
    'accounting.read', 'accounting.create', 'accounting.update'
  ];
  const dietitianPermissions = dietitianPermissionCodes
    .filter(code => permissionMap[code])
    .map(code => ({
      role_id: roles[1].id,
      permission_id: permissionMap[code]
    }));
  await db.RolePermission.bulkCreate(dietitianPermissions);

  // Assign limited permissions to ASSISTANT role
  const assistantPermissionCodes = [
    'patients.read', 'visits.read', 'billing.read',
    'custom_fields.read', 'measures.read', 'email_templates.read', 'billing_templates.read',
    'clients.read', 'quotes.read', 'expenses.read', 'finance.read', 'accounting.read'
  ];
  const assistantPermissions = assistantPermissionCodes
    .filter(code => permissionMap[code])
    .map(code => ({
      role_id: roles[2].id,
      permission_id: permissionMap[code]
    }));
  await db.RolePermission.bulkCreate(assistantPermissions);

  // Assign portal permissions to PATIENT role
  const patientPermissionCodes = [
    'portal.own_measures', 'portal.own_visits', 'portal.own_documents',
    'portal.own_recipes', 'portal.own_profile'
  ];
  const patientPermissions = patientPermissionCodes
    .filter(code => permissionMap[code])
    .map(code => ({
      role_id: roles[3].id,
      permission_id: permissionMap[code]
    }));
  await db.RolePermission.bulkCreate(patientPermissions);

  return { roles, permissions };
}

/**
 * Close the database connection
 */
async function close() {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
    db = null;
  }
}

/**
 * Get the database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return db;
}

/**
 * Get the sequelize instance
 */
function getSequelize() {
  if (!sequelize) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return sequelize;
}

module.exports = {
  init,
  reset,
  seedBaseData,
  close,
  getDb,
  getSequelize
};
