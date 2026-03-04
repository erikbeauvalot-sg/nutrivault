'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // meal_plans: top-level plan assigned to a patient by a dietitian
    await queryInterface.createTable('meal_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft'
      },
      goals: {
        type: Sequelize.TEXT, // JSON array stored as TEXT
        allowNull: true,
        defaultValue: '[]'
      },
      dietary_restrictions: {
        type: Sequelize.TEXT, // JSON array stored as TEXT
        allowNull: true,
        defaultValue: '[]'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration_weeks: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // meal_plan_days: one day within a meal plan (day_number 1-N)
    await queryInterface.createTable('meal_plan_days', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      meal_plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'meal_plans', key: 'id' },
        onDelete: 'CASCADE'
      },
      day_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // meal_plan_meals: a meal slot within a day (breakfast, lunch, dinner, snack)
    await queryInterface.createTable('meal_plan_meals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      meal_plan_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'meal_plan_days', key: 'id' },
        onDelete: 'CASCADE'
      },
      meal_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'other'
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // meal_plan_items: a recipe or free-text food item within a meal slot
    await queryInterface.createTable('meal_plan_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      meal_plan_meal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'meal_plan_meals', key: 'id' },
        onDelete: 'CASCADE'
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'recipes', key: 'id' },
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      quantity: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // Indexes
    try { await queryInterface.addIndex('meal_plans', ['patient_id']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plans', ['created_by']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plans', ['status']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plans', ['is_active']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plan_days', ['meal_plan_id']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plan_days', ['meal_plan_id', 'day_number']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plan_meals', ['meal_plan_day_id']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plan_items', ['meal_plan_meal_id']); } catch (_) {}
    try { await queryInterface.addIndex('meal_plan_items', ['recipe_id']); } catch (_) {}
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meal_plan_items');
    await queryInterface.dropTable('meal_plan_meals');
    await queryInterface.dropTable('meal_plan_days');
    await queryInterface.dropTable('meal_plans');
  }
};
