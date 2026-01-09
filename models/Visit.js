module.exports = (sequelize, DataTypes) => {
  const Visit = sequelize.define('Visit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    visit_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    visit_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Initial, Follow-up, Final, etc.'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'SCHEDULED',
      validate: {
        isIn: [['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']]
      }
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    next_visit_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'visits',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['patient_id']
      },
      {
        fields: ['dietitian_id']
      },
      {
        fields: ['visit_date']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Visit;
};
