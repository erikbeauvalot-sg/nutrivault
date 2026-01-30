'use strict';

/**
 * Migration: Create Visit Types Table
 *
 * Stores predefined visit types that can be associated with
 * custom field categories for contextual display.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visit_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique visit type name'
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Optional description of the visit type'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for display in lists'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this visit type is active'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Optional color for UI display (hex format)'
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

    // Create indexes (name index is automatically created by UNIQUE constraint)
    await queryInterface.addIndex('visit_types', ['is_active', 'display_order'], {
      name: 'visit_types_active_order'
    });

    console.log('✅ Visit types table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visit_types');
    console.log('✅ Visit types table dropped successfully');
  }
};
