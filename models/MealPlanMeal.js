/**
 * MealPlanMeal Model
 * A meal slot within a day (breakfast, lunch, dinner, snack, other).
 */

module.exports = (sequelize, DataTypes) => {
  const MealPlanMeal = sequelize.define('MealPlanMeal', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    meal_plan_day_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'meal_plan_days', key: 'id' }
    },
    meal_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'other',
      validate: {
        isIn: [['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'other']]
      }
    },
    label: {
      type: DataTypes.STRING(100),
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
    tableName: 'meal_plan_meals',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['meal_plan_day_id'] }
    ]
  });

  MealPlanMeal.associate = function(models) {
    MealPlanMeal.belongsTo(models.MealPlanDay, {
      foreignKey: 'meal_plan_day_id',
      as: 'day'
    });
    MealPlanMeal.hasMany(models.MealPlanItem, {
      foreignKey: 'meal_plan_meal_id',
      as: 'items'
    });
  };

  return MealPlanMeal;
};
