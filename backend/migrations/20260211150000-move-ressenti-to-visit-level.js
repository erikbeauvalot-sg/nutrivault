'use strict';

/**
 * Migration: Change "Ressenti du patient" category to visit-level storage
 *
 * 1. Update entity_types from ['patient','visit'] to ['visit']
 * 2. Move existing patient_custom_field_values to visit_custom_field_values (latest visit per patient)
 * 3. Delete migrated patient_custom_field_values
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Find the "Ressenti du patient" category
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id FROM custom_field_categories WHERE name = 'Ressenti du patient'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!categories) {
      console.log('Category "Ressenti du patient" not found, skipping migration');
      return;
    }

    const categoryId = categories.id;

    // 2. Update entity_types to visit-only
    await queryInterface.sequelize.query(
      `UPDATE custom_field_categories SET entity_types = '["visit"]' WHERE id = ?`,
      { replacements: [categoryId] }
    );

    // 3. Get field definition IDs in this category
    const fieldDefs = await queryInterface.sequelize.query(
      `SELECT id FROM custom_field_definitions WHERE category_id = ? AND deleted_at IS NULL`,
      { replacements: [categoryId], type: Sequelize.QueryTypes.SELECT }
    );

    if (fieldDefs.length === 0) return;

    const fieldIds = fieldDefs.map(f => f.id);
    const placeholders = fieldIds.map(() => '?').join(',');

    // 4. Get patient_custom_field_values for these fields
    const patientValues = await queryInterface.sequelize.query(
      `SELECT id, patient_id, field_definition_id, value_text, value_number, value_boolean, value_json, updated_by, created_at, updated_at
       FROM patient_custom_field_values
       WHERE field_definition_id IN (${placeholders})`,
      { replacements: fieldIds, type: Sequelize.QueryTypes.SELECT }
    );

    if (patientValues.length === 0) {
      console.log('No patient values to migrate');
      return;
    }

    // 5. For each patient, find their latest visit
    const patientIds = [...new Set(patientValues.map(v => v.patient_id))];

    for (const patientId of patientIds) {
      const [latestVisit] = await queryInterface.sequelize.query(
        `SELECT id FROM visits WHERE patient_id = ? ORDER BY visit_date DESC LIMIT 1`,
        { replacements: [patientId], type: Sequelize.QueryTypes.SELECT }
      );

      if (!latestVisit) {
        console.log(`No visit found for patient ${patientId}, skipping`);
        continue;
      }

      const visitId = latestVisit.id;
      const valuesToMigrate = patientValues.filter(v => v.patient_id === patientId);

      for (const val of valuesToMigrate) {
        // Skip if value is empty
        if (!val.value_text && val.value_number === null && val.value_boolean === null && !val.value_json) {
          continue;
        }

        // Check if visit_custom_field_value already exists
        const [existing] = await queryInterface.sequelize.query(
          `SELECT id FROM visit_custom_field_values WHERE visit_id = ? AND field_definition_id = ?`,
          { replacements: [visitId, val.field_definition_id], type: Sequelize.QueryTypes.SELECT }
        );

        if (existing) {
          console.log(`Visit value already exists for field ${val.field_definition_id}, skipping`);
          continue;
        }

        // Insert into visit_custom_field_values
        const newId = uuidv4();
        await queryInterface.sequelize.query(
          `INSERT INTO visit_custom_field_values (id, visit_id, field_definition_id, value_text, value_number, value_boolean, value_json, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              newId, visitId, val.field_definition_id,
              val.value_text, val.value_number, val.value_boolean, val.value_json,
              val.updated_by, val.created_at, val.updated_at
            ]
          }
        );
      }
    }

    // 6. Delete migrated patient values
    await queryInterface.sequelize.query(
      `DELETE FROM patient_custom_field_values WHERE field_definition_id IN (${placeholders})`,
      { replacements: fieldIds }
    );

    console.log(`Migrated ${patientValues.length} values from patient-level to visit-level`);
  },

  async down(queryInterface, Sequelize) {
    // Revert entity_types
    const [categories] = await queryInterface.sequelize.query(
      `SELECT id FROM custom_field_categories WHERE name = 'Ressenti du patient'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (categories) {
      await queryInterface.sequelize.query(
        `UPDATE custom_field_categories SET entity_types = '["patient","visit"]' WHERE id = ?`,
        { replacements: [categories.id] }
      );
    }
    // Note: data migration back from visit to patient level is not automated
  }
};
