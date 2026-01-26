/**
 * Measure Service
 * API calls for measure definitions and patient measure values
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

import api from './api';

// ===========================================
// Measure Definition API Calls
// ===========================================

/**
 * Get all measure definitions
 * @param {object} filters - Filter parameters (category, is_active, measure_type)
 * @returns {Promise<Array>} Array of measure definitions
 */
export const getMeasureDefinitions = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const queryString = params.toString();
  const response = await api.get(`/api/measures${queryString ? '?' + queryString : ''}`);
  return response.data.data || response.data;
};

/**
 * Get measure definition by ID
 * @param {string} id - Measure definition UUID
 * @returns {Promise<object>} Measure definition object
 */
export const getMeasureDefinitionById = async (id) => {
  const response = await api.get(`/api/measures/${id}`);
  return response.data.data || response.data;
};

/**
 * Create a new measure definition
 * @param {object} measureData - Measure definition information
 * @returns {Promise<object>} Created measure definition
 */
export const createMeasureDefinition = async (measureData) => {
  const response = await api.post('/api/measures', measureData);
  return response.data;
};

/**
 * Update existing measure definition
 * @param {string} id - Measure definition UUID
 * @param {object} measureData - Updated measure information
 * @returns {Promise<object>} Updated measure definition
 */
export const updateMeasureDefinition = async (id, measureData) => {
  const response = await api.put(`/api/measures/${id}`, measureData);
  return response.data;
};

/**
 * Delete measure definition (soft delete)
 * @param {string} id - Measure definition UUID
 * @returns {Promise<void>}
 */
export const deleteMeasureDefinition = async (id) => {
  const response = await api.delete(`/api/measures/${id}`);
  return response.data;
};

/**
 * Get measure definitions by category
 * @param {string} category - Category name (vitals, lab_results, etc.)
 * @returns {Promise<Array>} Array of measure definitions
 */
export const getMeasuresByCategory = async (category) => {
  const response = await api.get(`/api/measures/category/${category}`);
  return response.data.data || response.data;
};

/**
 * Get all categories with counts
 * @returns {Promise<Array>} Array of categories with measure counts
 */
export const getMeasureCategories = async () => {
  const response = await api.get('/api/measures/categories');
  return response.data.data || response.data;
};

// ===========================================
// Patient Measure API Calls
// ===========================================

/**
 * Log a new measure value for a patient
 * @param {string} patientId - Patient UUID
 * @param {object} measureData - Measure data (measure_definition_id, value, measured_at, etc.)
 * @returns {Promise<object>} Created measure
 */
export const logPatientMeasure = async (patientId, measureData) => {
  const response = await api.post(`/api/patients/${patientId}/measures`, measureData);
  return response.data;
};

/**
 * Get all measures for a patient
 * @param {string} patientId - Patient UUID
 * @param {object} filters - Filter parameters (measure_definition_id, visit_id, start_date, end_date, limit)
 * @returns {Promise<Array>} Array of patient measures
 */
export const getPatientMeasures = async (patientId, filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const queryString = params.toString();
  const response = await api.get(`/api/patients/${patientId}/measures${queryString ? '?' + queryString : ''}`);
  return response.data.data || response.data;
};

/**
 * Get measure history for a specific measure type
 * @param {string} patientId - Patient UUID
 * @param {string} measureDefId - Measure definition UUID
 * @param {object} dateRange - { start_date, end_date } (ISO format)
 * @returns {Promise<Array>} Array of measures ordered by date
 */
export const getMeasureHistory = async (patientId, measureDefId, dateRange = {}) => {
  const params = new URLSearchParams();
  if (dateRange.start_date) params.append('start_date', dateRange.start_date);
  if (dateRange.end_date) params.append('end_date', dateRange.end_date);

  const queryString = params.toString();
  const response = await api.get(
    `/api/patients/${patientId}/measures/${measureDefId}/history${queryString ? '?' + queryString : ''}`
  );
  return response.data.data || response.data;
};

