/**
 * Measure Translation Utilities
 * Helper functions to apply translations to measure definitions
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

/**
 * Apply translations to a measure definition
 * @param {object} measureDef - Original measure definition
 * @param {object} translations - Translation object { display_name, description, unit }
 * @param {string} fallbackLanguage - Fallback language (default: 'en')
 * @returns {object} Measure definition with translations applied
 */
export function applyMeasureTranslations(measureDef, translations = {}, fallbackLanguage = 'en') {
  if (!measureDef) return null;

  return {
    ...measureDef,
    display_name: translations.display_name || measureDef.display_name,
    description: translations.description || measureDef.description,
    unit: translations.unit || measureDef.unit
  };
}

/**
 * Apply translations to patient measures array
 * @param {Array} measures - Array of patient measures with MeasureDefinition
 * @param {object} allTranslations - Object with measure IDs as keys, translation objects as values
 * @param {string} languageCode - Current language code
 * @returns {Array} Measures with translated definitions
 */
export function applyTranslationsToMeasures(measures, allTranslations = {}, languageCode = 'en') {
  if (!Array.isArray(measures)) return [];

  return measures.map(measure => {
    if (!measure.MeasureDefinition) return measure;

    const measureId = measure.measure_definition_id || measure.MeasureDefinition.id;
    const translations = allTranslations[measureId]?.[languageCode] || {};

    return {
      ...measure,
      MeasureDefinition: applyMeasureTranslations(measure.MeasureDefinition, translations)
    };
  });
}

/**
 * Fetch and organize translations for multiple measures
 * @param {Array} measureIds - Array of measure definition IDs
 * @param {function} apiCall - API function to call for each measure
 * @returns {Promise<object>} Object with measure IDs as keys, translations by language as values
 */
export async function fetchMeasureTranslations(measureIds, getAllMeasureTranslationsApi) {
  const translationsMap = {};

  try {
    // Fetch translations for all measures in parallel
    const translationPromises = measureIds.map(async (measureId) => {
      try {
        const translations = await getAllMeasureTranslationsApi(measureId);
        translationsMap[measureId] = translations;
      } catch (error) {
        console.warn(`Failed to fetch translations for measure ${measureId}:`, error);
        translationsMap[measureId] = {};
      }
    });

    await Promise.all(translationPromises);
    return translationsMap;
  } catch (error) {
    console.error('Error fetching measure translations:', error);
    return {};
  }
}
