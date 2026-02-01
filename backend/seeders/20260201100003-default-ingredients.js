/**
 * Seed: Default Ingredients
 *
 * Creates common ingredients with nutritional data
 * Recipe Management Module - Phase 2
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if ingredients already exist
    const existingIngredients = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM ingredients",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingIngredients[0].count > 0) {
      console.log('ℹ️  Ingredients already exist, skipping seed');
      return;
    }

    const now = new Date();

    const ingredients = [
      // Proteins
      {
        id: uuidv4(),
        name: 'Poulet (blanc)',
        name_normalized: 'poulet blanc',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Saumon',
        name_normalized: 'saumon',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sodium: 59 }),
        allergens: JSON.stringify(['fish']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Boeuf haché maigre',
        name_normalized: 'boeuf hache maigre',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sodium: 75 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Oeufs',
        name_normalized: 'oeufs',
        category: 'proteins',
        default_unit: 'unit',
        nutrition_per_100g: JSON.stringify({ calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sodium: 124 }),
        allergens: JSON.stringify(['eggs']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Tofu ferme',
        name_normalized: 'tofu ferme',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 144, protein: 17, carbs: 3, fat: 8, fiber: 2, sodium: 14 }),
        allergens: JSON.stringify(['soy']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Grains
      {
        id: uuidv4(),
        name: 'Riz basmati',
        name_normalized: 'riz basmati',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sodium: 1 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Quinoa',
        name_normalized: 'quinoa',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, sodium: 7 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Pâtes complètes',
        name_normalized: 'pates completes',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 124, protein: 5.3, carbs: 25, fat: 0.5, fiber: 4.5, sodium: 4 }),
        allergens: JSON.stringify(['gluten']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Flocons d\'avoine',
        name_normalized: 'flocons davoine',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sodium: 2 }),
        allergens: JSON.stringify(['gluten']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Vegetables
      {
        id: uuidv4(),
        name: 'Brocoli',
        name_normalized: 'brocoli',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sodium: 33 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Épinards',
        name_normalized: 'epinards',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sodium: 79 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Carottes',
        name_normalized: 'carottes',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sodium: 69 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Tomates',
        name_normalized: 'tomates',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sodium: 5 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Poivrons',
        name_normalized: 'poivrons',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sodium: 4 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Oignon',
        name_normalized: 'oignon',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7, sodium: 4 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Ail',
        name_normalized: 'ail',
        category: 'vegetables',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sodium: 17 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Fruits
      {
        id: uuidv4(),
        name: 'Banane',
        name_normalized: 'banane',
        category: 'fruits',
        default_unit: 'unit',
        nutrition_per_100g: JSON.stringify({ calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sodium: 1 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Pomme',
        name_normalized: 'pomme',
        category: 'fruits',
        default_unit: 'unit',
        nutrition_per_100g: JSON.stringify({ calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sodium: 1 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Myrtilles',
        name_normalized: 'myrtilles',
        category: 'fruits',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, sodium: 1 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Avocat',
        name_normalized: 'avocat',
        category: 'fruits',
        default_unit: 'unit',
        nutrition_per_100g: JSON.stringify({ calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sodium: 7 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Dairy
      {
        id: uuidv4(),
        name: 'Yaourt grec nature',
        name_normalized: 'yaourt grec nature',
        category: 'dairy',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 97, protein: 9, carbs: 3.6, fat: 5, fiber: 0, sodium: 36 }),
        allergens: JSON.stringify(['dairy']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Fromage cottage',
        name_normalized: 'fromage cottage',
        category: 'dairy',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, sodium: 364 }),
        allergens: JSON.stringify(['dairy']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Lait écrémé',
        name_normalized: 'lait ecreme',
        category: 'dairy',
        default_unit: 'ml',
        nutrition_per_100g: JSON.stringify({ calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0, sodium: 42 }),
        allergens: JSON.stringify(['dairy']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Oils & Fats
      {
        id: uuidv4(),
        name: 'Huile d\'olive',
        name_normalized: 'huile dolive',
        category: 'oils',
        default_unit: 'ml',
        nutrition_per_100g: JSON.stringify({ calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 2 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Beurre',
        name_normalized: 'beurre',
        category: 'oils',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sodium: 11 }),
        allergens: JSON.stringify(['dairy']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Nuts & Seeds
      {
        id: uuidv4(),
        name: 'Amandes',
        name_normalized: 'amandes',
        category: 'nuts',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sodium: 1 }),
        allergens: JSON.stringify(['tree-nuts']),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Graines de chia',
        name_normalized: 'graines de chia',
        category: 'nuts',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, sodium: 16 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },

      // Legumes
      {
        id: uuidv4(),
        name: 'Lentilles',
        name_normalized: 'lentilles',
        category: 'legumes',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sodium: 2 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Pois chiches',
        name_normalized: 'pois chiches',
        category: 'legumes',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 8, sodium: 7 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Haricots noirs',
        name_normalized: 'haricots noirs',
        category: 'legumes',
        default_unit: 'g',
        nutrition_per_100g: JSON.stringify({ calories: 132, protein: 9, carbs: 24, fat: 0.5, fiber: 8, sodium: 1 }),
        allergens: JSON.stringify([]),
        is_system: true,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('ingredients', ingredients);

    console.log(`✅ Created ${ingredients.length} default ingredients`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ingredients', { is_system: true });
    console.log('✅ Removed system ingredients');
  }
};
