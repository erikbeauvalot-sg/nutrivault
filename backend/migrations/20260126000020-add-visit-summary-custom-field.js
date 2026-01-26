'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Add visit_summary custom field definition
 * This field stores the auto-generated summary when a visit is finished
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if visit_summary field already exists
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM custom_field_definitions WHERE field_name = 'visit_summary'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      console.log('ℹ️  visit_summary field already exists, skipping');
      return;
    }

    // Get the "Notes de visite" category ID
    const [category] = await queryInterface.sequelize.query(
      "SELECT id FROM custom_field_categories WHERE name = 'Notes de visite'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!category) {
      console.log('⚠️  "Notes de visite" category not found, creating it first');

      const categoryId = uuidv4();
      const now = new Date();

      await queryInterface.bulkInsert('custom_field_categories', [{
        id: categoryId,
        name: 'Notes de visite',
        description: 'Informations cliniques de la visite',
        entity_types: JSON.stringify(['visit']),
        display_order: 7,
        is_active: true,
        created_at: now,
        updated_at: now
      }]);

      // Use the newly created category
      await createVisitSummaryField(queryInterface, categoryId);
    } else {
      // Ensure the category is configured for visits
      await queryInterface.sequelize.query(
        `UPDATE custom_field_categories SET entity_types = '["visit"]' WHERE id = '${category.id}' AND (entity_types IS NULL OR entity_types = '["patient"]')`
      );
      await createVisitSummaryField(queryInterface, category.id);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('custom_field_definitions', {
      field_name: 'visit_summary'
    });
  }
};

async function createVisitSummaryField(queryInterface, categoryId) {
  const now = new Date();

  // Get the max display_order for this category
  const [maxOrder] = await queryInterface.sequelize.query(
    `SELECT MAX(display_order) as max_order FROM custom_field_definitions WHERE category_id = '${categoryId}'`
  );
  const displayOrder = (maxOrder[0]?.max_order || 0) + 1;

  await queryInterface.bulkInsert('custom_field_definitions', [{
    id: uuidv4(),
    category_id: categoryId,
    field_name: 'visit_summary',
    field_label: 'Résumé de la visite',
    field_type: 'textarea',
    is_required: false,
    help_text: 'Résumé auto-généré des modifications effectuées lors de la visite',
    display_order: displayOrder,
    is_active: true,
    created_at: now,
    updated_at: now
  }]);

  console.log('✅ Created visit_summary custom field definition');
}
