'use strict';

/**
 * Migration: Add missing columns to email_logs table
 * The model was updated with email_type, visit_id, billing_id, body_html, body_text
 * but no migration was created for them.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.sequelize.query(
      "PRAGMA TABLE_INFO('email_logs')",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingColumns = tableInfo.map(col => col.name);

    if (!existingColumns.includes('email_type')) {
      await queryInterface.addColumn('email_logs', 'email_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'other'
      });
      console.log('  Added email_type column');
    }

    if (!existingColumns.includes('visit_id')) {
      await queryInterface.addColumn('email_logs', 'visit_id', {
        type: Sequelize.UUID,
        allowNull: true
      });
      console.log('  Added visit_id column');
    }

    if (!existingColumns.includes('billing_id')) {
      await queryInterface.addColumn('email_logs', 'billing_id', {
        type: Sequelize.UUID,
        allowNull: true
      });
      console.log('  Added billing_id column');
    }

    if (!existingColumns.includes('body_html')) {
      await queryInterface.addColumn('email_logs', 'body_html', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('  Added body_html column');
    }

    if (!existingColumns.includes('body_text')) {
      await queryInterface.addColumn('email_logs', 'body_text', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('  Added body_text column');
    }

    console.log('✅ email_logs table columns updated');
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('email_logs', 'email_type').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'visit_id').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'billing_id').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'body_html').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'body_text').catch(() => {});
  }
};
