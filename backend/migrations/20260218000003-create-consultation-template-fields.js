'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_template_fields', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      section_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consultation_template_sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_label: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      field_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'text'
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
      help_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      default_value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      select_options: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      validation_rules: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      scale_min: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      scale_max: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      scale_labels: {
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

    await queryInterface.addIndex('consultation_template_fields', ['section_id'], {
      name: 'idx_consultation_fields_section'
    });
    await queryInterface.addIndex('consultation_template_fields', ['section_id', 'display_order'], {
      name: 'idx_consultation_fields_order'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_template_fields');
  }
};
