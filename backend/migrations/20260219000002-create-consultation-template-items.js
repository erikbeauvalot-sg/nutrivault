'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_template_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'consultation_templates', key: 'id' },
        onDelete: 'CASCADE'
      },
      item_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true
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
      instruction_title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      instruction_content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      layout_override: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('consultation_template_items', ['template_id']);
    await queryInterface.addIndex('consultation_template_items', ['template_id', 'display_order']);
    await queryInterface.addIndex('consultation_template_items', ['reference_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_template_items');
  }
};
