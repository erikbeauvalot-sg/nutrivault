'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_note_entries', {
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
      entry_type: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      template_item_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      note_text: {
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

    await queryInterface.addIndex('consultation_note_entries', ['note_id']);
    await queryInterface.addIndex('consultation_note_entries', ['reference_id']);
    await queryInterface.addIndex('consultation_note_entries', ['note_id', 'template_item_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_note_entries');
  }
};
