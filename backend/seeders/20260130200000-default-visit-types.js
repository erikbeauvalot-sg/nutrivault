'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeder: Default Visit Types
 *
 * Creates common visit types for dietitian practices:
 * 1. Consultation initiale (Initial Consultation)
 * 2. Suivi (Follow-up)
 * 3. Bilan (Nutritional Assessment)
 * 4. Urgence (Emergency)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if visit types already exist
    const existingTypes = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM visit_types",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingTypes[0].count > 0) {
      console.log('ℹ️  Visit types already exist, skipping seed');
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert('visit_types', [
      {
        id: uuidv4(),
        name: 'Consultation initiale',
        description: 'Première consultation avec le patient',
        display_order: 1,
        is_active: true,
        color: '#4CAF50',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Suivi',
        description: 'Consultation de suivi régulière',
        display_order: 2,
        is_active: true,
        color: '#2196F3',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Bilan',
        description: 'Bilan nutritionnel complet',
        display_order: 3,
        is_active: true,
        color: '#FF9800',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Urgence',
        description: 'Consultation urgente',
        display_order: 4,
        is_active: true,
        color: '#f44336',
        created_at: now,
        updated_at: now
      }
    ]);

    console.log('✅ Default visit types seeded successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('visit_types', {
      name: [
        'Consultation initiale',
        'Suivi',
        'Bilan',
        'Urgence'
      ]
    });

    console.log('✅ Default visit types removed successfully');
  }
};
