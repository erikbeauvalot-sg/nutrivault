'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const permissions = [
      // Patient permissions (5)
      { id: uuidv4(), code: 'patients.create', description: 'Create new patients', resource: 'patients', action: 'create', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'patients.read', description: 'View patient information', resource: 'patients', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'patients.update', description: 'Update patient information', resource: 'patients', action: 'update', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'patients.delete', description: 'Delete patients', resource: 'patients', action: 'delete', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'patients.assign', description: 'Assign patients to dietitians', resource: 'patients', action: 'assign', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Visit permissions (5)
      { id: uuidv4(), code: 'visits.create', description: 'Schedule new visits', resource: 'visits', action: 'create', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'visits.read', description: 'View visit details', resource: 'visits', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'visits.update', description: 'Update visit information', resource: 'visits', action: 'update', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'visits.delete', description: 'Delete visits', resource: 'visits', action: 'delete', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'visits.schedule', description: 'Schedule and manage appointments', resource: 'visits', action: 'schedule', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Billing permissions (5)
      { id: uuidv4(), code: 'billing.create', description: 'Create invoices', resource: 'billing', action: 'create', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'billing.read', description: 'View billing records', resource: 'billing', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'billing.update', description: 'Update billing information', resource: 'billing', action: 'update', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'billing.delete', description: 'Delete billing records', resource: 'billing', action: 'delete', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'billing.export', description: 'Export billing reports', resource: 'billing', action: 'export', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // User permissions (5)
      { id: uuidv4(), code: 'users.create', description: 'Create new users', resource: 'users', action: 'create', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'users.read', description: 'View user information', resource: 'users', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'users.update', description: 'Update user information', resource: 'users', action: 'update', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'users.assign_role', description: 'Assign roles to users', resource: 'users', action: 'assign_role', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Document permissions (5)
      { id: uuidv4(), code: 'documents.upload', description: 'Upload documents', resource: 'documents', action: 'upload', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'documents.read', description: 'View documents', resource: 'documents', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'documents.update', description: 'Update document metadata', resource: 'documents', action: 'update', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'documents.delete', description: 'Delete documents', resource: 'documents', action: 'delete', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'documents.download', description: 'Download documents', resource: 'documents', action: 'download', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Audit log permissions (2)
      { id: uuidv4(), code: 'audit_logs.read', description: 'View audit logs', resource: 'audit_logs', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'audit_logs.export', description: 'Export audit logs', resource: 'audit_logs', action: 'export', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Report permissions (4)
      { id: uuidv4(), code: 'reports.patient', description: 'Generate patient reports', resource: 'reports', action: 'patient', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'reports.visit', description: 'Generate visit reports', resource: 'reports', action: 'visit', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'reports.billing', description: 'Generate billing reports', resource: 'reports', action: 'billing', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'reports.financial', description: 'Generate financial reports', resource: 'reports', action: 'financial', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // Export permissions (3)
      { id: uuidv4(), code: 'exports.csv', description: 'Export data to CSV', resource: 'exports', action: 'csv', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'exports.excel', description: 'Export data to Excel', resource: 'exports', action: 'excel', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'exports.pdf', description: 'Export data to PDF', resource: 'exports', action: 'pdf', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // API Key permissions (3)
      { id: uuidv4(), code: 'api_keys.create', description: 'Create API keys', resource: 'api_keys', action: 'create', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'api_keys.read', description: 'View API keys', resource: 'api_keys', action: 'read', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'api_keys.revoke', description: 'Revoke API keys', resource: 'api_keys', action: 'revoke', is_active: true, created_at: new Date(), updated_at: new Date() },
      
      // System permissions (3)
      { id: uuidv4(), code: 'system.settings', description: 'Manage system settings', resource: 'system', action: 'settings', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'system.backup', description: 'Perform system backups', resource: 'system', action: 'backup', is_active: true, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), code: 'system.maintenance', description: 'Perform system maintenance', resource: 'system', action: 'maintenance', is_active: true, created_at: new Date(), updated_at: new Date() }
    ];

    // Check if permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT code FROM permissions',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermissions.length === 0) {
      await queryInterface.bulkInsert('permissions', permissions);
      console.log(`✅ Seeded ${permissions.length} permissions`);
    } else {
      console.log('ℹ️  Permissions already exist, skipping seed');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('permissions', null, {});
  }
};
