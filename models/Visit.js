'use strict';

module.exports = (sequelize, DataTypes) => {
  const Visit = sequelize.define('Visit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    visit_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    visit_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'SCHEDULED'
    },
    chief_complaint: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assessment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    next_visit_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    private_notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'visits',
    timestamps: true,
    underscored: true
  });

  Visit.associate = (models) => {
    Visit.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    Visit.belongsTo(models.User, {
      foreignKey: 'dietitian_id',
      as: 'dietitian'
    });
    Visit.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    Visit.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
    Visit.hasMany(models.VisitMeasurement, {
      foreignKey: 'visit_id',
      as: 'measurements'
    });
    Visit.hasOne(models.Billing, {
      foreignKey: 'visit_id',
      as: 'billing'
    });
  };

  return Visit;
};
