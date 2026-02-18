module.exports = (sequelize, DataTypes) => {
  const ConsultationTemplate = sequelize.define('ConsultationTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    template_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'general'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    visibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'private'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('tags');
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
      },
      set(val) {
        this.setDataValue('tags', val ? JSON.stringify(val) : null);
      }
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true
    }
  }, {
    tableName: 'consultation_templates',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['created_by'] },
      { fields: ['is_active'] },
      { fields: ['template_type'] },
      { fields: ['visibility'] }
    ],
    hooks: {
      beforeCreate: async (template) => {
        if (template.is_default) {
          await ConsultationTemplate.update(
            { is_default: false },
            { where: { is_default: true, created_by: template.created_by } }
          );
        }
      },
      beforeUpdate: async (template) => {
        if (template.is_default && template.changed('is_default')) {
          await ConsultationTemplate.update(
            { is_default: false },
            { where: { is_default: true, created_by: template.created_by, id: { [sequelize.Sequelize.Op.ne]: template.id } } }
          );
        }
      }
    }
  });

  return ConsultationTemplate;
};
