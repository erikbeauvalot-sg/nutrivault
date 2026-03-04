'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Check if permissions already exist
    const existing = await queryInterface.sequelize.query(
      "SELECT code FROM permissions WHERE code LIKE 'meal_plans%'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCodes = existing.map(r => r.code);

    // Create missing permissions
    const permissionsToCreate = [
      { code: 'meal_plans.read',   description: 'View meal plans',   resource: 'meal_plans', action: 'read' },
      { code: 'meal_plans.create', description: 'Create meal plans', resource: 'meal_plans', action: 'create' },
      { code: 'meal_plans.update', description: 'Update meal plans', resource: 'meal_plans', action: 'update' },
      { code: 'meal_plans.delete', description: 'Delete meal plans', resource: 'meal_plans', action: 'delete' },
    ].filter(p => !existingCodes.includes(p.code));

    if (permissionsToCreate.length > 0) {
      await queryInterface.bulkInsert('permissions', permissionsToCreate.map(p => ({
        id: uuidv4(),
        code: p.code,
        description: p.description,
        resource: p.resource,
        action: p.action,
        is_active: true,
        created_at: now,
        updated_at: now
      })));
    }

    // Fetch all meal_plans permissions
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, code FROM permissions WHERE code LIKE 'meal_plans%'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Fetch roles to assign permissions to
    const roles = await queryInterface.sequelize.query(
      "SELECT id, name FROM roles WHERE name IN ('ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER')",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Check existing role_permissions to avoid duplicates
    const existingRolePerms = await queryInterface.sequelize.query(
      `SELECT role_id, permission_id FROM role_permissions
       WHERE permission_id IN (${permissions.map(() => '?').join(',')})`,
      { replacements: permissions.map(p => p.id), type: Sequelize.QueryTypes.SELECT }
    );
    const existingSet = new Set(existingRolePerms.map(r => `${r.role_id}:${r.permission_id}`));

    const rows = [];
    for (const role of roles) {
      for (const perm of permissions) {
        // VIEWER only gets read
        if (role.name === 'VIEWER' && perm.code !== 'meal_plans.read') continue;

        const key = `${role.id}:${perm.id}`;
        if (!existingSet.has(key)) {
          rows.push({
            id: uuidv4(),
            role_id: role.id,
            permission_id: perm.id,
            created_at: now,
            updated_at: now
          });
        }
      }
    }

    if (rows.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rows);
    }
  },

  async down(queryInterface, Sequelize) {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE code LIKE 'meal_plans%'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (permissions.length > 0) {
      const ids = permissions.map(p => p.id);
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id IN (${ids.map(() => '?').join(',')})`,
        { replacements: ids }
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE code LIKE 'meal_plans%'`
      );
    }
  }
};
