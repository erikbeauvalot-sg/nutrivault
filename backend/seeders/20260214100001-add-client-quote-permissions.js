'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if client permissions already exist
    const existingClientPerms = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'clients'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingClientPerms[0].count > 0) {
      console.log('ℹ️  Client permissions already exist, skipping');
    }

    const existingQuotePerms = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'quotes'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingQuotePerms[0].count > 0) {
      console.log('ℹ️  Quote permissions already exist, skipping');
    }

    if (existingClientPerms[0].count > 0 && existingQuotePerms[0].count > 0) {
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

    // Client permissions
    if (existingClientPerms[0].count === 0) {
      allPermissions.push(
        { id: uuidv4(), code: 'clients.read', description: 'View clients', resource: 'clients', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'clients.create', description: 'Create clients', resource: 'clients', action: 'create', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'clients.update', description: 'Update clients', resource: 'clients', action: 'update', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'clients.delete', description: 'Delete clients', resource: 'clients', action: 'delete', is_active: true, created_at: now, updated_at: now }
      );
    }

    // Quote permissions
    if (existingQuotePerms[0].count === 0) {
      allPermissions.push(
        { id: uuidv4(), code: 'quotes.read', description: 'View quotes', resource: 'quotes', action: 'read', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'quotes.create', description: 'Create quotes', resource: 'quotes', action: 'create', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'quotes.update', description: 'Update quotes', resource: 'quotes', action: 'update', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'quotes.delete', description: 'Delete quotes', resource: 'quotes', action: 'delete', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'quotes.send', description: 'Send quotes by email', resource: 'quotes', action: 'send', is_active: true, created_at: now, updated_at: now },
        { id: uuidv4(), code: 'quotes.convert', description: 'Convert quotes to invoices', resource: 'quotes', action: 'convert', is_active: true, created_at: now, updated_at: now }
      );
    }

    if (allPermissions.length > 0) {
      await queryInterface.bulkInsert('permissions', allPermissions);
      console.log(`✅ Created ${allPermissions.length} client/quote permissions`);
    }

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all permissions
    if (adminRole) {
      allPermissions.forEach(p => {
        rolePermissions.push({ id: uuidv4(), role_id: adminRole.id, permission_id: p.id, created_at: now, updated_at: now });
      });
    }

    // DIETITIAN: read, create, update, send, convert (no delete)
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
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments for clients/quotes`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource IN ('clients', 'quotes')
      );
    `);

    await queryInterface.bulkDelete('permissions', {
      resource: ['clients', 'quotes']
    });

    console.log('✅ Removed client/quote permissions and role assignments');
  }
};
