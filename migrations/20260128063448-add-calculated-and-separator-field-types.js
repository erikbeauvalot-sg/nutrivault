'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // For PostgreSQL: Add 'calculated' and 'separator' to the field_type ENUM
    // For SQLite: No action needed as it doesn't enforce ENUM constraints

    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      try {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_custom_field_definitions_field_type"
          ADD VALUE IF NOT EXISTS 'calculated';
        `);

        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_custom_field_definitions_field_type"
          ADD VALUE IF NOT EXISTS 'separator';
        `);

        console.log('✅ Added calculated and separator field types to PostgreSQL ENUM');
      } catch (error) {
        // If the values already exist, that's fine
        if (error.message.includes('already exists')) {
          console.log('ℹ️  ENUM values already exist, skipping');
        } else {
          throw error;
        }
      }
    } else {
      // For SQLite and other databases, no action needed
      console.log('ℹ️  Skipping ENUM modification for non-PostgreSQL database');
    }
  },

  async down (queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing values from ENUMs
    // In production, you would need to:
    // 1. Create a new ENUM with the desired values
    // 2. Update the column to use the new ENUM
    // 3. Drop the old ENUM
    // For this migration, we'll leave the values in place
    console.log('⚠️  Cannot remove ENUM values in PostgreSQL. Values will remain.');
  }
};
