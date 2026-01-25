'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create billing_templates table
    await queryInterface.createTable('billing_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Template name (e.g., "Consultation Initiale")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Template description and usage notes'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default template (only one can be default)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether template is active and available for use'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who created this template'
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

    // Add indexes for performance
    await queryInterface.addIndex('billing_templates', ['is_active'], {
      name: 'idx_billing_templates_active',
      comment: 'Filter active templates'
    });

    await queryInterface.addIndex('billing_templates', ['is_default'], {
      name: 'idx_billing_templates_default',
      comment: 'Find default template quickly'
    });

    await queryInterface.addIndex('billing_templates', ['created_by'], {
      name: 'idx_billing_templates_creator',
      comment: 'Find templates by creator'
    });

    await queryInterface.addIndex('billing_templates', ['name'], {
      name: 'idx_billing_templates_name',
      comment: 'Search templates by name'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('billing_templates');
  }
};
