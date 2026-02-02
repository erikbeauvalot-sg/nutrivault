module.exports = (sequelize, DataTypes) => {
  const CustomFieldDefinition = sequelize.define('CustomFieldDefinition', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    field_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9_]+$/,
        len: [1, 100]
      }
    },
    field_label: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    field_type: {
      type: DataTypes.ENUM('text', 'number', 'date', 'select', 'boolean', 'textarea', 'calculated', 'separator', 'blank'),
      allowNull: false,
      validate: {
        isIn: [['text', 'number', 'date', 'select', 'boolean', 'textarea', 'calculated', 'separator', 'blank']]
      }
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    validation_rules: {
      type: DataTypes.JSON,
      allowNull: true
    },
    select_options: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidSelectOptions(value) {
          if (this.field_type === 'select' && value) {
            if (!Array.isArray(value)) {
              throw new Error('select_options must be an array');
            }
            if (value.length === 0) {
              throw new Error('select_options must have at least one option');
            }
          }
          if (this.field_type !== 'select' && this.field_type !== 'separator' && value) {
            throw new Error('select_options can only be set for select fields');
          }
        }
      }
    },
    allow_multiple: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isValidAllowMultiple(value) {
          if (value && this.field_type !== 'select') {
            throw new Error('allow_multiple can only be set for select fields');
          }
        }
      }
    },
    help_text: {
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
    show_in_basic_info: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    show_in_list: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    visible_on_creation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Calculated field properties
    formula: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isValidFormula(value) {
          if (this.field_type === 'calculated' && !value) {
            throw new Error('Formula is required for calculated fields');
          }
          if (this.field_type !== 'calculated' && this.field_type !== 'separator' && value) {
            throw new Error('Formula can only be set for calculated fields');
          }
        }
      }
    },
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidDependencies(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Dependencies must be an array');
          }
          if (this.field_type !== 'calculated' && this.field_type !== 'separator' && value && value.length > 0) {
            throw new Error('Dependencies can only be set for calculated fields');
          }
        }
      }
    },
    decimal_places: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
      validate: {
        isInt: true,
        min: 0,
        max: 4
      }
    },
    is_calculated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'custom_field_definitions',
    timestamps: true,
    underscored: true,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['category_id', 'is_active', 'display_order']
      },
      {
        fields: ['field_name']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  /**
   * Calculates the value of a calculated field using its formula
   * @param {Object} fieldValues - Map of field names to values for dependencies
   * @returns {Object} - { success: boolean, result: number|null, error: string|null }
   */
  CustomFieldDefinition.prototype.calculateValue = function(fieldValues) {
    if (!this.is_calculated || !this.formula) {
      return { success: false, result: null, error: 'Not a calculated field or no formula defined' };
    }

    const formulaEngine = require('../backend/src/services/formulaEngine.service');
    return formulaEngine.evaluateFormula(this.formula, fieldValues, this.decimal_places || 2);
  };

  /**
   * Validates a value against this field definition's type and rules
   * @param {any} value - The value to validate
   * @returns {Object} - { isValid: boolean, error: string|null }
   */
  CustomFieldDefinition.prototype.validateValue = function(value) {
    // Parse JSON fields if they are strings
    let rules = this.validation_rules || {};
    if (typeof rules === 'string') {
      try {
        rules = JSON.parse(rules);
      } catch (e) {
        rules = {};
      }
    }

    let selectOptions = this.select_options;
    if (typeof selectOptions === 'string') {
      try {
        selectOptions = JSON.parse(selectOptions);
      } catch (e) {
        selectOptions = null;
      }
    }

    // Check required
    if (this.is_required && (value === null || value === undefined || value === '')) {
      return { isValid: false, error: 'This field is required' };
    }

    // If value is empty and not required, it's valid
    if (value === null || value === undefined || value === '') {
      return { isValid: true, error: null };
    }

    // Type-specific validation
    switch (this.field_type) {
      case 'calculated':
        // Calculated fields are read-only and automatically computed
        const numVal = parseFloat(value);
        if (isNaN(numVal)) {
          return { isValid: false, error: 'Calculated value must be a number' };
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          return { isValid: false, error: 'Value must be a string' };
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          return { isValid: false, error: `Maximum length is ${rules.maxLength} characters` };
        }
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            return { isValid: false, error: 'Value does not match the required pattern' };
          }
        }
        break;

      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { isValid: false, error: 'Value must be a number' };
        }
        if (rules.min !== undefined && numValue < rules.min) {
          return { isValid: false, error: `Minimum value is ${rules.min}` };
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return { isValid: false, error: `Maximum value is ${rules.max}` };
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return { isValid: false, error: 'Invalid date format' };
        }
        if (rules.min_date) {
          const minDate = new Date(rules.min_date);
          if (dateValue < minDate) {
            return { isValid: false, error: `Date must be after ${rules.min_date}` };
          }
        }
        if (rules.max_date) {
          const maxDate = new Date(rules.max_date);
          if (dateValue > maxDate) {
            return { isValid: false, error: `Date must be before ${rules.max_date}` };
          }
        }
        break;

      case 'select':
        if (!selectOptions || !Array.isArray(selectOptions)) {
          return { isValid: false, error: 'No options available for this field' };
        }
        // Support both simple string arrays and object arrays with value/label
        const validValues = selectOptions.map(opt =>
          typeof opt === 'object' && opt !== null ? opt.value : opt
        );

        // Handle multi-select (array values)
        if (this.allow_multiple) {
          if (!Array.isArray(value)) {
            return { isValid: false, error: 'Multi-select field requires an array value' };
          }
          // Check that all selected values are valid
          for (const selectedValue of value) {
            if (!validValues.includes(selectedValue)) {
              return { isValid: false, error: 'Invalid option selected' };
            }
          }
        } else {
          // Single select validation
          if (!validValues.includes(value)) {
            return { isValid: false, error: 'Invalid option selected' };
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { isValid: false, error: 'Value must be true or false' };
        }
        break;

      case 'separator':
        // Separators don't store values, so they're always valid
        break;

      default:
        return { isValid: false, error: 'Unknown field type' };
    }

    return { isValid: true, error: null };
  };

  return CustomFieldDefinition;
};
