'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(email_logs)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('body_html')) {
      await queryInterface.addColumn('email_logs', 'body_html', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'HTML body of the sent email'
      });
    }

    if (!hasColumn('body_text')) {
      await queryInterface.addColumn('email_logs', 'body_text', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Plain text body of the sent email'
      });
    }

    if (!hasColumn('email_type')) {
      await queryInterface.addColumn('email_logs', 'email_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'other',
        comment: 'Type of email: followup, invoice, reminder, welcome, etc.'
      });
    }

    if (!hasColumn('visit_id')) {
      await queryInterface.addColumn('email_logs', 'visit_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'visits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related visit if applicable'
      });
    }

    if (!hasColumn('billing_id')) {
      await queryInterface.addColumn('email_logs', 'billing_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'billing', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Related billing/invoice if applicable'
      });
    }

    // Add indexes (ignore if exist)
    try { await queryInterface.addIndex('email_logs', ['email_type'], { name: 'idx_email_logs_email_type' }); } catch (e) {}
    try { await queryInterface.addIndex('email_logs', ['patient_id', 'email_type', 'sent_at'], { name: 'idx_email_logs_patient_type_date' }); } catch (e) {}
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_patient_type_date').catch(() => {});
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_email_type').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'billing_id').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'visit_id').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'email_type').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'body_text').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'body_html').catch(() => {});
  }
};
