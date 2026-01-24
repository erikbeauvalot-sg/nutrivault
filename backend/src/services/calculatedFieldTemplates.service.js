/**
 * Calculated Field Templates Service
 *
 * Provides pre-built formula templates for common calculations
 */

/**
 * Template definitions
 */
const TEMPLATES = {
  bmi: {
    id: 'bmi',
    name: 'BMI (Body Mass Index)',
    description: 'Calculates BMI from weight (kg) and height (m)',
    formula: '{weight} / ({height} * {height})',
    dependencies: ['weight', 'height'],
    decimal_places: 2,
    category: 'health',
    example: {
      weight: 70,
      height: 1.75,
      result: 22.86
    },
    help_text: 'Weight in kilograms, height in meters'
  },

  age_from_birth_date: {
    id: 'age_from_birth_date',
    name: 'Age from Birth Date',
    description: 'Calculates age in years from birth date',
    formula: 'floor(({current_year} - {birth_year}) + (({current_month} - {birth_month}) / 12))',
    dependencies: ['current_year', 'birth_year', 'current_month', 'birth_month'],
    decimal_places: 0,
    category: 'date',
    example: {
      current_year: 2026,
      birth_year: 1990,
      current_month: 1,
      birth_month: 6,
      result: 35
    },
    help_text: 'Requires year and month fields for current date and birth date',
    note: 'For more accurate age calculation with days, use date field type instead'
  },

  percentage: {
    id: 'percentage',
    name: 'Percentage',
    description: 'Calculates percentage (numerator / denominator * 100)',
    formula: '({numerator} / {denominator}) * 100',
    dependencies: ['numerator', 'denominator'],
    decimal_places: 2,
    category: 'math',
    example: {
      numerator: 75,
      denominator: 100,
      result: 75.00
    },
    help_text: 'Result as percentage value'
  },

  total_sum: {
    id: 'total_sum',
    name: 'Total (Sum)',
    description: 'Adds multiple values together',
    formula: '{value1} + {value2} + {value3}',
    dependencies: ['value1', 'value2', 'value3'],
    decimal_places: 2,
    category: 'math',
    example: {
      value1: 10,
      value2: 20,
      value3: 30,
      result: 60
    },
    help_text: 'Modify formula to add more or fewer values',
    customizable: true
  },

  average: {
    id: 'average',
    name: 'Average (Mean)',
    description: 'Calculates average of multiple values',
    formula: '({value1} + {value2} + {value3}) / 3',
    dependencies: ['value1', 'value2', 'value3'],
    decimal_places: 2,
    category: 'math',
    example: {
      value1: 10,
      value2: 20,
      value3: 30,
      result: 20.00
    },
    help_text: 'Modify formula to average more or fewer values',
    customizable: true
  },

  difference: {
    id: 'difference',
    name: 'Difference',
    description: 'Calculates difference between two values',
    formula: '{value1} - {value2}',
    dependencies: ['value1', 'value2'],
    decimal_places: 2,
    category: 'math',
    example: {
      value1: 100,
      value2: 75,
      result: 25
    },
    help_text: 'Subtract second value from first'
  },

  ratio: {
    id: 'ratio',
    name: 'Ratio',
    description: 'Calculates ratio of two values',
    formula: '{value1} / {value2}',
    dependencies: ['value1', 'value2'],
    decimal_places: 2,
    category: 'math',
    example: {
      value1: 100,
      value2: 50,
      result: 2.00
    },
    help_text: 'Division of first value by second'
  },

  bmi_category_score: {
    id: 'bmi_category_score',
    name: 'BMI Category Score',
    description: 'Simplified BMI category scoring',
    formula: 'round({bmi} / 5, 0)',
    dependencies: ['bmi'],
    decimal_places: 0,
    category: 'health',
    example: {
      bmi: 22.86,
      result: 5
    },
    help_text: 'Score 1-10 based on BMI (requires BMI field)',
    note: 'For demonstration - not medically accurate'
  },

  calorie_deficit: {
    id: 'calorie_deficit',
    name: 'Calorie Deficit/Surplus',
    description: 'Calculates calorie difference (consumed - burned)',
    formula: '{calories_consumed} - {calories_burned}',
    dependencies: ['calories_consumed', 'calories_burned'],
    decimal_places: 0,
    category: 'nutrition',
    example: {
      calories_consumed: 2000,
      calories_burned: 2200,
      result: -200
    },
    help_text: 'Negative = deficit, Positive = surplus'
  },

  protein_per_kg: {
    id: 'protein_per_kg',
    name: 'Protein per kg Body Weight',
    description: 'Calculates protein intake per kilogram of body weight',
    formula: '{protein_grams} / {weight}',
    dependencies: ['protein_grams', 'weight'],
    decimal_places: 2,
    category: 'nutrition',
    example: {
      protein_grams: 140,
      weight: 70,
      result: 2.00
    },
    help_text: 'Protein in grams, weight in kilograms'
  }
};

/**
 * Get all available templates
 * @returns {Array} Array of template objects
 */
function getAllTemplates() {
  return Object.values(TEMPLATES);
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template object or null if not found
 */
function getTemplateById(templateId) {
  return TEMPLATES[templateId] || null;
}

/**
 * Get templates by category
 * @param {string} category - Category name
 * @returns {Array} Array of template objects
 */
function getTemplatesByCategory(category) {
  return Object.values(TEMPLATES).filter(t => t.category === category);
}

/**
 * Get all categories
 * @returns {Array} Array of unique category names
 */
function getCategories() {
  const categories = new Set();
  Object.values(TEMPLATES).forEach(t => categories.add(t.category));
  return Array.from(categories);
}

/**
 * Apply a template to create field definition data
 * @param {string} templateId - Template ID
 * @param {Object} fieldMapping - Map of template variables to actual field names
 * @returns {Object} Field definition data
 */
function applyTemplate(templateId, fieldMapping = {}) {
  const template = getTemplateById(templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Replace template variable names with actual field names
  let formula = template.formula;
  const actualDependencies = [];

  template.dependencies.forEach(templateVar => {
    const actualFieldName = fieldMapping[templateVar] || templateVar;
    actualDependencies.push(actualFieldName);

    // Replace {template_var} with {actual_field_name}
    const regex = new RegExp(`\\{${templateVar}\\}`, 'g');
    formula = formula.replace(regex, `{${actualFieldName}}`);
  });

  return {
    formula,
    dependencies: actualDependencies,
    decimal_places: template.decimal_places,
    help_text: template.help_text || template.description,
    is_calculated: true
  };
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getCategories,
  applyTemplate
};
