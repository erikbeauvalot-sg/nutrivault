module.exports = (sequelize, DataTypes) => {
  const VisitMeasurement = sequelize.define('VisitMeasurement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    weight_kg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    height_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    bmi: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    blood_pressure_systolic: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    blood_pressure_diastolic: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    waist_circumference_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    body_fat_percentage: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    muscle_mass_percentage: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'visit_measurements',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['visit_id']
      }
    ]
  });

  return VisitMeasurement;
};
