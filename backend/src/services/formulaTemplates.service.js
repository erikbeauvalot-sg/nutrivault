/**
 * Formula Templates Service
 *
 * Provides pre-built formula templates for common calculations.
 * Templates can be used as starting points for calculated custom fields.
 */

/**
 * Get all available formula templates
 * @returns {Array} Array of template objects
 */
function getTemplates() {
  return [
    {
      id: 'bmi',
      name: 'BMI (Body Mass Index)',
      category: 'health',
      description: 'Calculate BMI from weight (kg) and height (m)',
      formula: '{weight_kg} / ({height_m} * {height_m})',
      dependencies: ['weight_kg', 'height_m'],
      decimalPlaces: 2,
      unit: 'kg/m²',
      helpText: 'Requires weight in kilograms and height in meters'
    },
    {
      id: 'bmi_cm',
      name: 'BMI (with height in cm)',
      category: 'health',
      description: 'Calculate BMI from weight (kg) and height (cm)',
      formula: '{weight_kg} / (({height_cm} / 100) * ({height_cm} / 100))',
      dependencies: ['weight_kg', 'height_cm'],
      decimalPlaces: 2,
      unit: 'kg/m²',
      helpText: 'Requires weight in kilograms and height in centimeters'
    },
    {
      id: 'age_years',
      name: 'Age in Years',
      category: 'demographics',
      description: 'Calculate age from birth date',
      formula: '(today() - {birth_date_days}) / 365.25',
      dependencies: ['birth_date_days'],
      decimalPlaces: 0,
      unit: 'years',
      helpText: 'Requires birth date as days since epoch (use date field)'
    },
    {
      id: 'weight_loss',
      name: 'Weight Loss',
      category: 'progress',
      description: 'Calculate weight loss from initial and current weight',
      formula: '{initial_weight} - {current_weight}',
      dependencies: ['initial_weight', 'current_weight'],
      decimalPlaces: 1,
      unit: 'kg',
      helpText: 'Positive values indicate weight loss'
    },
    {
      id: 'weight_loss_percent',
      name: 'Weight Loss Percentage',
      category: 'progress',
      description: 'Calculate percentage of weight lost',
      formula: '(({initial_weight} - {current_weight}) / {initial_weight}) * 100',
      dependencies: ['initial_weight', 'current_weight'],
      decimalPlaces: 1,
      unit: '%',
      helpText: 'Percentage of initial weight lost'
    },
    {
      id: 'bmi_change',
      name: 'BMI Change',
      category: 'progress',
      description: 'Calculate change in BMI',
      formula: '{current_bmi} - {initial_bmi}',
      dependencies: ['initial_bmi', 'current_bmi'],
      decimalPlaces: 1,
      unit: 'kg/m²',
      helpText: 'Difference between current and initial BMI'
    },
    {
      id: 'waist_hip_ratio',
      name: 'Waist-to-Hip Ratio',
      category: 'health',
      description: 'Calculate waist-to-hip ratio',
      formula: '{waist_circumference} / {hip_circumference}',
      dependencies: ['waist_circumference', 'hip_circumference'],
      decimalPlaces: 2,
      unit: 'ratio',
      helpText: 'Important indicator for cardiovascular health'
    },
    {
      id: 'calorie_deficit',
      name: 'Calorie Deficit',
      category: 'nutrition',
      description: 'Calculate daily calorie deficit',
      formula: '{tdee} - {calories_consumed}',
      dependencies: ['tdee', 'calories_consumed'],
      decimalPlaces: 0,
      unit: 'kcal',
      helpText: 'TDEE minus calories consumed'
    },
    {
      id: 'protein_per_kg',
      name: 'Protein per kg Body Weight',
      category: 'nutrition',
      description: 'Calculate protein intake per kg of body weight',
      formula: '{protein_grams} / {weight_kg}',
      dependencies: ['protein_grams', 'weight_kg'],
      decimalPlaces: 2,
      unit: 'g/kg',
      helpText: 'Recommended: 0.8-2.0 g/kg depending on goals'
    },
    {
      id: 'ideal_weight_range',
      name: 'Ideal Weight (Mid-range)',
      category: 'health',
      description: 'Calculate ideal weight based on height (middle of healthy BMI range)',
      formula: '22 * ({height_m} * {height_m})',
      dependencies: ['height_m'],
      decimalPlaces: 1,
      unit: 'kg',
      helpText: 'Based on BMI of 22 (middle of healthy range 18.5-25)'
    }
  ];
}

