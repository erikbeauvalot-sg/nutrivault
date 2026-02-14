'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'edited_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('messages', 'original_content', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('messages', 'message_type', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'text',
    });
    await queryInterface.addColumn('messages', 'metadata', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('messages', 'deleted_for_patient', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('messages', 'deleted_for_patient');
    await queryInterface.removeColumn('messages', 'metadata');
    await queryInterface.removeColumn('messages', 'message_type');
    await queryInterface.removeColumn('messages', 'original_content');
    await queryInterface.removeColumn('messages', 'edited_at');
  },
};
