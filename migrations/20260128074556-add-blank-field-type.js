'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // For PostgreSQL: Add 'blank' to the field_type ENUM
    // For SQLite: No action needed as it doesn't enforce ENUM constraints

    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      try {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_custom_field_definitions_field_type"
          ADD VALUE IF NOT EXISTS 'blank';
        `);

        console.log('✅ Added blank field type to PostgreSQL ENUM');
      } catch (error) {
        // If the value already exists, that's fine
        if (error.message.includes('already exists')) {
          console.log('ℹ️  ENUM value already exists, skipping');
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
    // For this migration, we'll leave the value in place
    console.log('⚠️  Cannot remove ENUM values in PostgreSQL. Value will remain.');
  }
};
