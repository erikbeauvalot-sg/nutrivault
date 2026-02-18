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
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'consultation_templates'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0].count > 0) {
      console.log('Consultation template permissions already exist, skipping');
      return;
    }

    const permissions = [
      { id: uuidv4(), code: 'consultation_templates.read', description: 'View consultation templates and notes', resource: 'consultation_templates', action: 'read', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'consultation_templates.create', description: 'Create consultation templates and notes', resource: 'consultation_templates', action: 'create', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'consultation_templates.update', description: 'Update consultation templates and notes', resource: 'consultation_templates', action: 'update', is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), code: 'consultation_templates.delete', description: 'Delete consultation templates and notes', resource: 'consultation_templates', action: 'delete', is_active: true, created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert('permissions', permissions);
    console.log(`Created ${permissions.length} consultation template permissions`);

    // Role-permission assignments
    const rolePermissions = [];

    // ADMIN: all permissions
    if (adminRole) {
      permissions.forEach(p => {
        rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
      });
    }

    // DIETITIAN: all permissions (they create/manage their own templates)
    if (dietitianRole) {
      permissions.forEach(p => {
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
        SELECT id FROM permissions WHERE resource = 'consultation_templates'
      );
    `);
    await queryInterface.bulkDelete('permissions', { resource: 'consultation_templates' });
    console.log('Removed consultation template permissions and role assignments');
  }
};
