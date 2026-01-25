'use strict';

/**
 * Migration: Create email_logs table
 * Central logging for all email communications (followups, reminders, invoices, etc.)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tables = await queryInterface.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='email_logs'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      console.log('Table email_logs already exists, skipping');
      return;
    }

    await queryInterface.createTable('email_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to email template used'
      },
      template_slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Template identifier slug'
      },
      sent_to: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address of recipient'
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related patient'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Email subject line'
      },
      variables_used: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Template variables used in this email'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'sent',
        comment: 'Email status: sent, failed, queued'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if failed'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when email was sent'
      },
      sent_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who triggered the email'
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

    // Add indexes
    await queryInterface.addIndex('email_logs', ['patient_id'], {
      name: 'idx_email_logs_patient'
    });
    await queryInterface.addIndex('email_logs', ['sent_at'], {
      name: 'idx_email_logs_sent_at'
    });
    await queryInterface.addIndex('email_logs', ['template_slug'], {
      name: 'idx_email_logs_template'
    });

    console.log('✅ Created email_logs table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_logs');
  }
};
