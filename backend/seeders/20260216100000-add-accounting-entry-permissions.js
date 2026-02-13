'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'accounting'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0].count > 0) {
      console.log('Accounting permissions already exist, skipping');
      return;
    }

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

    const allPermissions = [
      { id: uuidv4(), code: 'accounting.read', description: 'View accounting entries', resource: 'accounting', action: 'read', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'accounting.create', description: 'Create accounting entries', resource: 'accounting', action: 'create', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'accounting.update', description: 'Update accounting entries', resource: 'accounting', action: 'update', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'accounting.delete', description: 'Delete accounting entries', resource: 'accounting', action: 'delete', is_active: true, created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('permissions', allPermissions);
    console.log(`Created ${allPermissions.length} accounting permissions`);

    const rolePermissions = [];

    // ADMIN: all permissions
    if (adminRole) {
      allPermissions.forEach(p => {
        rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
      });
    }

    // DIETITIAN: read, create, update (no delete)
    if (dietitianRole) {
      allPermissions
        .filter(p => !p.code.endsWith('.delete'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: dietitianRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    // ASSISTANT: read only
    if (assistantRole) {
      allPermissions
        .filter(p => p.code.endsWith('.read'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: assistantRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`Created ${rolePermissions.length} role-permission assignments for accounting`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource = 'accounting'
      );
    `);

    await queryInterface.bulkDelete('permissions', {
      resource: 'accounting'
    });

    console.log('Removed accounting permissions and role assignments');
  }
};
