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
        let rawValue = this.getDataValue('entity_types');
        const defaultValue = ['patient'];
        if (rawValue === null || rawValue === undefined) {
          return defaultValue;
        }
        // Handle double-encoded JSON
        if (typeof rawValue === 'string') {
          try {
            rawValue = JSON.parse(rawValue);
            // If result is still a string, parse again (double-encoded)
            if (typeof rawValue === 'string') {
              rawValue = JSON.parse(rawValue);
            }
          } catch (e) {
            return defaultValue;
          }
        }
        return Array.isArray(rawValue) ? rawValue : defaultValue;
      },
      set(value) {
        if (Array.isArray(value)) {
          // Store as array, Sequelize will handle JSON serialization
          this.setDataValue('entity_types', value);
        } else if (typeof value === 'string') {
          // If it's a string, try to parse it as JSON array
          try {
            const parsed = JSON.parse(value);
            this.setDataValue('entity_types', Array.isArray(parsed) ? parsed : ['patient']);
          } catch (e) {
            this.setDataValue('entity_types', ['patient']);
          }
        } else {
          this.setDataValue('entity_types', ['patient']);
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
    },
    visit_types: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      get() {
        let rawValue = this.getDataValue('visit_types');
        if (rawValue === null || rawValue === undefined) {
          return null;
        }
        // Handle double-encoded JSON (stored as string of JSON string)
        if (typeof rawValue === 'string') {
          try {
            rawValue = JSON.parse(rawValue);
            // If result is still a string, parse again (double-encoded)
            if (typeof rawValue === 'string') {
              rawValue = JSON.parse(rawValue);
            }
          } catch (e) {
            return null;
          }
        }
        return Array.isArray(rawValue) ? rawValue : null;
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('visit_types', null);
        } else if (Array.isArray(value)) {
          // Store as array, Sequelize will handle JSON serialization
          this.setDataValue('visit_types', value);
        } else if (typeof value === 'string') {
          // If it's a string, try to parse it as JSON array
          try {
            const parsed = JSON.parse(value);
            this.setDataValue('visit_types', Array.isArray(parsed) ? parsed : null);
          } catch (e) {
            this.setDataValue('visit_types', null);
          }
        } else {
          this.setDataValue('visit_types', null);
        }
      },
      validate: {
        isValidVisitTypes(value) {
          if (value === null || value === undefined) {
            return; // null is valid (means all types)
          }
          let arrayValue = value;
          if (typeof value === 'string') {
            try {
              arrayValue = JSON.parse(value);
            } catch (e) {
              throw new Error('visit_types must be valid JSON');
            }
          }
          if (!Array.isArray(arrayValue)) {
            throw new Error('visit_types must be an array or null');
          }
        }
      }
    },
    display_layout: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { type: 'columns', columns: 1 },
      get() {
        let rawValue = this.getDataValue('display_layout');
        const defaultLayout = { type: 'columns', columns: 1 };
        if (rawValue === null || rawValue === undefined) {
          return defaultLayout;
        }
        // Handle double-encoded JSON
        if (typeof rawValue === 'string') {
          try {
            rawValue = JSON.parse(rawValue);
            // If result is still a string, parse again (double-encoded)
            if (typeof rawValue === 'string') {
              rawValue = JSON.parse(rawValue);
            }
          } catch (e) {
            return defaultLayout;
          }
        }
        return (typeof rawValue === 'object' && rawValue !== null) ? rawValue : defaultLayout;
      },
      set(value) {
        if (typeof value === 'object' && value !== null) {
          // Store as object, Sequelize will handle JSON serialization
          this.setDataValue('display_layout', value);
        } else if (typeof value === 'string') {
          // If it's a string, try to parse it
          try {
            const parsed = JSON.parse(value);
            this.setDataValue('display_layout', typeof parsed === 'object' ? parsed : { type: 'columns', columns: 1 });
          } catch (e) {
            this.setDataValue('display_layout', { type: 'columns', columns: 1 });
          }
        } else {
          this.setDataValue('display_layout', { type: 'columns', columns: 1 });
        }
      },
      validate: {
        isValidLayout(value) {
          let objValue = value;
          if (typeof value === 'string') {
            try {
              objValue = JSON.parse(value);
            } catch (e) {
              throw new Error('display_layout must be valid JSON');
            }
          }
          if (typeof objValue !== 'object' || objValue === null) {
            throw new Error('display_layout must be an object');
          }
          const validTypes = ['columns', 'radar', 'list'];
          if (!validTypes.includes(objValue.type)) {
            throw new Error(`Invalid layout type: ${objValue.type}. Valid types are: ${validTypes.join(', ')}`);
          }
          if (objValue.type === 'columns') {
            const columns = objValue.columns || 1;
            if (!Number.isInteger(columns) || columns < 1 || columns > 6) {
              throw new Error('columns must be an integer between 1 and 6');
            }
          }
        }
      }
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
