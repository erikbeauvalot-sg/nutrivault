'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('roles', ['name']);

    // Create default roles immediately (needed for permission associations)
    const now = new Date();
    await queryInterface.bulkInsert('roles', [
      {
        id: uuidv4(),
        name: 'ADMIN',
        description: 'Full system access - can manage users, settings, and all data',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'DIETITIAN',
        description: 'Clinical access - can manage patients, visits, and billing',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'ASSISTANT',
        description: 'Limited access - can view patients and manage appointments',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'VIEWER',
        description: 'Read-only access - can view data but not modify',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('✅ Created 4 default roles: ADMIN, DIETITIAN, ASSISTANT, VIEWER');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('roles');
  }
};
