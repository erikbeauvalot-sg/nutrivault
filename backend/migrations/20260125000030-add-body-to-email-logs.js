'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add body_html column to store email content
    await queryInterface.addColumn('email_logs', 'body_html', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'HTML body of the sent email'
    });

    // Add body_text column for plain text version
    await queryInterface.addColumn('email_logs', 'body_text', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Plain text body of the sent email'
    });

    // Add email_type column for categorization (followup, invoice, reminder, etc.)
    await queryInterface.addColumn('email_logs', 'email_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'other',
      comment: 'Type of email: followup, invoice, reminder, welcome, etc.'
    });

    // Add related entity references
    await queryInterface.addColumn('email_logs', 'visit_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'visits',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Related visit if applicable'
    });

    await queryInterface.addColumn('email_logs', 'billing_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'billing',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Related billing/invoice if applicable'
    });

    // Add index for email_type
    await queryInterface.addIndex('email_logs', ['email_type'], {
      name: 'idx_email_logs_email_type'
    });

    // Add composite index for patient filtering
    await queryInterface.addIndex('email_logs', ['patient_id', 'email_type', 'sent_at'], {
      name: 'idx_email_logs_patient_type_date'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_patient_type_date');
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_email_type');
    await queryInterface.removeColumn('email_logs', 'billing_id');
    await queryInterface.removeColumn('email_logs', 'visit_id');
    await queryInterface.removeColumn('email_logs', 'email_type');
    await queryInterface.removeColumn('email_logs', 'body_text');
    await queryInterface.removeColumn('email_logs', 'body_html');
  }
};
