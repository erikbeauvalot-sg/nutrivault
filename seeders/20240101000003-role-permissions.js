'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all roles and permissions
    const roles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const permissions = await queryInterface.sequelize.query(
      'SELECT id, name FROM permissions;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create permission maps
    const permissionMap = {};
    permissions.forEach(p => {
      permissionMap[p.name] = p.id;
    });

    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.name] = r.id;
    });

    // Define role-permission mappings
    const rolePermissions = [];

    // ADMIN - all permissions
    const adminPermissions = permissions.map(p => ({
      role_id: roleMap['ADMIN'],
      permission_id: p.id,
      created_at: new Date()
    }));
    rolePermissions.push(...adminPermissions);

    // DIETITIAN - manage patients, visits, and billing
    const dietitianPermissionNames = [
      'patients.create', 'patients.read', 'patients.update', 'patients.list',
      'visits.create', 'visits.read', 'visits.update', 'visits.delete', 'visits.list',
      'billing.create', 'billing.read', 'billing.update', 'billing.list',
      'users.read',
      'api_keys.create', 'api_keys.read', 'api_keys.delete',
      'reports.read', 'reports.patients', 'reports.visits', 'reports.billing', 'reports.overview',
      'documents.upload', 'documents.read', 'documents.update', 'documents.delete'
    ];
    dietitianPermissionNames.forEach(name => {
      if (permissionMap[name]) {
        rolePermissions.push({
          role_id: roleMap['DIETITIAN'],
          permission_id: permissionMap[name],
          created_at: new Date()
        });
      }
    });

    // ASSISTANT - create visits/billing, limited patient access
    const assistantPermissionNames = [
      'patients.read', 'patients.list',
      'visits.create', 'visits.read', 'visits.update', 'visits.list',
      'billing.create', 'billing.read', 'billing.list',
      'users.read',
      'documents.upload', 'documents.read'
    ];
    assistantPermissionNames.forEach(name => {
      if (permissionMap[name]) {
        rolePermissions.push({
          role_id: roleMap['ASSISTANT'],
          permission_id: permissionMap[name],
          created_at: new Date()
        });
      }
    });

    // VIEWER - read-only access
    const viewerPermissionNames = [
      'patients.read', 'patients.list',
      'visits.read', 'visits.list',
      'billing.read', 'billing.list',
      'users.read',
      'documents.read'
    ];
    viewerPermissionNames.forEach(name => {
      if (permissionMap[name]) {
        rolePermissions.push({
          role_id: roleMap['VIEWER'],
          permission_id: permissionMap[name],
          created_at: new Date()
        });
      }
    });

    await queryInterface.bulkInsert('role_permissions', rolePermissions);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('role_permissions', null, {});
  }
};
