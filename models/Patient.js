/**
 * Patient Model - Simplified Version
 * Contains only essential patient information
 * All other data is managed via custom fields
 */

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    assigned_dietitian_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['email'],
        unique: true,
        where: {
          email: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['assigned_dietitian_id']
      },
      {
        fields: ['last_name']
      }
    ]
  });

  Patient.associate = function(models) {
    // Patient is assigned to a dietitian (User)
    Patient.belongsTo(models.User, {
      foreignKey: 'assigned_dietitian_id',
      as: 'assigned_dietitian'
    });

    // Patient has many visits
    Patient.hasMany(models.Visit, {
      foreignKey: 'patient_id',
      as: 'visits'
    });

    // Patient has many billing records
    Patient.hasMany(models.Billing, {
      foreignKey: 'patient_id',
      as: 'billing_records'
    });

    // Patient has many tags
    Patient.hasMany(models.PatientTag, {
      foreignKey: 'patient_id',
      as: 'tags'
    });

    // Patient has many custom field values
    Patient.hasMany(models.PatientCustomFieldValue, {
      foreignKey: 'patient_id',
      as: 'custom_field_values'
    });
  };

  return Patient;
};
