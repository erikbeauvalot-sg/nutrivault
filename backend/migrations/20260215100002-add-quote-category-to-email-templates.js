'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      // PostgreSQL: add 'quote' to the ENUM type
      await queryInterface.sequelize.query(
        "ALTER TYPE \"enum_email_templates_category\" ADD VALUE IF NOT EXISTS 'quote';"
      );
      console.log('✅ Added quote to email_templates category ENUM');
    } else {
      // SQLite: ENUM is stored as TEXT, no alteration needed
      console.log('ℹ️  SQLite does not enforce ENUMs, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    // ENUMs cannot easily be reversed in PostgreSQL
    // The value remains but is harmless
    console.log('ℹ️  ENUM value removal is not supported, skipping');
  }
};
