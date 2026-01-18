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
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
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
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
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
    state: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    zip_code: {
      type: DataTypes.STRING(20),
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
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dietary_preferences: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    blood_type: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    current_medications: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    medical_record_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    insurance_provider: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    insurance_policy_number: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    primary_care_physician: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    height_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    weight_kg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    food_preferences: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nutritional_goals: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    exercise_habits: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    smoking_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    alcohol_consumption: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigned_dietitian_id: {
      type: DataTypes.UUID,
      allowNull: true
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
        fields: ['email']
      },
      {
        fields: ['assigned_dietitian_id']
      },
      {
        fields: ['last_name']
      }
    ]
  });

  return Patient;
};
