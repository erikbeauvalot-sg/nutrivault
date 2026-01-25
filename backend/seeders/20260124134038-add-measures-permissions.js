/**
 * Seed: Add Measures Permissions
 *
 * Creates permissions for measures feature and assigns them to appropriate roles
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if measures permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'measures'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermissions[0].count > 0) {
      console.log('ℹ️  Measures permissions already exist, skipping seed');
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
    const viewerRole = roles.find(r => r.name === 'VIEWER');

    if (!adminRole) {
      throw new Error('ADMIN role not found. Please run role seeders first.');
    }

    // Define measures permissions
    const measuresPermissions = [
      {
        id: uuidv4(),
        code: 'measures.read',
        description: 'View measure definitions and patient measures',
        resource: 'measures',
        action: 'read',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'measures.create',
        description: 'Create measure definitions and log patient measures',
        resource: 'measures',
        action: 'create',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'measures.update',
        description: 'Update measure definitions and patient measures',
        resource: 'measures',
        action: 'update',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'measures.delete',
        description: 'Delete measure definitions and patient measures',
        resource: 'measures',
        action: 'delete',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    // Insert permissions
    await queryInterface.bulkInsert('permissions', measuresPermissions);

    console.log('✅ Created 4 measures permissions');

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all measures permissions
    if (adminRole) {
      measuresPermissions.forEach(permission => {
        rolePermissions.push({
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permission.id,
          created_at: now,
          updated_at: now
        });
      });
      console.log('✅ Assigned all measures permissions to ADMIN');
    }

    // DIETITIAN: read, create, update (no delete)
    if (dietitianRole) {
      measuresPermissions
        .filter(p => ['measures.read', 'measures.create', 'measures.update'].includes(p.code))
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: dietitianRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read/create/update measures permissions to DIETITIAN');
    }

    // ASSISTANT: read, create
    if (assistantRole) {
      measuresPermissions
        .filter(p => ['measures.read', 'measures.create'].includes(p.code))
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: assistantRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read/create measures permissions to ASSISTANT');
    }

    // VIEWER: read only
    if (viewerRole) {
      measuresPermissions
        .filter(p => p.code === 'measures.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: viewerRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read measures permission to VIEWER');
    }

    // Insert role-permission assignments
    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove role-permission assignments for measures
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource = 'measures'
      );
    `);

    // Remove measures permissions
    await queryInterface.bulkDelete('permissions', {
      resource: 'measures'
    });

    console.log('✅ Removed measures permissions and role assignments');
  }
};