/**
 * Get a template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template object or null if not found
 */
function getTemplateById(templateId) {
  const templates = getTemplates();
  return templates.find(t => t.id === templateId) || null;
}

/**
 * Get templates by category
 * @param {string} category - Category name
 * @returns {Array} Array of templates in the category
 */
function getTemplatesByCategory(category) {
  const templates = getTemplates();
  return templates.filter(t => t.category === category);
}

/**
 * Get all categories
 * @returns {Array} Array of unique category names
 */
function getCategories() {
  const templates = getTemplates();
  const categories = [...new Set(templates.map(t => t.category))];
  return categories.sort();
}

/**
 * Apply a template with optional field mapping
 * @param {string} templateId - Template ID
 * @param {Object} fieldMapping - Optional mapping of template fields to actual field names
 * @returns {Object} Template with applied mapping
 */
function applyTemplate(templateId, fieldMapping = {}) {
  const template = getTemplateById(templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // If no field mapping provided, return template as-is
  if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
    return template;
  }

  // Apply field mapping to formula
  let mappedFormula = template.formula;
  let mappedDependencies = [...template.dependencies];

  for (const [templateField, actualField] of Object.entries(fieldMapping)) {
    // Replace in formula
    const regex = new RegExp(`\\{${templateField}\\}`, 'g');
    mappedFormula = mappedFormula.replace(regex, `{${actualField}}`);

    // Update dependencies
    const depIndex = mappedDependencies.indexOf(templateField);
    if (depIndex !== -1) {
      mappedDependencies[depIndex] = actualField;
    }
  }

  return {
    ...template,
    formula: mappedFormula,
    dependencies: mappedDependencies,
    fieldMapping
  };
}

/**
 * Get all templates (alias for getTemplates for compatibility)
 * @returns {Array} Array of template objects
 */
function getAllTemplates() {
  return getTemplates();
}

/**
 * Get formula templates specifically for calculated measures
 * These templates use measure names (not custom field names)
 * @returns {Array} Array of measure template objects
 */
