'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_shares', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      shared_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User who shared the document'
      },
      sent_via: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'email',
        comment: 'Delivery method: email, portal, etc.'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the document was sent'
      },
      viewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the patient viewed the document (if tracked)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional notes about why this was shared'
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

    // Add indexes for common queries
    await queryInterface.addIndex('document_shares', ['document_id']);
    await queryInterface.addIndex('document_shares', ['patient_id']);
    await queryInterface.addIndex('document_shares', ['shared_by']);
    await queryInterface.addIndex('document_shares', ['sent_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('document_shares');
  }
};
