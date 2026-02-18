module.exports = (sequelize, DataTypes) => {
  const ConsultationTemplateItem = sequelize.define('ConsultationTemplateItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    item_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['category', 'measure', 'instruction']]
      }
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    instruction_title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    instruction_content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    layout_override: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('layout_override');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      },
      set(val) {
        this.setDataValue('layout_override', val ? JSON.stringify(val) : null);
      }
    }
  }, {
    tableName: 'consultation_template_items',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['template_id'] },
      { fields: ['template_id', 'display_order'] },
      { fields: ['reference_id'] }
    ]
  });

  return ConsultationTemplateItem;
};