function getMeasureTemplates() {
  return [
    {
      id: 'bmi',
      name: 'Body Mass Index (BMI)',
      description: 'BMI = weight (kg) / height (m)²',
      formula: '{weight} / ({height} * {height})',
      dependencies: ['weight', 'height'],
      unit: 'kg/m²',
      category: 'anthropometric',
      decimalPlaces: 2,
      helpText: 'Requires weight and height measures. Standard formula for Body Mass Index.'
    },
    {
      id: 'weight_change',
      name: 'Weight Change',
      description: 'Current weight - Previous weight',
      formula: '{current:weight} - {previous:weight}',
      dependencies: ['weight'],
      unit: 'kg',
      category: 'trends',
      decimalPlaces: 1,
      helpText: 'Time-series calculation showing weight change from previous measurement.'
    },
    {
      id: 'weight_delta_percent',
      name: 'Weight Change Percentage',
      description: '((Current - Previous) / Previous) × 100',
      formula: '(({current:weight} - {previous:weight}) / {previous:weight}) * 100',
      dependencies: ['weight'],
      unit: '%',
      category: 'trends',
      decimalPlaces: 1,
      helpText: 'Percentage change in weight from previous measurement.'
    },
    {
      id: 'weight_trend',
      name: 'Weight Trend (30-day avg)',
      description: 'Current weight - 30-day average',
      formula: '{current:weight} - {avg30:weight}',
      dependencies: ['weight'],
      unit: 'kg',
      category: 'trends',
      decimalPlaces: 1,
      helpText: 'Difference between current weight and 30-day rolling average.'
    },
    {
      id: 'bsa_mosteller',
      name: 'Body Surface Area (Mosteller)',
      description: 'BSA = √((height × weight) / 3600)',
      formula: 'sqrt(({height} * {weight}) / 3600)',
      dependencies: ['height', 'weight'],
      unit: 'm²',
      category: 'anthropometric',
      decimalPlaces: 2,
      helpText: 'Mosteller formula for Body Surface Area. Height in cm, weight in kg.'
    },
    {
      id: 'bsa_dubois',
      name: 'Body Surface Area (DuBois)',
      description: 'BSA = 0.007184 × height^0.725 × weight^0.425',
      formula: '0.007184 * ({height} ^ 0.725) * ({weight} ^ 0.425)',
      dependencies: ['height', 'weight'],
      unit: 'm²',
      category: 'anthropometric',
      decimalPlaces: 2,
      helpText: 'DuBois formula for Body Surface Area. Height in cm, weight in kg.'
    },
    {
      id: 'map',
      name: 'Mean Arterial Pressure',
      description: 'MAP = DBP + (SBP - DBP) / 3',
      formula: '{diastolic_bp} + ({systolic_bp} - {diastolic_bp}) / 3',
      dependencies: ['systolic_bp', 'diastolic_bp'],
      unit: 'mmHg',
      category: 'vitals',
      decimalPlaces: 0,
      helpText: 'Average arterial pressure during a single cardiac cycle.'
    },
    {
      id: 'pulse_pressure',
      name: 'Pulse Pressure',
      description: 'PP = SBP - DBP',
      formula: '{systolic_bp} - {diastolic_bp}',
      dependencies: ['systolic_bp', 'diastolic_bp'],
      unit: 'mmHg',
      category: 'vitals',
      decimalPlaces: 0,
      helpText: 'Difference between systolic and diastolic blood pressure.'
    },
    {
      id: 'waist_height_ratio',
      name: 'Waist-to-Height Ratio',
      description: 'WHtR = Waist / Height',
      formula: '{waist} / {height}',
      dependencies: ['waist', 'height'],
      unit: 'ratio',
      category: 'anthropometric',
      decimalPlaces: 2,
      helpText: 'Waist-to-height ratio. Should be <0.5 for healthy individuals.'
    },
    {
      id: 'bmi_category_score',
      name: 'BMI Category Score',
      description: 'Numeric score based on BMI category',
      formula: 'round({bmi} / 5) * 5',
      dependencies: ['bmi'],
      unit: 'score',
      category: 'derived',
      decimalPlaces: 0,
      helpText: 'Rounded BMI score in 5-point increments for categorization.'
    },
    {
      id: 'heart_rate_reserve',
      name: 'Heart Rate Reserve',
      description: 'HRR = Max HR - Resting HR',
      formula: '{max_heart_rate} - {resting_heart_rate}',
      dependencies: ['max_heart_rate', 'resting_heart_rate'],
      unit: 'bpm',
      category: 'vitals',
      decimalPlaces: 0,
      helpText: 'Difference between maximum and resting heart rate.'
    },
    {
      id: 'target_heart_rate_zone',
      name: 'Target Heart Rate (60-70%)',
      description: 'THR = ((MaxHR - RestingHR) × 0.65) + RestingHR',
      formula: '(({max_heart_rate} - {resting_heart_rate}) * 0.65) + {resting_heart_rate}',
      dependencies: ['max_heart_rate', 'resting_heart_rate'],
      unit: 'bpm',
      category: 'vitals',
      decimalPlaces: 0,
      helpText: 'Target heart rate for moderate intensity exercise (mid-range 60-70%).'
    }
  ];
}

module.exports = {
  getTemplates,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getCategories,
  applyTemplate,
  getMeasureTemplates
};
