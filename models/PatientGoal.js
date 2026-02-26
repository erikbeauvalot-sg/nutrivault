module.exports = (sequelize, DataTypes) => {
  const PatientGoal = sequelize.define('PatientGoal', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    measure_definition_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    direction: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'reach',
      validate: { isIn: [['increase', 'decrease', 'reach', 'maintain']] }
    },
    start_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    target_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    target_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'completed', 'abandoned']] }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'patient_goals',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_patient_goals_patient', fields: ['patient_id'] },
      { name: 'idx_patient_goals_patient_status', fields: ['patient_id', 'status'] }
    ]
  });

  return PatientGoal;
};
