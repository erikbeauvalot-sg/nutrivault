'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('refresh_tokens');

    if (!tableDesc.user_agent) {
      await queryInterface.addColumn('refresh_tokens', 'user_agent', {
        type: Sequelize.STRING(512),
        allowNull: true,
        defaultValue: null
      });
    }

    if (!tableDesc.ip_address) {
      await queryInterface.addColumn('refresh_tokens', 'ip_address', {
        type: Sequelize.STRING(45),
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('refresh_tokens');

    if (tableDesc.user_agent) {
      await queryInterface.removeColumn('refresh_tokens', 'user_agent');
    }

    if (tableDesc.ip_address) {
      await queryInterface.removeColumn('refresh_tokens', 'ip_address');
    }
  }
};
