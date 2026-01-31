'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Add settings.manage permission
 *
 * Required for visit types management and other settings operations
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if permission already exists
    const existingPermission = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE code = 'settings.manage'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermission.length > 0) {
      console.log('ℹ️  Permission settings.manage already exists, skipping');
      return;
    }

    // Create the permission
    const permissionId = uuidv4();
    await queryInterface.bulkInsert('permissions', [{
      id: permissionId,
      code: 'settings.manage',
      description: 'Manage application settings (visit types, categories, etc.)',
      resource: 'settings',
      action: 'manage',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Created permission: settings.manage');

    // Get ADMIN role ID
    const adminRole = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'ADMIN'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (adminRole.length > 0) {
      // Assign to ADMIN role
      await queryInterface.bulkInsert('role_permissions', [{
        id: uuidv4(),
        role_id: adminRole[0].id,
        permission_id: permissionId,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      console.log('✅ Assigned settings.manage permission to ADMIN role');
    }

    // Get DIETITIAN role ID - they should also be able to manage visit types
    const dietitianRole = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'DIETITIAN'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (dietitianRole.length > 0) {
      // Assign to DIETITIAN role
      await queryInterface.bulkInsert('role_permissions', [{
        id: uuidv4(),
        role_id: dietitianRole[0].id,
        permission_id: permissionId,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      console.log('✅ Assigned settings.manage permission to DIETITIAN role');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Get permission ID
    const permission = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE code = 'settings.manage'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (permission.length > 0) {
      // Remove role_permissions first
      await queryInterface.bulkDelete('role_permissions', {
        permission_id: permission[0].id
      });

      // Remove permission
      await queryInterface.bulkDelete('permissions', {
        code: 'settings.manage'
      });

      console.log('✅ Removed settings.manage permission');
    }
  }
};
