/**
 * Seed: Add Recipe Permissions
 *
 * Creates permissions for recipes feature and assigns them to appropriate roles
 * Recipe Management Module - Phase 1
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if recipe permissions already exist
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM permissions WHERE resource = 'recipes'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPermissions[0].count > 0) {
      console.log('ℹ️  Recipe permissions already exist, skipping seed');
      return;
    }

    const now = new Date();

    // Get all roles
    const roles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles;',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const adminRole = roles.find(r => r.name === 'ADMIN');
    const dietitianRole = roles.find(r => r.name === 'DIETITIAN');
    const assistantRole = roles.find(r => r.name === 'ASSISTANT');
    const viewerRole = roles.find(r => r.name === 'VIEWER');

    if (!adminRole) {
      throw new Error('ADMIN role not found. Please run role seeders first.');
    }

    // Define recipe permissions
    const recipePermissions = [
      {
        id: uuidv4(),
        code: 'recipes.read',
        description: 'View recipes and recipe categories',
        resource: 'recipes',
        action: 'read',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'recipes.create',
        description: 'Create recipes and recipe categories',
        resource: 'recipes',
        action: 'create',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'recipes.update',
        description: 'Update recipes and recipe categories',
        resource: 'recipes',
        action: 'update',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'recipes.delete',
        description: 'Delete recipes and recipe categories',
        resource: 'recipes',
        action: 'delete',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'recipes.share',
        description: 'Share recipes with patients',
        resource: 'recipes',
        action: 'share',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    // Insert permissions
    await queryInterface.bulkInsert('permissions', recipePermissions);

    console.log('✅ Created 5 recipe permissions');

    // Assign permissions to roles
    const rolePermissions = [];

    // ADMIN: all recipe permissions
    if (adminRole) {
      recipePermissions.forEach(permission => {
        rolePermissions.push({
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permission.id,
          created_at: now,
          updated_at: now
        });
      });
      console.log('✅ Assigned all recipe permissions to ADMIN');
    }

    // DIETITIAN: read, create, update, share (no delete)
    if (dietitianRole) {
      recipePermissions
        .filter(p => ['recipes.read', 'recipes.create', 'recipes.update', 'recipes.share'].includes(p.code))
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: dietitianRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read/create/update/share recipe permissions to DIETITIAN');
    }

    // ASSISTANT: read only
    if (assistantRole) {
      recipePermissions
        .filter(p => p.code === 'recipes.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: assistantRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read recipe permission to ASSISTANT');
    }

    // VIEWER: read only
    if (viewerRole) {
      recipePermissions
        .filter(p => p.code === 'recipes.read')
        .forEach(permission => {
          rolePermissions.push({
            id: uuidv4(),
            role_id: viewerRole.id,
            permission_id: permission.id,
            created_at: now,
            updated_at: now
          });
        });
      console.log('✅ Assigned read recipe permission to VIEWER');
    }

    // Insert role-permission assignments
    if (rolePermissions.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissions);
      console.log(`✅ Created ${rolePermissions.length} role-permission assignments`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove role-permission assignments for recipes
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE resource = 'recipes'
      );
    `);

    // Remove recipe permissions
    await queryInterface.bulkDelete('permissions', {
      resource: 'recipes'
    });

    console.log('✅ Removed recipe permissions and role assignments');
  }
};
