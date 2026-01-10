'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all roles and permissions
    const roles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const permissions = await queryInterface.sequelize.query(
      'SELECT id, code FROM permissions',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Check if role_permissions already exist
    const existing = await queryInterface.sequelize.query(
      'SELECT * FROM role_permissions LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      console.log('ℹ️  Role permissions already exist, skipping seed');
      return;
    }

    const rolePermissions = [];
    const now = new Date();

    // Find role IDs
    const adminRole = roles.find(r => r.name === 'ADMIN');
    const dietitianRole = roles.find(r => r.name === 'DIETITIAN');
    const assistantRole = roles.find(r => r.name === 'ASSISTANT');
    const viewerRole = roles.find(r => r.name === 'VIEWER');

    // ADMIN: All 40 permissions
    if (adminRole) {
      permissions.forEach(permission => {
        rolePermissions.push({
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permission.id,
          created_at: now,
          updated_at: now
        });
      });
    }

    // DIETITIAN: All except system and api_keys (32 permissions for POC - includes user management)
    if (dietitianRole) {
      permissions
        .filter(p => 
          !p.code.startsWith('api_keys.') &&
          !p.code.startsWith('system.')
        )
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: dietitianRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
    }

    // ASSISTANT: Create/read for patients, visits, billing (15 permissions)
    if (assistantRole) {
      permissions
        .filter(p => 
          (p.code.startsWith('patients.') && (p.code.includes('create') || p.code.includes('read'))) ||
          (p.code.startsWith('visits.') && (p.code.includes('create') || p.code.includes('read') || p.code.includes('schedule'))) ||
          (p.code.startsWith('billing.') && (p.code.includes('create') || p.code.includes('read'))) ||
          (p.code.startsWith('documents.') && (p.code.includes('upload') || p.code.includes('read') || p.code.includes('download')))
        )
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: assistantRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
    }

    // VIEWER: Read-only access (10 permissions)
    if (viewerRole) {
      permissions
        .filter(p => 
          p.code.includes('.read') ||
          p.code.includes('.download') ||
          p.code.startsWith('reports.') ||
          p.code.startsWith('audit_logs.read')
        )
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: viewerRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
    }

    await queryInterface.bulkInsert('role_permissions', rolePermissions);
    console.log(`✅ Seeded ${rolePermissions.length} role-permission mappings`);
    console.log(`   - ADMIN: ${permissions.length} permissions (all)`);
    console.log(`   - DIETITIAN: ${rolePermissions.filter(rp => rp.role_id === dietitianRole?.id).length} permissions`);
    console.log(`   - ASSISTANT: ${rolePermissions.filter(rp => rp.role_id === assistantRole?.id).length} permissions`);
    console.log(`   - VIEWER: ${rolePermissions.filter(rp => rp.role_id === viewerRole?.id).length} permissions`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('role_permissions', null, {});
  }
};
