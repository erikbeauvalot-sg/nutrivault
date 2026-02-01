'use strict';

/**
 * Migration: Add sender_id to email_campaigns
 * Allows specifying which dietitian appears as the sender of the campaign
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add sender_id column
    await queryInterface.addColumn('email_campaigns', 'sender_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'The dietitian who appears as the sender of the email'
    });

    // Add index for sender_id
    await queryInterface.addIndex('email_campaigns', ['sender_id'], {
      name: 'email_campaigns_sender_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('email_campaigns', 'email_campaigns_sender_id');
    await queryInterface.removeColumn('email_campaigns', 'sender_id');
  }
};
