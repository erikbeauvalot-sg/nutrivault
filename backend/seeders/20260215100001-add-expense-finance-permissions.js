'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if expense permissions already exist
    const existingExpensePerms = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'expenses'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingExpensePerms[0].count > 0) {
      console.log('ℹ️  Expense permissions already exist, skipping');
    }

    const existingFinancePerms = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'finance'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingFinancePerms[0].count > 0) {
      console.log('ℹ️  Finance permissions already exist, skipping');
    }

    if (existingExpensePerms[0].count > 0 && existingFinancePerms[0].count > 0) {
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

    const allPermissions = [];

    // Expense permissions
    if (existingExpensePerms[0].count === 0) {
      allPermissions.push(
        { id: uuidv4(), code: 'expenses.read', description: 'View expenses', resource: 'expenses', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'expenses.create', description: 'Create expenses', resource: 'expenses', action: 'create', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'expenses.update', description: 'Update expenses', resource: 'expenses', action: 'update', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'expenses.delete', description: 'Delete expenses', resource: 'expenses', action: 'delete', is_active: true, created_at: now, updated_at: now }
      );
    }

    // Finance permissions
    if (existingFinancePerms[0].count === 0) {
      allPermissions.push(
        { id: uuidv4(), code: 'finance.read', description: 'View finance dashboard', resource: 'finance', action: 'read', is_active: true, created_at: now, updated_at: now }
      );
    }

    if (allPermissions.length > 0) {
      await queryInterface.bulkInsert('permissions', allPermissions);
      console.log(`✅ Created ${allPermissions.length} expense/finance permissions`);
    }

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all permissions
    if (adminRole) {
      allPermissions.forEach(p => {
        rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
      });
    }

    // DIETITIAN: expenses.read, expenses.create, expenses.update, finance.read (no delete)
    if (dietitianRole) {
      allPermissions
        .filter(p => !p.code.endsWith('.delete'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: dietitianRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    // ASSISTANT: expenses.read, finance.read
    if (assistantRole) {
      allPermissions
        .filter(p => p.code.endsWith('.read'))
        .forEach(p => {
          rolePermissions.push({ id: uuidv4(), role_id: assistantRole.id, permission_id: p.id, created_at: now, updated_at: now });
        });
    }

    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments for expenses/finance`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource IN ('expenses', 'finance')
      );
    `);

    await queryInterface.bulkDelete('permissions', {
      resource: ['expenses', 'finance']
    });

    console.log('✅ Removed expense/finance permissions and role assignments');
  }
};
