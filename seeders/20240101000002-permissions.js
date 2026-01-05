'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const permissions = [
      // Patient permissions
      { name: 'patients.create', resource: 'patients', action: 'create', description: 'Create new patients' },
      { name: 'patients.read', resource: 'patients', action: 'read', description: 'View patient information' },
      { name: 'patients.update', resource: 'patients', action: 'update', description: 'Update patient information' },
      { name: 'patients.delete', resource: 'patients', action: 'delete', description: 'Delete/deactivate patients' },
      { name: 'patients.list', resource: 'patients', action: 'list', description: 'List all patients' },

      // Visit permissions
      { name: 'visits.create', resource: 'visits', action: 'create', description: 'Create new visits' },
      { name: 'visits.read', resource: 'visits', action: 'read', description: 'View visit information' },
      { name: 'visits.update', resource: 'visits', action: 'update', description: 'Update visit information' },
      { name: 'visits.delete', resource: 'visits', action: 'delete', description: 'Delete visits' },
      { name: 'visits.list', resource: 'visits', action: 'list', description: 'List all visits' },

      // Billing permissions
      { name: 'billing.create', resource: 'billing', action: 'create', description: 'Create invoices' },
      { name: 'billing.read', resource: 'billing', action: 'read', description: 'View billing information' },
      { name: 'billing.update', resource: 'billing', action: 'update', description: 'Update invoices' },
      { name: 'billing.delete', resource: 'billing', action: 'delete', description: 'Delete invoices' },
      { name: 'billing.list', resource: 'billing', action: 'list', description: 'List all invoices' },

      // User permissions
      { name: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
      { name: 'users.read', resource: 'users', action: 'read', description: 'View user information' },
      { name: 'users.update', resource: 'users', action: 'update', description: 'Update user information' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete/deactivate users' },
      { name: 'users.list', resource: 'users', action: 'list', description: 'List all users' },
      { name: 'users.manage', resource: 'users', action: 'manage', description: 'Full user management' },

      // Role permissions
      { name: 'roles.read', resource: 'roles', action: 'read', description: 'View roles' },
      { name: 'roles.manage', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },

      // Audit log permissions
      { name: 'audit_logs.read', resource: 'audit_logs', action: 'read', description: 'View audit logs' },
      { name: 'audit_logs.list', resource: 'audit_logs', action: 'list', description: 'List audit logs' },

      // API key permissions
      { name: 'api_keys.create', resource: 'api_keys', action: 'create', description: 'Create API keys' },
      { name: 'api_keys.read', resource: 'api_keys', action: 'read', description: 'View API keys' },
      { name: 'api_keys.delete', resource: 'api_keys', action: 'delete', description: 'Delete API keys' },

      // Report permissions
      { name: 'reports.read', resource: 'reports', action: 'read', description: 'View reports and analytics' },
      { name: 'reports.patients', resource: 'reports', action: 'patients', description: 'View patient statistics report' },
      { name: 'reports.visits', resource: 'reports', action: 'visits', description: 'View visit analytics report' },
      { name: 'reports.billing', resource: 'reports', action: 'billing', description: 'View billing report' },
      { name: 'reports.overview', resource: 'reports', action: 'overview', description: 'View practice overview dashboard' },

      // Document permissions
      { name: 'documents.upload', resource: 'documents', action: 'upload', description: 'Upload documents/files' },
      { name: 'documents.read', resource: 'documents', action: 'read', description: 'View and download documents' },
      { name: 'documents.update', resource: 'documents', action: 'update', description: 'Update document metadata' },
      { name: 'documents.delete', resource: 'documents', action: 'delete', description: 'Delete documents' },

      // Export permissions
      { name: 'export.patients', resource: 'export', action: 'patients', description: 'Export patient data to CSV/Excel/PDF' },
      { name: 'export.visits', resource: 'export', action: 'visits', description: 'Export visit data to CSV/Excel/PDF' },
      { name: 'export.billing', resource: 'export', action: 'billing', description: 'Export billing data to CSV/Excel/PDF' }
    ].map(p => ({
      id: uuidv4(),
      ...p,
      created_at: new Date()
    }));

    await queryInterface.bulkInsert('permissions', permissions);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('permissions', null, {});
  }
};