/**
 * Get trend analysis for a specific measure
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 * @param {string} patientId - Patient UUID
 * @param {string} measureDefId - Measure definition UUID
 * @param {object} options - { start_date, end_date, includeMA, includeTrendLine }
 * @returns {Promise<object>} Trend analysis data with statistics, moving averages, and trend line
 */
export const getMeasureTrend = async (patientId, measureDefId, options = {}) => {
  const params = new URLSearchParams();
  if (options.start_date) params.append('start_date', options.start_date);
  if (options.end_date) params.append('end_date', options.end_date);
  if (options.includeMA !== undefined) params.append('includeMA', options.includeMA);
  if (options.includeTrendLine !== undefined) params.append('includeTrendLine', options.includeTrendLine);

  const queryString = params.toString();
  const response = await api.get(
    `/api/patients/${patientId}/measures/${measureDefId}/trend${queryString ? '?' + queryString : ''}`
  );
  return response.data.data || response.data;
};

/**
 * Update a patient measure
 * @param {string} measureId - Patient measure UUID
 * @param {object} measureData - Updated measure data
 * @returns {Promise<object>} Updated measure
 */
export const updatePatientMeasure = async (measureId, measureData) => {
  const response = await api.put(`/api/patient-measures/${measureId}`, measureData);
  return response.data;
};

/**
 * Delete a patient measure (soft delete)
 * @param {string} measureId - Patient measure UUID
 * @returns {Promise<void>}
 */
export const deletePatientMeasure = async (measureId) => {
  const response = await api.delete(`/api/patient-measures/${measureId}`);
  return response.data;
};

/**
 * Get measures by visit
 * @param {string} visitId - Visit UUID
 * @returns {Promise<Array>} Array of measures for the visit
 */
export const getMeasuresByVisit = async (visitId) => {
  const response = await api.get(`/api/visits/${visitId}/measures`);
  return response.data.data || response.data;
};

/**
 * Format measure value for display
 * @param {object} measure - Measure object with value
 * @param {object} definition - Measure definition with unit and decimal_places
 * @returns {string} Formatted value
 */
export const formatMeasureValue = (measure, definition) => {
  if (!measure || !definition) return '-';

  let value;
  switch (definition.measure_type) {
    case 'numeric':
    case 'calculated':
      value = measure.numeric_value;
      if (value === null || value === undefined) return '-';
      // Use ?? instead of || so that 0 decimal places is respected
      const decimalPlaces = definition.decimal_places ?? 2;
      const formattedNumber = parseFloat(value).toFixed(decimalPlaces);
      return definition.unit ? `${formattedNumber} ${definition.unit}` : formattedNumber;

    case 'text':
      value = measure.text_value;
      return value || '-';

    case 'boolean':
      value = measure.boolean_value;
      return value ? 'Yes' : 'No';

    default:
      return '-';
  }
};

/**
 * Get the appropriate value field based on measure type
 * @param {object} measure - Measure object
 * @param {string} measureType - Type (numeric, text, boolean, calculated)
 * @returns {*} The value
 */
export const getMeasureValue = (measure, measureType) => {
  if (!measure) return null;

  switch (measureType) {
    case 'numeric':
    case 'calculated':
      return measure.numeric_value;
    case 'text':
      return measure.text_value;
    case 'boolean':
      return measure.boolean_value;
    default:
      return null;
  }
};

// ===========================================
// Formula API Calls (Sprint 4: US-5.4.2)
// ===========================================

/**
 * Validate formula syntax
 * @param {string} formula - Formula string to validate
 * @returns {Promise<object>} { valid: boolean, error: string|null, dependencies: string[] }
 */
export const validateFormula = async (formula) => {
  const response = await api.post('/api/formulas/validate', { formula });
  return response.data.data || response.data;
};

