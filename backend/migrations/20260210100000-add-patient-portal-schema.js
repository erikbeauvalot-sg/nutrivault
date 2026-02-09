'use strict';

/**
 * Migration: Add Patient Portal Schema
 * - Adds PATIENT role
 * - Adds portal columns to patients table (user_id, invitation token, etc.)
 * - Creates portal permissions and assigns them to PATIENT role
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add PATIENT role
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'PATIENT'`
    );

    let patientRoleId;
    if (roles.length === 0) {
      patientRoleId = require('crypto').randomUUID();
      await queryInterface.bulkInsert('roles', [{
        id: patientRoleId,
        name: 'PATIENT',
        description: 'Patient portal access - read-only access to own data',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    } else {
      patientRoleId = roles[0].id;
    }

    // 2. Add portal columns to patients table
    // Note: Cannot use queryInterface.describeTable('patients') because of
    // expression-based index (patients_email_lower) that crashes Sequelize 6.x on SQLite.
    // Using raw PRAGMA TABLE_INFO instead.
    const columnsResult = await queryInterface.sequelize.query(
      `PRAGMA TABLE_INFO(patients)`,
      { type: queryInterface.sequelize.constructor.QueryTypes.SELECT }
    );
    const columnNames = columnsResult.map(c => c.name);

    if (!columnNames.includes('user_id')) {
      await queryInterface.addColumn('patients', 'user_id', {
        type: Sequelize.UUID,
        allowNull: true
      });
    }

    if (!columnNames.includes('portal_invitation_token')) {
      await queryInterface.addColumn('patients', 'portal_invitation_token', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!columnNames.includes('portal_invitation_expires_at')) {
      await queryInterface.addColumn('patients', 'portal_invitation_expires_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!columnNames.includes('portal_activated_at')) {
      await queryInterface.addColumn('patients', 'portal_activated_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // 3. Add indexes (unique constraints enforced at index level)
    try {
      await queryInterface.addIndex('patients', ['user_id'], {
        unique: true,
        name: 'patients_user_id_unique'
      });
    } catch (e) {
      // Index may already exist
    }

    try {
      await queryInterface.addIndex('patients', ['portal_invitation_token'], {
        unique: true,
        name: 'patients_portal_invitation_token_unique'
      });
    } catch (e) {
      // Index may already exist
    }

    // 4. Create portal permissions
    const portalPermissions = [
      { code: 'portal.own_measures', resource: 'portal', action: 'own_measures', description: 'View own measures via portal' },
      { code: 'portal.own_visits', resource: 'portal', action: 'own_visits', description: 'View own visit history via portal' },
      { code: 'portal.own_documents', resource: 'portal', action: 'own_documents', description: 'View own shared documents via portal' },
      { code: 'portal.own_recipes', resource: 'portal', action: 'own_recipes', description: 'View own shared recipes via portal' },
      { code: 'portal.own_profile', resource: 'portal', action: 'own_profile', description: 'View and update own profile via portal' }
    ];

    for (const perm of portalPermissions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE code = '${perm.code}'`
      );

      let permId;
      if (existing.length === 0) {
        permId = require('crypto').randomUUID();
        await queryInterface.bulkInsert('permissions', [{
          id: permId,
          code: perm.code,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      } else {
        permId = existing[0].id;
      }

      // Assign to PATIENT role
      const [existingLink] = await queryInterface.sequelize.query(
        `SELECT id FROM role_permissions WHERE role_id = '${patientRoleId}' AND permission_id = '${permId}'`
      );

      if (existingLink.length === 0) {
        await queryInterface.bulkInsert('role_permissions', [{
          id: require('crypto').randomUUID(),
          role_id: patientRoleId,
          permission_id: permId,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove portal columns
    const columnsResult = await queryInterface.sequelize.query(
      `PRAGMA TABLE_INFO(patients)`,
      { type: queryInterface.sequelize.constructor.QueryTypes.SELECT }
    );
    const columnNames = columnsResult.map(c => c.name);

    if (columnNames.includes('portal_activated_at')) {
      await queryInterface.removeColumn('patients', 'portal_activated_at');
    }
    if (columnNames.includes('portal_invitation_expires_at')) {
      await queryInterface.removeColumn('patients', 'portal_invitation_expires_at');
    }
    if (columnNames.includes('portal_invitation_token')) {
      await queryInterface.removeColumn('patients', 'portal_invitation_token');
    }
    if (columnNames.includes('user_id')) {
      await queryInterface.removeColumn('patients', 'user_id');
    }

    // Remove portal permissions
    const portalCodes = [
      'portal.own_measures', 'portal.own_visits', 'portal.own_documents',
      'portal.own_recipes', 'portal.own_profile'
    ];

    for (const code of portalCodes) {
      const [perms] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE code = '${code}'`
      );
      if (perms.length > 0) {
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id = '${perms[0].id}'`
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE id = '${perms[0].id}'`
        );
      }
    }

    // Remove PATIENT role
    await queryInterface.sequelize.query(
      `DELETE FROM roles WHERE name = 'PATIENT'`
    );
  }
};
