'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = [
      {
        id: uuidv4(),
        name: 'ADMIN',
        description: 'System administrator with full access to all features',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'DIETITIAN',
        description: 'Licensed dietitian with access to patient management and clinical features',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ASSISTANT',
        description: 'Administrative assistant with limited access to patient data',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'VIEWER',
        description: 'Read-only access for auditors and observers',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Check if roles already exist to avoid duplicates
    const existingRoles = await queryInterface.sequelize.query(
      'SELECT name FROM roles',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingRoles.length === 0) {
      await queryInterface.bulkInsert('roles', roles);
      console.log('✅ Seeded 4 roles: ADMIN, DIETITIAN, ASSISTANT, VIEWER');
    } else {
      console.log('ℹ️  Roles already exist, skipping seed');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
