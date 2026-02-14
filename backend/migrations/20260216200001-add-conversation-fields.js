'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('conversations', 'title', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('conversations', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'open',
    });
    await queryInterface.addColumn('conversations', 'closed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('conversations', 'closed_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('conversations', ['status'], {
      name: 'conversations_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('conversations', 'conversations_status_idx');
    await queryInterface.removeColumn('conversations', 'closed_by');
    await queryInterface.removeColumn('conversations', 'closed_at');
    await queryInterface.removeColumn('conversations', 'status');
    await queryInterface.removeColumn('conversations', 'title');
  },
};
