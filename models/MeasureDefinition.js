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
    normal_range_min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true
      },
      comment: 'Minimum value for normal/healthy range'
    },
    normal_range_max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true,
        isGreaterThanNormalMin(value) {
          if (this.normal_range_min !== null && value !== null && parseFloat(value) <= parseFloat(this.normal_range_min)) {
            throw new Error('normal_range_max must be greater than normal_range_min');
          }
        }
      },
      comment: 'Maximum value for normal/healthy range'
    },
    alert_threshold_min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true
      },
      comment: 'Minimum threshold for critical alerts (more extreme than normal_range_min)'
    },
    alert_threshold_max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true
      },
      comment: 'Maximum threshold for critical alerts (more extreme than normal_range_max)'
    },
    enable_alerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether to automatically generate alerts for out-of-range values'
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
    },
    formula: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isRequiredForCalculated(value) {
          if (this.measure_type === 'calculated' && !value) {
            throw new Error('Formula is required for calculated measures');
          }
        }
      },
      comment: 'Formula for calculated measures (e.g., {weight} / ({height} * {height}))'
    },
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of measure names this formula depends on'
    },
    last_formula_change: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last formula modification for audit trail'
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

  /**
   * Get formula dependencies
   * @returns {Array<string>} Array of measure names this formula depends on
   */
  MeasureDefinition.prototype.getDependencies = function() {
    return this.dependencies || [];
  };

  /**
   * Validate that all formula dependencies exist
   * @returns {Promise<Object>} { valid: boolean, error: string|null, missing: string[] }
   */
  MeasureDefinition.prototype.validateFormulaDependencies = async function() {
    const deps = this.getDependencies();

    if (deps.length === 0) {
      return { valid: true, error: null, missing: [] };
    }

    const missing = [];

    for (const depName of deps) {
      const dep = await MeasureDefinition.findOne({
        where: { name: depName, deleted_at: null }
      });

      if (!dep) {
        missing.push(depName);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        error: `Dependencies not found: ${missing.join(', ')}`,
        missing
      };
    }

    return { valid: true, error: null, missing: [] };
  };

  /**
   * Validate range configuration
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  MeasureDefinition.prototype.validateRanges = function() {
    const errors = [];

    // Only validate for numeric measures
    if (this.measure_type !== 'numeric') {
      return { valid: true, errors: [] };
    }

    // Normal range validation
    if (this.normal_range_min !== null && this.normal_range_max !== null) {
      if (parseFloat(this.normal_range_min) >= parseFloat(this.normal_range_max)) {
        errors.push('normal_range_min must be less than normal_range_max');
      }

      // Normal range must be within validation range
      if (this.min_value !== null && parseFloat(this.normal_range_min) < parseFloat(this.min_value)) {
        errors.push('normal_range_min must be >= min_value');
      }
      if (this.max_value !== null && parseFloat(this.normal_range_max) > parseFloat(this.max_value)) {
        errors.push('normal_range_max must be <= max_value');
      }
    }

    // Alert threshold validation
    if (this.alert_threshold_min !== null) {
      if (this.min_value !== null && parseFloat(this.alert_threshold_min) < parseFloat(this.min_value)) {
        errors.push('alert_threshold_min must be >= min_value');
      }
      if (this.normal_range_min !== null && parseFloat(this.alert_threshold_min) > parseFloat(this.normal_range_min)) {
        errors.push('alert_threshold_min should be <= normal_range_min (more extreme)');
      }
    }

    if (this.alert_threshold_max !== null) {
      if (this.max_value !== null && parseFloat(this.alert_threshold_max) > parseFloat(this.max_value)) {
        errors.push('alert_threshold_max must be <= max_value');
      }
      if (this.normal_range_max !== null && parseFloat(this.alert_threshold_max) < parseFloat(this.normal_range_max)) {
        errors.push('alert_threshold_max should be >= normal_range_max (more extreme)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  return MeasureDefinition;
};
