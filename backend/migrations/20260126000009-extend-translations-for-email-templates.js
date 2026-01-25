'use strict';

/**
 * Migration: Extend measure_translations for email templates
 * US-5.5.6: Email Template Multi-Language Support
 *
 * This migration extends the existing measure_translations table to support
 * email template translations using a polymorphic pattern.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This is a no-op migration - the table schema doesn't need changes
    // Both SQLite and PostgreSQL store ENUM as TEXT/VARCHAR
    // The actual constraint is handled by the model validation

    // Add a comment to indicate this table now supports email_template entity_type
    console.log('Migration: measure_translations now supports entity_type: measure_definition, email_template');
    console.log('Email template translations use field_names: subject, body_html, body_text');
  },

  async down(queryInterface, Sequelize) {
    // No database changes to revert
    console.log('Rollback: No database changes needed');
  }
};
