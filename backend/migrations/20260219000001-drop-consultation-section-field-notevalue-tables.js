'use strict';

module.exports = {
  async up(queryInterface) {
    // Drop in FK order: note_values → fields → sections
    await queryInterface.dropTable('consultation_note_values');
    await queryInterface.dropTable('consultation_template_fields');
    await queryInterface.dropTable('consultation_template_sections');
  },

  async down(queryInterface, Sequelize) {
    // Recreate sections
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
        references: { model: 'consultation_templates', key: 'id' },
        onDelete: 'CASCADE'
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      section_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'fields' },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      default_content: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // Recreate fields
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
        references: { model: 'consultation_template_sections', key: 'id' },
        onDelete: 'CASCADE'
      },
      field_label: { type: Sequelize.STRING(200), allowNull: false },
      field_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'text' },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      help_text: { type: Sequelize.TEXT, allowNull: true },
      default_value: { type: Sequelize.TEXT, allowNull: true },
      select_options: { type: Sequelize.TEXT, allowNull: true },
      validation_rules: { type: Sequelize.TEXT, allowNull: true },
      scale_min: { type: Sequelize.INTEGER, allowNull: true },
      scale_max: { type: Sequelize.INTEGER, allowNull: true },
      scale_labels: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // Recreate note values
    await queryInterface.createTable('consultation_note_values', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      note_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'consultation_notes', key: 'id' },
        onDelete: 'CASCADE'
      },
      field_id: { type: Sequelize.UUID, allowNull: true },
      section_id: { type: Sequelize.UUID, allowNull: true },
      value_text: { type: Sequelize.TEXT, allowNull: true },
      value_number: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      value_boolean: { type: Sequelize.BOOLEAN, allowNull: true },
      value_json: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
  }
};
