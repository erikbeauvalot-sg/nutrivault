/**
 * RecipePatientAccess Model
 * Tracks recipe sharing with patients
 */

module.exports = (sequelize, DataTypes) => {
  const RecipePatientAccess = sequelize.define('RecipePatientAccess', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recipes',
        key: 'id'
      }
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    shared_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    shared_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'recipe_patient_access',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['recipe_id']
      },
      {
        fields: ['patient_id']
      },
      {
        fields: ['shared_by']
      },
      {
        fields: ['recipe_id', 'patient_id'],
        unique: true
      },
      {
        fields: ['patient_id', 'is_active']
      },
      {
        fields: ['shared_at']
      }
    ]
  });

  RecipePatientAccess.associate = function(models) {
    // Belongs to a recipe
    RecipePatientAccess.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    // Belongs to a patient
    RecipePatientAccess.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

    // Shared by a user
    RecipePatientAccess.belongsTo(models.User, {
      foreignKey: 'shared_by',
      as: 'sharedByUser'
    });
  };

  return RecipePatientAccess;
};
