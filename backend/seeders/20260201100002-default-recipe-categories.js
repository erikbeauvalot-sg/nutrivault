/**
 * Seed: Default Recipe Categories
 *
 * Creates default recipe categories for the recipe management system
 * Recipe Management Module - Phase 1
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if categories already exist
    const existingCategories = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM recipe_categories",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingCategories[0].count > 0) {
      console.log('ℹ️  Recipe categories already exist, skipping seed');
      return;
    }

    const now = new Date();

    const categories = [
      {
        id: uuidv4(),
        name: 'Petit-déjeuner',
        description: 'Recettes pour le petit-déjeuner et brunch',
        icon: '🥣',
        color: '#FFB347',
        display_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Déjeuner',
        description: 'Recettes pour le repas du midi',
        icon: '🍽️',
        color: '#77DD77',
        display_order: 2,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Dîner',
        description: 'Recettes pour le repas du soir',
        icon: '🌙',
        color: '#AEC6CF',
        display_order: 3,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Collations',
        description: 'En-cas sains et snacks nutritifs',
        icon: '🍎',
        color: '#FFD1DC',
        display_order: 4,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Soupes & Potages',
        description: 'Soupes, potages et bouillons',
        icon: '🥣',
        color: '#FDFD96',
        display_order: 5,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Salades',
        description: 'Salades composées et accompagnements',
        icon: '🥗',
        color: '#98FB98',
        display_order: 6,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Plats principaux',
        description: 'Plats de résistance et plats complets',
        icon: '🍖',
        color: '#DDA0DD',
        display_order: 7,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Desserts',
        description: 'Desserts sains et gourmandises',
        icon: '🍰',
        color: '#FFDAB9',
        display_order: 8,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Boissons',
        description: 'Smoothies, jus et boissons santé',
        icon: '🥤',
        color: '#87CEEB',
        display_order: 9,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Sans gluten',
        description: 'Recettes adaptées aux régimes sans gluten',
        icon: '🌾',
        color: '#F0E68C',
        display_order: 10,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Végétarien',
        description: 'Recettes végétariennes',
        icon: '🥬',
        color: '#90EE90',
        display_order: 11,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Végan',
        description: 'Recettes 100% végétales',
        icon: '🌱',
        color: '#3CB371',
        display_order: 12,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('recipe_categories', categories);

    console.log(`✅ Created ${categories.length} default recipe categories`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('recipe_categories', {});
    console.log('✅ Removed all recipe categories');
  }
};
