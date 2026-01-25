/**
 * Measures Fixtures
 * Test data for measure-related tests
 */

/**
 * Valid measure definition
 */
const validMeasure = {
  code: 'WEIGHT',
  name: 'Weight',
  display_name: 'Weight',
  description: 'Body weight in kilograms',
  unit: 'kg',
  category: 'anthropometric',
  data_type: 'number',
  min_value: 0,
  max_value: 500,
  precision: 1,
  is_system: false,
  is_active: true,
  display_order: 1
};

/**
 * System measures (typically seeded)
 */
const systemMeasures = [
  {
    code: 'WEIGHT',
    name: 'Weight',
    display_name: 'Weight',
    description: 'Body weight',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'number',
    min_value: 0,
    max_value: 500,
    precision: 1,
    is_system: true,
    is_active: true,
    display_order: 1
  },
  {
    code: 'HEIGHT',
    name: 'Height',
    display_name: 'Height',
    description: 'Body height',
    unit: 'cm',
    category: 'anthropometric',
    data_type: 'number',
    min_value: 0,
    max_value: 300,
    precision: 1,
    is_system: true,
    is_active: true,
    display_order: 2
  },
  {
    code: 'BMI',
    name: 'Body Mass Index',
    display_name: 'Body Mass Index (BMI)',
    description: 'Calculated BMI',
    unit: 'kg/m²',
    category: 'calculated',
    data_type: 'number',
    min_value: 0,
    max_value: 100,
    precision: 1,
    is_system: true,
    is_active: true,
    display_order: 3,
    formula: 'WEIGHT / ((HEIGHT / 100) ^ 2)'
  },
  {
    code: 'BODY_FAT',
    name: 'Body Fat Percentage',
    display_name: 'Body Fat %',
    description: 'Body fat as percentage',
    unit: '%',
    category: 'body_composition',
    data_type: 'number',
    min_value: 0,
    max_value: 100,
    precision: 1,
    is_system: true,
    is_active: true,
    display_order: 4
  },
  {
    code: 'WAIST',
    name: 'Waist Circumference',
    display_name: 'Waist Circumference',
    description: 'Waist measurement',
    unit: 'cm',
    category: 'anthropometric',
    data_type: 'number',
    min_value: 0,
    max_value: 300,
    precision: 1,
    is_system: true,
    is_active: true,
    display_order: 5
  }
];

/**
 * Custom measures (user-defined)
 */
const customMeasures = [
  {
    code: 'BLOOD_GLUCOSE_FASTING',
    name: 'Fasting Blood Glucose',
    display_name: 'Fasting Blood Glucose',
    description: 'Blood glucose level after fasting',
    unit: 'mg/dL',
    category: 'biochemical',
    data_type: 'number',
    min_value: 0,
    max_value: 1000,
    precision: 0,
    is_system: false,
    is_active: true,
    display_order: 10
  },
  {
    code: 'ENERGY_LEVEL',
    name: 'Energy Level',
    display_name: 'Energy Level',
    description: 'Self-reported energy level',
    unit: 'scale',
    category: 'subjective',
    data_type: 'number',
    min_value: 1,
    max_value: 10,
    precision: 0,
    is_system: false,
    is_active: true,
    display_order: 11
  }
];

/**
 * Patient measure values
 */
const patientMeasures = {
  weight: {
    value: 75.5,
    measured_at: new Date().toISOString(),
    notes: 'Morning weight, after breakfast'
  },
  height: {
    value: 175,
    measured_at: new Date().toISOString(),
    notes: 'Measured without shoes'
  },
  bodyFat: {
    value: 22.5,
    measured_at: new Date().toISOString(),
    notes: 'Measured with bioimpedance scale'
  },
  waist: {
    value: 85,
    measured_at: new Date().toISOString(),
    notes: 'Measured at navel level'
  }
};

/**
 * Measure timeline (for trend testing)
 */
function getMeasureTimeline(measureDefinitionId, patientId) {
  const now = new Date();
  return [
    {
      measure_definition_id: measureDefinitionId,
      patient_id: patientId,
      value: 80.0,
      measured_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago
    },
    {
      measure_definition_id: measureDefinitionId,
      patient_id: patientId,
      value: 78.5,
      measured_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days ago
    },
    {
      measure_definition_id: measureDefinitionId,
      patient_id: patientId,
      value: 77.0,
      measured_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    },
    {
      measure_definition_id: measureDefinitionId,
      patient_id: patientId,
      value: 75.5,
      measured_at: new Date().toISOString() // Now
    }
  ];
}

/**
 * Invalid measure definitions
 */
const invalidMeasures = {
  missingCode: {
    name: 'Missing Code Measure',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'number'
  },
  missingName: {
    code: 'MISSING_NAME',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'number'
  },
  invalidDataType: {
    code: 'INVALID_TYPE',
    name: 'Invalid Type Measure',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'invalid_type'
  },
  minGreaterThanMax: {
    code: 'MIN_MAX_ERROR',
    name: 'Min Max Error Measure',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'number',
    min_value: 100,
    max_value: 0
  },
  duplicateCode: {
    code: 'WEIGHT', // Duplicate
    name: 'Duplicate Weight',
    unit: 'kg',
    category: 'anthropometric',
    data_type: 'number'
  }
};

/**
 * Invalid patient measure values
 */
const invalidPatientMeasures = {
  belowMin: {
    value: -5,
    measured_at: new Date().toISOString()
  },
  aboveMax: {
    value: 1000,
    measured_at: new Date().toISOString()
  },
  missingValue: {
    measured_at: new Date().toISOString()
  },
  invalidDate: {
    value: 75,
    measured_at: 'not-a-date'
  }
};

/**
 * Measure definition updates
 */
const measureUpdates = {
  updateName: {
    name: 'Updated Measure Name'
  },
  updateRange: {
    min_value: 10,
    max_value: 200
  },
  deactivate: {
    is_active: false
  },
  updatePrecision: {
    precision: 2
  }
};

/**
 * Alert thresholds
 */
const alertThresholds = {
  weight: {
    warning_min: 50,
    warning_max: 100,
    critical_min: 40,
    critical_max: 150
  },
  bmi: {
    warning_min: 18.5,
    warning_max: 25,
    critical_min: 16,
    critical_max: 35
  }
};

/**
 * Measure translations
 */
const measureTranslations = {
  en: {
    name: 'Weight',
    description: 'Body weight in kilograms',
    unit_label: 'kg'
  },
  fr: {
    name: 'Poids',
    description: 'Poids corporel en kilogrammes',
    unit_label: 'kg'
  }
};

module.exports = {
  validMeasure,
  systemMeasures,
  customMeasures,
  patientMeasures,
  getMeasureTimeline,
  invalidMeasures,
  invalidPatientMeasures,
  measureUpdates,
  alertThresholds,
  measureTranslations
};
