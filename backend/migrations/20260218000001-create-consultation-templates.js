'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      template_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      visibility: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'private'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true
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

    await queryInterface.addIndex('consultation_templates', ['created_by'], {
      name: 'idx_consultation_templates_creator'
    });
    await queryInterface.addIndex('consultation_templates', ['is_active'], {
      name: 'idx_consultation_templates_active'
    });
    await queryInterface.addIndex('consultation_templates', ['template_type'], {
      name: 'idx_consultation_templates_type'
    });
    await queryInterface.addIndex('consultation_templates', ['visibility'], {
      name: 'idx_consultation_templates_visibility'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_templates');
  }
};