/**
 * Preview formula with sample values
 * @param {string} formula - Formula string
 * @param {object} values - Sample values map
 * @returns {Promise<object>} { success: boolean, result: number|null, error: string|null }
 */
export const previewFormula = async (formula, values) => {
  const response = await api.post('/api/formulas/preview', { formula, values });
  return response.data.data || response.data;
};

/**
 * Get formula templates for measures
 * @returns {Promise<Array>} Array of measure template objects
 */
export const getMeasureTemplates = async () => {
  const response = await api.get('/api/formulas/templates/measures');
  return response.data.data || response.data;
};

/**
 * Recalculate all calculated measures for a patient
 * @param {string} patientId - Patient UUID
 * @returns {Promise<object>} { count: number, calculated: Array }
 */
export const recalculatePatientMeasures = async (patientId) => {
  const response = await api.post(`/api/patient-measures/${patientId}/recalculate`);
  return response.data.data || response.data;
};

/**
 * Bulk recalculate measure across all patients
 * @param {string} measureDefinitionId - Measure definition UUID
 * @returns {Promise<object>} { patientsAffected: number, valuesCalculated: number }
 */
export const recalculateMeasureAcrossAll = async (measureDefinitionId) => {
  const response = await api.post(`/api/measures/${measureDefinitionId}/recalculate-all`);
  return response.data.data || response.data;
};

// ===========================================
// Translation API Calls (Sprint 4: US-5.4.2)
// ===========================================

/**
 * Get all translations for a measure (all languages)
 * @param {string} measureId - Measure definition UUID
 * @returns {Promise<object>} { en: {...}, fr: {...}, ... }
 */
export const getAllMeasureTranslations = async (measureId) => {
  const response = await api.get(`/api/measures/${measureId}/translations`);
  return response.data.data || response.data;
};

/**
 * Get translations for a measure in a specific language
 * @param {string} measureId - Measure definition UUID
 * @param {string} languageCode - Language code (e.g., 'fr', 'en')
 * @returns {Promise<object>} { display_name: '...', description: '...', unit: '...' }
 */
export const getMeasureTranslations = async (measureId, languageCode) => {
  const response = await api.get(`/api/measures/${measureId}/translations/${languageCode}`);
  return response.data.data || response.data;
};

/**
 * Set translations for a measure (bulk)
 * @param {string} measureId - Measure definition UUID
 * @param {string} languageCode - Language code
 * @param {object} translations - { display_name: '...', description: '...', unit: '...' }
 * @returns {Promise<object>} Updated translations
 */
export const setMeasureTranslations = async (measureId, languageCode, translations) => {
  const response = await api.post(`/api/measures/${measureId}/translations/${languageCode}`, translations);
  return response.data.data || response.data;
};

/**
 * Set a single translation field
 * @param {string} measureId - Measure definition UUID
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name (display_name, description, unit)
 * @param {string} value - Translated value
 * @returns {Promise<object>} Updated translation
 */
export const setMeasureTranslation = async (measureId, languageCode, fieldName, value) => {
  const response = await api.put(`/api/measures/${measureId}/translations/${languageCode}/${fieldName}`, { value });
  return response.data.data || response.data;
};

/**
 * Delete a translation
 * @param {string} translationId - Translation UUID
 * @returns {Promise<void>}
 */
export const deleteMeasureTranslation = async (translationId) => {
  const response = await api.delete(`/api/measures/translations/${translationId}`);
  return response.data;
};

/**
 * Get measure with translations applied
 * @param {string} measureId - Measure definition UUID
 * @param {string} languageCode - Language code
 * @param {string} fallbackLanguage - Fallback language (default: 'en')
 * @returns {Promise<object>} Measure with translated fields
 */
export const getMeasureWithTranslations = async (measureId, languageCode, fallbackLanguage = 'en') => {
  const response = await api.get(`/api/measures/${measureId}/translated/${languageCode}?fallback=${fallbackLanguage}`);
  return response.data.data || response.data;
};
