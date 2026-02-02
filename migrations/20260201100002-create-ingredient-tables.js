'use strict';

/**
 * Migration: Create Ingredient Tables
 * Recipe Management Module - Phase 2
 *
 * Tables:
 * - ingredients: Ingredient definitions with nutritional data
 * - recipe_ingredients: Junction table linking recipes to ingredients
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create ingredients table
    await queryInterface.createTable('ingredients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Ingredient name'
      },
      name_normalized: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Lowercase name for searching'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Ingredient category (proteins, vegetables, grains, etc.)'
      },
      default_unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'g',
        comment: 'Default unit of measurement'
      },
      nutrition_per_100g: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '{}',
        comment: 'Nutritional values per 100g (calories, protein, carbs, fat, fiber, sodium)'
      },
      allergens: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '[]',
        comment: 'List of allergens (gluten, dairy, nuts, etc.)'
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System ingredients cannot be deleted'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who created this ingredient'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for ingredients
    await queryInterface.addIndex('ingredients', ['name_normalized'], {
      name: 'ingredients_name_normalized'
    });

    await queryInterface.addIndex('ingredients', ['category'], {
      name: 'ingredients_category'
    });

    await queryInterface.addIndex('ingredients', ['is_active'], {
      name: 'ingredients_is_active'
    });

    await queryInterface.addIndex('ingredients', ['is_system'], {
      name: 'ingredients_is_system'
    });

    // 2. Create recipe_ingredients junction table
    await queryInterface.createTable('recipe_ingredients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Recipe this ingredient belongs to'
      },
      ingredient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ingredients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Ingredient reference'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Quantity of ingredient'
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Unit of measurement (g, ml, cups, etc.)'
      },
      notes: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Preparation notes (diced, chopped, etc.)'
      },
      is_optional: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether ingredient is optional'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for display in recipe'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for recipe_ingredients
    await queryInterface.addIndex('recipe_ingredients', ['recipe_id'], {
      name: 'recipe_ingredients_recipe_id'
    });

    await queryInterface.addIndex('recipe_ingredients', ['ingredient_id'], {
      name: 'recipe_ingredients_ingredient_id'
    });

    await queryInterface.addIndex('recipe_ingredients', ['recipe_id', 'ingredient_id'], {
      name: 'recipe_ingredients_recipe_ingredient',
      unique: true
    });

    await queryInterface.addIndex('recipe_ingredients', ['recipe_id', 'display_order'], {
      name: 'recipe_ingredients_order'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('recipe_ingredients');
    await queryInterface.dropTable('ingredients');
  }
};
