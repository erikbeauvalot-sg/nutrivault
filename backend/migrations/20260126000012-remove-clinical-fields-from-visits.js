'use strict';

/**
 * Migration: Remove clinical fields from visits table
 * These fields are now managed via custom fields
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove clinical columns from visits table
    // Note: SQLite doesn't support DROP COLUMN directly, so we need to handle this carefully
    const tableInfo = await queryInterface.describeTable('visits');

    const columnsToRemove = ['chief_complaint', 'assessment', 'recommendations', 'notes'];

    for (const column of columnsToRemove) {
      if (tableInfo[column]) {
        try {
          await queryInterface.removeColumn('visits', column);
          console.log(`✅ Removed column: ${column}`);
        } catch (error) {
          // SQLite may not support removeColumn - log and continue
          console.log(`⚠️ Could not remove column ${column}: ${error.message}`);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add clinical columns if rollback is needed
    const tableInfo = await queryInterface.describeTable('visits');

    if (!tableInfo.chief_complaint) {
      await queryInterface.addColumn('visits', 'chief_complaint', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.assessment) {
      await queryInterface.addColumn('visits', 'assessment', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.recommendations) {
      await queryInterface.addColumn('visits', 'recommendations', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.notes) {
      await queryInterface.addColumn('visits', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  }
};
