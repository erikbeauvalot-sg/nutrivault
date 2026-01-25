'use strict';

/**
 * Migration: Remove clinical fields from visits table
 * These fields are now managed via custom fields
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // Helper function to check if column exists (works for both PostgreSQL and SQLite)
    const columnExists = async (tableName, columnName) => {
      try {
        if (dialect === 'postgres') {
          const [results] = await queryInterface.sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}' AND column_name = '${columnName}'
          `);
          return results.length > 0;
        } else {
          // SQLite
          const [results] = await queryInterface.sequelize.query(`PRAGMA table_info(${tableName})`);
          return results.some(col => col.name === columnName);
        }
      } catch (error) {
        console.log(`Error checking column ${columnName}: ${error.message}`);
        return false;
      }
    };

    const columnsToRemove = ['chief_complaint', 'assessment', 'recommendations', 'notes'];

    for (const column of columnsToRemove) {
      const exists = await columnExists('visits', column);
      if (exists) {
        try {
          await queryInterface.removeColumn('visits', column);
          console.log(`✅ Removed column: ${column}`);
        } catch (error) {
          console.log(`⚠️ Could not remove column ${column}: ${error.message}`);
        }
      } else {
        console.log(`Column ${column} does not exist, skipping`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        if (dialect === 'postgres') {
          const [results] = await queryInterface.sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}' AND column_name = '${columnName}'
          `);
          return results.length > 0;
        } else {
          const [results] = await queryInterface.sequelize.query(`PRAGMA table_info(${tableName})`);
          return results.some(col => col.name === columnName);
        }
      } catch (error) {
        return false;
      }
    };

    if (!(await columnExists('visits', 'chief_complaint'))) {
      await queryInterface.addColumn('visits', 'chief_complaint', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!(await columnExists('visits', 'assessment'))) {
      await queryInterface.addColumn('visits', 'assessment', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!(await columnExists('visits', 'recommendations'))) {
      await queryInterface.addColumn('visits', 'recommendations', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!(await columnExists('visits', 'notes'))) {
      await queryInterface.addColumn('visits', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  }
};
