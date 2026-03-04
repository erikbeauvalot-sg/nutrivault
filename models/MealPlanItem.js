/**
 * MealPlanItem Model
 * A recipe or free-text food item within a meal slot.
 */

module.exports = (sequelize, DataTypes) => {
  const MealPlanItem = sequelize.define('MealPlanItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    meal_plan_meal_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'meal_plan_meals', key: 'id' }
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'recipes', key: 'id' }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    quantity: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'meal_plan_items',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['meal_plan_meal_id'] },
      { fields: ['recipe_id'] }
    ]
  });

  MealPlanItem.associate = function(models) {
    MealPlanItem.belongsTo(models.MealPlanMeal, {
      foreignKey: 'meal_plan_meal_id',
      as: 'meal'
    });
    MealPlanItem.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });
  };

  return MealPlanItem;
};
