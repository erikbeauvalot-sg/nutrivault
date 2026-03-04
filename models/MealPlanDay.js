/**
 * MealPlanDay Model
 * One day within a meal plan (day_number 1..N).
 */

module.exports = (sequelize, DataTypes) => {
  const MealPlanDay = sequelize.define('MealPlanDay', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    meal_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'meal_plans', key: 'id' }
    },
    day_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'meal_plan_days',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['meal_plan_id'] },
      { fields: ['meal_plan_id', 'day_number'] }
    ]
  });

  MealPlanDay.associate = function(models) {
    MealPlanDay.belongsTo(models.MealPlan, {
      foreignKey: 'meal_plan_id',
      as: 'mealPlan'
    });
    MealPlanDay.hasMany(models.MealPlanMeal, {
      foreignKey: 'meal_plan_day_id',
      as: 'meals'
    });
  };

  return MealPlanDay;
};
