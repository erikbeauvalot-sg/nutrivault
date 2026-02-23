'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

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

    // Check if permissions already exist
    const existing = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'custom_fields'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0].count > 0) {
      console.log('Custom fields permissions already exist, skipping');
      return;
    }

    const permissions = [
      { id: uuidv4(), code: 'custom_fields.read', description: 'View custom field categories and definitions', resource: 'custom_fields', action: 'read', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'custom_fields.create', description: 'Create custom field categories and definitions', resource: 'custom_fields', action: 'create', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'custom_fields.update', description: 'Update custom field categories and definitions', resource: 'custom_fields', action: 'update', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'custom_fields.delete', description: 'Delete custom field categories and definitions', resource: 'custom_fields', action: 'delete', is_active: true, created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert('permissions', permissions);
    console.log(`Created ${permissions.length} custom fields permissions`);

    // Role-permission assignments
    const rolePermissions = [];

    // ADMIN: all permissions
    if (adminRole) {
      permissions.forEach(p => {
        rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
      });
    }

    // DIETITIAN: read only
    if (dietitianRole) {
      permissions
        .filter(p => p.code.endsWith('.read'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: dietitianRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    // ASSISTANT: read only
    if (assistantRole) {
      permissions
        .filter(p => p.code.endsWith('.read'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: assistantRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'custom_fields'
      );
    `);
    await queryInterface.bulkDelete('permissions', { resource: 'custom_fields' });
    console.log('Removed custom fields permissions and role assignments');
  }
};
