module.exports = (sequelize, DataTypes) => {
  const VisitCustomFieldValue = sequelize.define('VisitCustomFieldValue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    field_definition_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    value_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    value_number: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    value_boolean: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    value_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'visit_custom_field_values',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['visit_id']
      },
      {
        fields: ['field_definition_id']
      },
      {
        unique: true,
        fields: ['visit_id', 'field_definition_id'],
        name: 'unique_visit_field'
      }
    ]
  });

  /**
   * Gets the value in the correct format based on field type
   * @param {string} fieldType - The field type from the definition
   * @returns {any} - The formatted value
   */
  VisitCustomFieldValue.prototype.getValue = function(fieldType) {
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'date':
      case 'select':
        return this.value_text;

      case 'number':
        return this.value_number !== null ? parseFloat(this.value_number) : null;

      case 'boolean':
        return this.value_boolean;

      default:
        // Fallback to text
        return this.value_text;
    }
  };

  /**
   * Sets the value in the correct column based on field type
   * @param {any} value - The value to set
   * @param {string} fieldType - The field type from the definition
   */
  VisitCustomFieldValue.prototype.setValue = function(value, fieldType) {
    // Clear all value columns first
    this.value_text = null;
    this.value_number = null;
    this.value_boolean = null;
    this.value_json = null;

    // Set the appropriate column based on type
    switch (fieldType) {
      case 'text':
      case 'textarea':
      case 'select':
        this.value_text = value !== null && value !== undefined ? String(value) : null;
        break;

      case 'date':
        // Store date as ISO string in value_text
        if (value) {
          const dateValue = new Date(value);
          this.value_text = dateValue.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        break;

      case 'number':
        this.value_number = value !== null && value !== undefined ? parseFloat(value) : null;
        break;

      case 'boolean':
        // Handle string boolean values
        if (typeof value === 'string') {
          this.value_boolean = value === 'true';
        } else {
          this.value_boolean = Boolean(value);
        }
        break;

      default:
        // Fallback to text
        this.value_text = value !== null && value !== undefined ? String(value) : null;
    }
  };

  return VisitCustomFieldValue;
};
