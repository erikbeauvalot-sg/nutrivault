'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ip_blacklist', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
        comment: 'IPv4 or IPv6 address'
      },
      reason: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      auto_blocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'true = auto-blocked by rate limiter, false = manually added by admin'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      blocked_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      unblocked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      unblocked_by: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'User ID who unblocked this IP'
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

    await queryInterface.addIndex('ip_blacklist', ['ip_address']);
    await queryInterface.addIndex('ip_blacklist', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ip_blacklist');
  }
};
