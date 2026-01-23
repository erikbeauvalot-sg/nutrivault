'use strict';

/**
 * Migration: Initialize System permissions
 *
 * Creates all system permissions and associates them with the ADMIN role.
 * This migration is idempotent - it can be run multiple times safely.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Define all system permissions
      const PERMISSIONS = [
        // Patients
        { code: 'patients.create', resource: 'patients', action: 'create', description: 'Create new patients' },
        { code: 'patients.read', resource: 'patients', action: 'read', description: 'View patient information' },
        { code: 'patients.update', resource: 'patients', action: 'update', description: 'Update patient information' },
        { code: 'patients.delete', resource: 'patients', action: 'delete', description: 'Delete patients' },

        // Visits
        { code: 'visits.create', resource: 'visits', action: 'create', description: 'Create new visits' },
        { code: 'visits.read', resource: 'visits', action: 'read', description: 'View visit information' },
        { code: 'visits.update', resource: 'visits', action: 'update', description: 'Update visit information' },
        { code: 'visits.delete', resource: 'visits', action: 'delete', description: 'Delete visits' },

        // Users
        { code: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
        { code: 'users.read', resource: 'users', action: 'read', description: 'View user information' },
        { code: 'users.update', resource: 'users', action: 'update', description: 'Update user information' },
        { code: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },

        // Billing
        { code: 'billing.create', resource: 'billing', action: 'create', description: 'Create billing records' },
        { code: 'billing.read', resource: 'billing', action: 'read', description: 'View billing information' },
        { code: 'billing.update', resource: 'billing', action: 'update', description: 'Update billing records' },
        { code: 'billing.delete', resource: 'billing', action: 'delete', description: 'Delete billing records' },

        // Documents
        { code: 'documents.upload', resource: 'documents', action: 'upload', description: 'Upload new documents' },
        { code: 'documents.read', resource: 'documents', action: 'read', description: 'View and list documents' },
        { code: 'documents.download', resource: 'documents', action: 'download', description: 'Download documents' },
        { code: 'documents.update', resource: 'documents', action: 'update', description: 'Update document metadata' },
        { code: 'documents.delete', resource: 'documents', action: 'delete', description: 'Delete documents' },
        { code: 'documents.share', resource: 'documents', action: 'share', description: 'Share documents with others' },

        // Reports
        { code: 'reports.view', resource: 'reports', action: 'view', description: 'View reports' },
        { code: 'reports.export', resource: 'reports', action: 'export', description: 'Export reports' },

        // System
        { code: 'system.settings', resource: 'system', action: 'settings', description: 'Manage system settings' },
        { code: 'system.logs', resource: 'system', action: 'logs', description: 'View system logs' }
      ];

      console.log('🔍 Initializing system permissions...');

      // Get existing permissions to avoid duplicates
      const existingpermissions = await queryInterface.sequelize.query(
        'SELECT code FROM permissions',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      const existingCodes = new Set(existingpermissions.map(p => p.code));

      // Insert new permissions
      const newpermissions = PERMISSIONS.filter(p => !existingCodes.has(p.code));

      if (newpermissions.length > 0) {
        const now = new Date();
        const permissionsToInsert = newpermissions.map(p => ({
          id: Sequelize.literal('(lower(hex(randomblob(16))))'),
          code: p.code,
          resource: p.resource,
          action: p.action,
          description: p.description,
          created_at: now,
          updated_at: now
        }));

        await queryInterface.bulkInsert('permissions', permissionsToInsert, { transaction });
        console.log(`✅ Created ${newpermissions.length} new permissions`);
      } else {
        console.log('ℹ️  All permissions already exist');
      }

      // Find ADMIN role
      const adminroles = await queryInterface.sequelize.query(
        'SELECT id FROM roles WHERE name = :name',
        {
          replacements: { name: 'ADMIN' },
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (adminroles.length > 0) {
        const adminRoleId = adminroles[0].id;
        console.log('🔍 Found ADMIN role, associating permissions...');

        // Get all permissions
        const allPermissions = await queryInterface.sequelize.query(
          'SELECT id, code FROM permissions',
          { type: Sequelize.QueryTypes.SELECT, transaction }
        );

        // Get existing role-permission associations
        const existingRolePermissions = await queryInterface.sequelize.query(
          'SELECT permission_id FROM role_permissions WHERE role_id = :roleId',
          {
            replacements: { roleId: adminRoleId },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        const existingPermissionIds = new Set(existingRolePermissions.map(rp => rp.permission_id));

        // Insert new role-permission associations
        const newRolePermissions = allPermissions
          .filter(p => !existingPermissionIds.has(p.id))
          .map(p => ({
            id: Sequelize.literal('(lower(hex(randomblob(16))))'),
            role_id: adminRoleId,
            permission_id: p.id,
            created_at: new Date(),
            updated_at: new Date()
          }));

        if (newRolePermissions.length > 0) {
          await queryInterface.bulkInsert('role_permissions', newRolePermissions, { transaction });
          console.log(`✅ Associated ${newRolePermissions.length} permissions with ADMIN role`);
        } else {
          console.log('ℹ️  All permissions already associated with ADMIN role');
        }
      } else {
        console.log('⚠️  ADMIN role not found. permissions created but not associated.');
        console.log('   Run create-admin.js script to create the admin user and role.');
      }

      await transaction.commit();
      console.log('✅ System permissions initialized successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error initializing permissions:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Define permission codes to remove
      const permissionCodes = [
        'patients.create', 'patients.read', 'patients.update', 'patients.delete',
        'visits.create', 'visits.read', 'visits.update', 'visits.delete',
        'users.create', 'users.read', 'users.update', 'users.delete',
        'billing.create', 'billing.read', 'billing.update', 'billing.delete',
        'documents.upload', 'documents.read', 'documents.download', 'documents.update', 'documents.delete', 'documents.share',
        'reports.view', 'reports.export',
        'system.settings', 'system.logs'
      ];

      // Delete role-permission associations first
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id IN (
          SELECT id FROM permissions WHERE code IN (:codes)
        )`,
        {
          replacements: { codes: permissionCodes },
          transaction
        }
      );

      // Delete permissions
      await queryInterface.bulkDelete(
        'permissions',
        { code: permissionCodes },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ System permissions removed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing permissions:', error.message);
      throw error;
    }
  }
};
