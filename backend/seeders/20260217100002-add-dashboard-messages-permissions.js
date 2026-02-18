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

    // ── Dashboard permissions ──────────────────────────────────────
    const existingDashboard = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'dashboard'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    let dashboardPermissions = [];
    if (existingDashboard[0].count == 0) {
      dashboardPermissions = [
        { id: uuidv4(), code: 'dashboard.read', description: 'View dashboard and preferences', resource: 'dashboard', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'dashboard.update', description: 'Update dashboard preferences', resource: 'dashboard', action: 'update', is_active: true, created_at: now, updated_at: now },
      ];
      await queryInterface.bulkInsert('permissions', dashboardPermissions);
      console.log(`Created ${dashboardPermissions.length} dashboard permissions`);
    } else {
      console.log('Dashboard permissions already exist, skipping');
    }

    // ── Messages permissions ───────────────────────────────────────
    const existingMessages = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'messages'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    let messagesPermissions = [];
    if (existingMessages[0].count == 0) {
      messagesPermissions = [
        { id: uuidv4(), code: 'messages.read', description: 'View conversations and messages', resource: 'messages', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'messages.create', description: 'Create conversations and send messages', resource: 'messages', action: 'create', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'messages.update', description: 'Update conversations and edit messages', resource: 'messages', action: 'update', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'messages.delete', description: 'Delete conversations and messages', resource: 'messages', action: 'delete', is_active: true, created_at: now, updated_at: now },
      ];
      await queryInterface.bulkInsert('permissions', messagesPermissions);
      console.log(`Created ${messagesPermissions.length} messages permissions`);
    } else {
      console.log('Messages permissions already exist, skipping');
    }

    // ── Tasks permissions ──────────────────────────────────────────
    const existingTasks = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'tasks'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    let tasksPermissions = [];
    if (existingTasks[0].count == 0) {
      tasksPermissions = [
        { id: uuidv4(), code: 'tasks.read', description: 'View tasks', resource: 'tasks', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'tasks.create', description: 'Create tasks', resource: 'tasks', action: 'create', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'tasks.update', description: 'Update and complete tasks', resource: 'tasks', action: 'update', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'tasks.delete', description: 'Delete tasks', resource: 'tasks', action: 'delete', is_active: true, created_at: now, updated_at: now },
      ];
      await queryInterface.bulkInsert('permissions', tasksPermissions);
      console.log(`Created ${tasksPermissions.length} tasks permissions`);
    } else {
      console.log('Tasks permissions already exist, skipping');
    }

    // ── Role-permission assignments ────────────────────────────────
    const allPermissions = [...dashboardPermissions, ...messagesPermissions, ...tasksPermissions];

    if (allPermissions.length === 0) {
      console.log('No new permissions to assign');
      return;
    }

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
      console.log(`Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    const resources = ['dashboard', 'messages', 'tasks'];

    for (const resource of resources) {
      await queryInterface.sequelize.query(`
        DELETE FROM role_permissions
        WHERE permission_id IN (
          SELECT id FROM permissions WHERE resource = '${resource}'
        );
      `);
      await queryInterface.bulkDelete('permissions', { resource });
    }

    console.log('Removed dashboard, messages, and tasks permissions and role assignments');
  }
};
