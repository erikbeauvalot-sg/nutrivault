module.exports = (sequelize, DataTypes) => {
  const ConsultationNote = sequelize.define('ConsultationNote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'consultation_notes',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['visit_id'] },
      { fields: ['patient_id'] },
      { fields: ['template_id'] },
      { fields: ['dietitian_id'] },
      { fields: ['status'] }
    ]
  });

  return ConsultationNote;
};
