'use strict';

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    emergency_contact_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    emergency_contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    medical_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dietary_preferences: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    assigned_dietitian_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true
  });

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, {
      foreignKey: 'assigned_dietitian_id',
      as: 'assignedDietitian'
    });
    Patient.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    Patient.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
    Patient.hasMany(models.Visit, {
      foreignKey: 'patient_id',
      as: 'visits'
    });
    Patient.hasMany(models.Billing, {
      foreignKey: 'patient_id',
      as: 'billings'
    });
  };

  return Patient;
};
