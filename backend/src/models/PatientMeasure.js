const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * PatientMeasure Model
 *
 * Stores time-series measure values for patients.
 * Uses polymorphic value storage (numeric_value, text_value, boolean_value)
 * based on the measure_type from MeasureDefinition.
 *
 * Sprint 3: US-5.3.2 - Log Measure Values
 */
const PatientMeasure = sequelize.define('PatientMeasure', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUUID: 4
    },
    comment: 'Patient this measure belongs to'
  },
  measure_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUUID: 4
    },
    comment: 'Measure definition'
  },
  visit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    validate: {
      isUUID: 4
    },
    comment: 'Optional: Visit when measure was taken'
  },
  measured_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    validate: {
      isDate: true,
      notInFuture(value) {
        if (new Date(value) > new Date()) {
          throw new Error('Measurement date cannot be in the future');
        }
      }
    },
    comment: 'When the measurement was taken'
  },
  // Polymorphic value storage
  numeric_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    validate: {
      isDecimal: true
    },
    comment: 'For numeric measure types'
  },
  text_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'For text measure types'
  },
  boolean_value: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'For boolean measure types'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional notes about this measurement'
  },
  recorded_by: {
    type: DataTypes.UUID,
    allowNull: false,
    validate: {
      notEmpty: true,
      isUUID: 4
    },
    comment: 'User who recorded this measure'
  }
}, {
  tableName: 'patient_measures',
  timestamps: true,
  underscored: true,
  paranoid: true, // Soft delete support
  indexes: [
    {
      fields: ['patient_id', 'measured_at'],
      name: 'patient_measures_patient_date'
    },
    {
      fields: ['measure_definition_id', 'measured_at'],
      name: 'patient_measures_definition_date'
    },
    {
      fields: ['patient_id', 'measure_definition_id', 'measured_at'],
      name: 'patient_measures_composite'
    }
  ],
  hooks: {
    beforeValidate: (instance, options) => {
      // Ensure at least one value field is set based on measure type
      const hasNumeric = instance.numeric_value !== null && instance.numeric_value !== undefined;
      const hasText = instance.text_value !== null && instance.text_value !== undefined && instance.text_value.trim() !== '';
      const hasBoolean = instance.boolean_value !== null && instance.boolean_value !== undefined;

      if (!hasNumeric && !hasText && !hasBoolean) {
        throw new Error('At least one value field must be set (numeric_value, text_value, or boolean_value)');
      }
    }
  }
});

/**
 * Get the appropriate value based on measure type
 * @param {string} measureType - Type from MeasureDefinition
 * @returns {*} The appropriate value
 */
PatientMeasure.prototype.getValue = function(measureType) {
  switch (measureType) {
    case 'numeric':
    case 'calculated':
      return this.numeric_value;
    case 'text':
      return this.text_value;
    case 'boolean':
      return this.boolean_value;
    default:
      return null;
  }
};

/**
 * Set the appropriate value based on measure type
 * @param {string} measureType - Type from MeasureDefinition
 * @param {*} value - Value to set
 */
PatientMeasure.prototype.setValue = function(measureType, value) {
  // Clear all value fields first
  this.numeric_value = null;
  this.text_value = null;
  this.boolean_value = null;

  // Set the appropriate field
  switch (measureType) {
    case 'numeric':
    case 'calculated':
      this.numeric_value = value;
      break;
    case 'text':
      this.text_value = value;
      break;
    case 'boolean':
      this.boolean_value = value;
      break;
  }
};

/**
 * Format value for display
 * @param {Object} measureDefinition - MeasureDefinition instance
 * @returns {string} Formatted value
 */
PatientMeasure.prototype.formatValue = function(measureDefinition) {
  const value = this.getValue(measureDefinition.measure_type);

  if (value === null || value === undefined) {
    return '-';
  }

  switch (measureDefinition.measure_type) {
    case 'numeric':
    case 'calculated':
      const decimalPlaces = measureDefinition.decimal_places || 2;
      const formattedNumber = parseFloat(value).toFixed(decimalPlaces);
      return measureDefinition.unit
        ? `${formattedNumber} ${measureDefinition.unit}`
        : formattedNumber;

    case 'text':
      return value;

    case 'boolean':
      return value ? 'Yes' : 'No';

    default:
      return String(value);
  }
};

module.exports = PatientMeasure;
