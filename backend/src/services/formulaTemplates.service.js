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

module.exports = {
  getTemplates,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getCategories,
  applyTemplate
};
