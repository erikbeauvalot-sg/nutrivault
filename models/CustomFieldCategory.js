module.exports = (sequelize, DataTypes) => {
  const CustomFieldCategory = sequelize.define('CustomFieldCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#3498db',
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'custom_field_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['is_active', 'display_order']
      }
    ]
  });

  return CustomFieldCategory;
};
