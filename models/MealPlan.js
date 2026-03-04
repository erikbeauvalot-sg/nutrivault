/**
 * MealPlan Model
 * A personalized meal plan created by a dietitian for a patient.
 */

module.exports = (sequelize, DataTypes) => {
  const MealPlan = sequelize.define('MealPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'patients', key: 'id' }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'active', 'completed', 'archived']]
      }
    },
    goals: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('goals');
        if (!value) return [];
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch (_) { return []; }
        }
        return value;
      },
      set(value) {
        this.setDataValue('goals', JSON.stringify(value || []));
      }
    },
    dietary_restrictions: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('dietary_restrictions');
        if (!value) return [];
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch (_) { return []; }
        }
        return value;
      },
      set(value) {
        this.setDataValue('dietary_restrictions', JSON.stringify(value || []));
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration_weeks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'meal_plans',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['created_by'] },
      { fields: ['status'] },
      { fields: ['is_active'] }
    ]
  });

  MealPlan.associate = function(models) {
    MealPlan.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    MealPlan.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    MealPlan.hasMany(models.MealPlanDay, {
      foreignKey: 'meal_plan_id',
      as: 'days'
    });
  };

  return MealPlan;
};
