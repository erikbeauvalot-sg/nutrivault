'use strict';

/**
 * Migration: Create Recipe Tables
 * Recipe Management Module - Phase 1
 *
 * Tables:
 * - recipe_categories: Categories for organizing recipes
 * - recipes: Recipe definitions with ingredients and nutrition
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create recipe_categories table
    await queryInterface.createTable('recipe_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Category name'
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Category description'
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Emoji or icon identifier'
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Hex color code (e.g., #FF5733)'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for display in UI'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether category is active'
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
        comment: 'User who created this category'
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

    // Add indexes for recipe_categories
    await queryInterface.addIndex('recipe_categories', ['is_active'], {
      name: 'recipe_categories_is_active'
    });

    await queryInterface.addIndex('recipe_categories', ['display_order'], {
      name: 'recipe_categories_display_order'
    });

    // 2. Create recipes table
    await queryInterface.createTable('recipes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Recipe title'
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly identifier'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Short description of the recipe'
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Cooking instructions (HTML supported)'
      },
      prep_time_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Preparation time in minutes'
      },
      cook_time_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Cooking time in minutes'
      },
      servings: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 4,
        comment: 'Number of servings'
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Recipe difficulty level'
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Publication status'
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Cover image URL'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '[]',
        comment: 'Tags for filtering (e.g., ["vegetarian", "gluten-free"])'
      },
      nutrition_per_serving: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '{}',
        comment: 'Calculated nutritional values per serving'
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'recipe_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Recipe category'
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
        comment: 'User who created this recipe'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
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

    // Add indexes for recipes
    await queryInterface.addIndex('recipes', ['slug'], {
      name: 'recipes_slug',
      unique: true
    });

    await queryInterface.addIndex('recipes', ['status'], {
      name: 'recipes_status'
    });

    await queryInterface.addIndex('recipes', ['category_id'], {
      name: 'recipes_category_id'
    });

    await queryInterface.addIndex('recipes', ['created_by'], {
      name: 'recipes_created_by'
    });

    await queryInterface.addIndex('recipes', ['is_active'], {
      name: 'recipes_is_active'
    });

    await queryInterface.addIndex('recipes', ['difficulty'], {
      name: 'recipes_difficulty'
    });

    await queryInterface.addIndex('recipes', ['status', 'is_active'], {
      name: 'recipes_status_active'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (recipes first, then categories)
    await queryInterface.dropTable('recipes');
    await queryInterface.dropTable('recipe_categories');
  }
};
