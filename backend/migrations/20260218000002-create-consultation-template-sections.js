'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_template_sections', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consultation_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      section_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'fields'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      default_content: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('consultation_template_sections', ['template_id'], {
      name: 'idx_consultation_sections_template'
    });
    await queryInterface.addIndex('consultation_template_sections', ['template_id', 'display_order'], {
      name: 'idx_consultation_sections_order'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_template_sections');
  }
};
