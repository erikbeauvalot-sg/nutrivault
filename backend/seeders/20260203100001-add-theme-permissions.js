/**
 * Seed: Add Theme Permissions
 *
 * Creates CRUD + export/import permissions for themes and assigns them to roles
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if theme permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'themes'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermissions[0].count > 0) {
      console.log('ℹ️  Theme permissions already exist, skipping seed');
      return;
    }

    const now = new Date();

    // Get all roles
    const roles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const adminRole = roles.find(r => r.name === 'ADMIN');
    const dietitianRole = roles.find(r => r.name === 'DIETITIAN');
    const assistantRole = roles.find(r => r.name === 'ASSISTANT');

    if (!adminRole) {
      throw new Error('ADMIN role not found. Please run role seeders first.');
    }

    // Define theme permissions
    const themePermissions = [
      {
        id: uuidv4(),
        code: 'themes.read',
        description: 'View themes',
        resource: 'themes',
        action: 'read',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'themes.create',
        description: 'Create themes',
        resource: 'themes',
        action: 'create',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'themes.update',
        description: 'Edit themes',
        resource: 'themes',
        action: 'update',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'themes.delete',
        description: 'Delete themes',
        resource: 'themes',
        action: 'delete',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'themes.export',
        description: 'Export themes',
        resource: 'themes',
        action: 'export',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'themes.import',
        description: 'Import themes',
        resource: 'themes',
        action: 'import',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    // Insert permissions
    await queryInterface.bulkInsert('permissions', themePermissions);
    console.log('✅ Created 6 theme permissions');

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all theme permissions
    if (adminRole) {
      themePermissions.forEach(permission => {
        rolePermissions.push({
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permission.id,
          created_at: now,
          updated_at: now
        });
      });
      console.log('✅ Assigned all theme permissions to ADMIN');
    }

    // DIETITIAN: read only
    if (dietitianRole) {
      themePermissions
        .filter(p => p.code === 'themes.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: dietitianRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read theme permission to DIETITIAN');
    }

    // ASSISTANT: read only
    if (assistantRole) {
      themePermissions
        .filter(p => p.code === 'themes.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: assistantRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read theme permission to ASSISTANT');
    }

    // Insert role-permission assignments
    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove role-permission assignments for themes
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource = 'themes'
      );
    `);

    // Remove theme permissions
    await queryInterface.bulkDelete('permissions', {
      resource: 'themes'
    });

    console.log('✅ Removed theme permissions and role assignments');
  }
};
