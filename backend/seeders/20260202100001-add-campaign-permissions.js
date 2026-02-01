/**
 * Seed: Add Campaign Permissions
 *
 * Creates permissions for email campaigns feature and assigns them to appropriate roles
 * Newsletter & Marketing Module
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if campaign permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'campaigns'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermissions[0].count > 0) {
      console.log('ℹ️  Campaign permissions already exist, skipping seed');
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

    // Define campaign permissions
    const campaignPermissions = [
      {
        id: uuidv4(),
        code: 'campaigns.read',
        description: 'View email campaigns and statistics',
        resource: 'campaigns',
        action: 'read',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'campaigns.create',
        description: 'Create email campaigns',
        resource: 'campaigns',
        action: 'create',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'campaigns.update',
        description: 'Edit email campaigns',
        resource: 'campaigns',
        action: 'update',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'campaigns.delete',
        description: 'Delete email campaigns',
        resource: 'campaigns',
        action: 'delete',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'campaigns.send',
        description: 'Send and schedule email campaigns',
        resource: 'campaigns',
        action: 'send',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    // Insert permissions
    await queryInterface.bulkInsert('permissions', campaignPermissions);

    console.log('✅ Created 5 campaign permissions');

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all campaign permissions
    if (adminRole) {
      campaignPermissions.forEach(permission => {
        rolePermissions.push({
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permission.id,
          created_at: now,
          updated_at: now
        });
      });
      console.log('✅ Assigned all campaign permissions to ADMIN');
    }

    // DIETITIAN: read, create, update, send (no delete)
    if (dietitianRole) {
      campaignPermissions
        .filter(p => ['campaigns.read', 'campaigns.create', 'campaigns.update', 'campaigns.send'].includes(p.code))
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: dietitianRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read/create/update/send campaign permissions to DIETITIAN');
    }

    // ASSISTANT: read only
    if (assistantRole) {
      campaignPermissions
        .filter(p => p.code === 'campaigns.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: assistantRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read campaign permission to ASSISTANT');
    }

    // Insert role-permission assignments
    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove role-permission assignments for campaigns
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource = 'campaigns'
      );
    `);

    // Remove campaign permissions
    await queryInterface.bulkDelete('permissions', {
      resource: 'campaigns'
    });

    console.log('✅ Removed campaign permissions and role assignments');
  }
};
