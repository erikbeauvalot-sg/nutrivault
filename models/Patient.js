/**
 * Patient Model - Simplified Version
 * Contains only essential patient information
 * All other data is managed via custom fields
 */

const { v4: uuidv4 } = require('uuid');

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
      },
      set(value) {
        // Normalize email: trim and lowercase
        if (value) {
          this.setDataValue('email', value.trim().toLowerCase());
        } else {
          this.setDataValue('email', null);
        }
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
    },
    appointment_reminders_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether patient wants to receive appointment reminder emails'
    },
    unsubscribe_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'Unique token for unsubscribe link'
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (patient) => {
        // Generate unsubscribe token for new patients
        if (!patient.unsubscribe_token) {
          patient.unsubscribe_token = uuidv4();
        }
      }
    },
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
