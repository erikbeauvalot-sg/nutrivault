'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = [
      {
        id: uuidv4(),
        name: 'ADMIN',
        description: 'Full system access - can manage all users, patients, and system settings',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'DIETITIAN',
        description: 'Manage assigned patients - can create/edit patients, visits, and billing',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ASSISTANT',
        description: 'Limited access - can view patients and create visits/billing',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'VIEWER',
        description: 'Read-only access - can only view patient data',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('roles', roles);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
