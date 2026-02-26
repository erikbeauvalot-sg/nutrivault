module.exports = (sequelize, DataTypes) => {
  const PatientAchievement = sequelize.define('PatientAchievement', {
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
    goal_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    achievement_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    badge_icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reward_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    earned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'patient_achievements',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_patient_achievements_patient', fields: ['patient_id'] },
      { name: 'idx_patient_achievements_type', fields: ['patient_id', 'achievement_type'] }
    ]
  });

  return PatientAchievement;
};
