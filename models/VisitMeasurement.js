'use strict';

module.exports = (sequelize, DataTypes) => {
  const VisitMeasurement = sequelize.define('VisitMeasurement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'visits',
        key: 'id'
      }
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
    waist_circumference_cm: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    body_fat_percentage: {
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'visit_measurements',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  VisitMeasurement.associate = (models) => {
    VisitMeasurement.belongsTo(models.Visit, {
      foreignKey: 'visit_id',
      as: 'visit'
    });
  };

  return VisitMeasurement;
};
