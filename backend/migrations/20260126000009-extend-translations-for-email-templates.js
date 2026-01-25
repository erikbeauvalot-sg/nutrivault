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
    // For SQLite, we need to recreate the table with the new ENUM values
    // because SQLite doesn't support ALTER COLUMN for ENUMs

    // First, check if we need to update (SQLite doesn't have proper ENUM support)
    const tableInfo = await queryInterface.describeTable('measure_translations');

    // SQLite stores ENUM as TEXT, so we just need to update the model validation
    // The actual constraint is handled by the model, not the database for SQLite

    // Add a comment to indicate this table now supports email_template entity_type
    console.log('Migration: measure_translations now supports entity_type: measure_definition, email_template');
    console.log('Email template translations use field_names: subject, body_html, body_text');
  },

  async down(queryInterface, Sequelize) {
    // No database changes to revert for SQLite
    console.log('Rollback: No database changes needed for SQLite');
  }
};
