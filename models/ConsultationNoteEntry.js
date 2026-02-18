module.exports = (sequelize, DataTypes) => {
  const ConsultationNoteEntry = sequelize.define('ConsultationNoteEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    note_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    entry_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isIn: [['visit_custom_field', 'patient_custom_field', 'patient_measure', 'instruction_note']]
      }
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    template_item_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    note_text: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'consultation_note_entries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['note_id'] },
      { fields: ['reference_id'] },
      { fields: ['note_id', 'template_item_id'] }
    ]
  });

  return ConsultationNoteEntry;
};
