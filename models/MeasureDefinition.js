/**
 * MeasureDefinition Model
 *
 * Defines custom measure types (e.g., weight, blood pressure, heart rate)
 * that can be tracked for patients over time.
 *
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

module.exports = (sequelize, DataTypes) => {
  const MeasureDefinition = sequelize.define('MeasureDefinition', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9_]+$/i, // alphanumeric and underscores only
        len: [2, 100]
      },
      comment: 'Unique measure name (e.g., weight, blood_pressure)'
    },
    display_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200]
      },
      comment: 'Human-readable name for display'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional description of the measure'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'other',
      validate: {
        isIn: [['vitals', 'lab_results', 'symptoms', 'anthropometric', 'lifestyle', 'other']]
      },
      comment: 'Category: vitals, lab_results, symptoms, anthropometric, lifestyle, other'
    },
    measure_type: {
      type: DataTypes.ENUM('numeric', 'text', 'boolean', 'calculated'),
      allowNull: false,
      defaultValue: 'numeric',
      comment: 'Type of measure value'
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      },
      comment: 'Unit of measurement (kg, cm, mmHg, etc.)'
    },
    min_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true
      },
      comment: 'Minimum valid value (for numeric types)'
    },
    max_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true,
        isGreaterThanMin(value) {
          if (this.min_value !== null && value !== null && parseFloat(value) <= parseFloat(this.min_value)) {
            throw new Error('max_value must be greater than min_value');
          }
        }
      },
      comment: 'Maximum valid value (for numeric types)'
    },
    decimal_places: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 2,
      validate: {
        min: 0,
        max: 4
      },
      comment: 'Number of decimal places for display'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this measure is active'
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Order for display in lists'
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'System-defined measures cannot be deleted'
    }
  }, {
    tableName: 'measure_definitions',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete support
    hooks: {
      beforeDestroy: async (instance, options) => {
        // Prevent deletion of system measures
        if (instance.is_system) {
          throw new Error('Cannot delete system-defined measure');
        }
      }
    }
  });

  /**
   * Get value based on measure type
   * @param {Object} measure - PatientMeasure instance
   * @returns {*} The appropriate value based on measure_type
   */
  MeasureDefinition.prototype.getValue = function(measure) {
    switch (this.measure_type) {
      case 'numeric':
        return measure.numeric_value;
      case 'text':
        return measure.text_value;
      case 'boolean':
        return measure.boolean_value;
      case 'calculated':
        return measure.numeric_value; // Calculated values stored as numeric
      default:
        return null;
    }
  };

  /**
   * Validate value for this measure type
   * @param {*} value - Value to validate
   * @returns {Object} { valid: boolean, error: string|null }
   */
  MeasureDefinition.prototype.validateValue = function(value) {
    // Type-specific validation
    switch (this.measure_type) {
      case 'numeric':
      case 'calculated':
        if (value === null || value === undefined || value === '') {
          return { valid: false, error: 'Numeric value required' };
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { valid: false, error: 'Invalid numeric value' };
        }

        // Range validation
        if (this.min_value !== null && numValue < parseFloat(this.min_value)) {
          return { valid: false, error: `Value must be at least ${this.min_value}` };
        }
        if (this.max_value !== null && numValue > parseFloat(this.max_value)) {
          return { valid: false, error: `Value must be at most ${this.max_value}` };
        }

        return { valid: true, error: null };

      case 'text':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Text value required' };
        }
        if (value.trim().length === 0) {
          return { valid: false, error: 'Text value cannot be empty' };
        }
        return { valid: true, error: null };

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { valid: false, error: 'Boolean value required' };
        }
        return { valid: true, error: null };

      default:
        return { valid: false, error: 'Unknown measure type' };
    }
  };

  return MeasureDefinition;
};
