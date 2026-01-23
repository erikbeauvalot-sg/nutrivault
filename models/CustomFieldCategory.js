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
    entity_types: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['patient'],
      get() {
        const rawValue = this.getDataValue('entity_types');
        if (typeof rawValue === 'string') {
          try {
            return JSON.parse(rawValue);
          } catch (e) {
            return ['patient'];
          }
        }
        return rawValue || ['patient'];
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('entity_types', JSON.stringify(value));
        } else if (typeof value === 'string') {
          this.setDataValue('entity_types', value);
        } else {
          this.setDataValue('entity_types', JSON.stringify(['patient']));
        }
      },
      validate: {
        isValidEntityTypes(value) {
          // Parse if string
          let arrayValue = value;
          if (typeof value === 'string') {
            try {
              arrayValue = JSON.parse(value);
            } catch (e) {
              throw new Error('entity_types must be valid JSON');
            }
          }

          if (!Array.isArray(arrayValue)) {
            throw new Error('entity_types must be an array');
          }
          if (arrayValue.length === 0) {
            throw new Error('entity_types must contain at least one entity type');
          }
          const validTypes = ['patient', 'visit'];
          const invalidTypes = arrayValue.filter(type => !validTypes.includes(type));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid entity types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
          }
        }
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
