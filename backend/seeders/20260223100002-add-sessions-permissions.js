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

    if (!adminRole) {
      throw new Error('ADMIN role not found. Please run role seeders first.');
    }

    // Check if permissions already exist
    const existing = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'sessions'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0].count > 0) {
      console.log('Sessions permissions already exist, skipping');
      return;
    }

    const permissions = [
      { id: uuidv4(), code: 'sessions.read',   description: 'View active sessions and session history',  resource: 'sessions', action: 'read',   is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'sessions.revoke', description: 'Revoke active sessions for any user',        resource: 'sessions', action: 'revoke', is_active: true, created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert('permissions', permissions);
    console.log(`Created ${permissions.length} sessions permissions`);

    // Role-permission assignments: ADMIN only
    const rolePermissions = [];
    permissions.forEach(p => {
      rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
    });

    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'sessions'
      );
    `);
    await queryInterface.bulkDelete('permissions', { resource: 'sessions' });
    console.log('Removed sessions permissions and role assignments');
  }
};
