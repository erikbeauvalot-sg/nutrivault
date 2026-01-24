/**
 * Measure Utilities
 * Helper functions for measure display and formatting
 */

/**
 * Get badge variant for measure category
 * @param {string} category - Category name (vitals, lab_results, symptoms, anthropometric, lifestyle, other)
 * @returns {string} Bootstrap badge variant
 */
export const getCategoryBadgeVariant = (category) => {
  const categoryMap = {
    vitals: 'danger',
    lab_results: 'primary',
    symptoms: 'warning',
    anthropometric: 'success',
    lifestyle: 'info',
    other: 'secondary'
  };

  return categoryMap[category] || 'secondary';
};

/**
 * Get display name for measure category
 * @param {string} category - Category name
 * @param {function} t - Translation function
 * @returns {string} Translated category name
 */
export const getCategoryDisplayName = (category, t) => {
  const categoryTranslationKeys = {
    vitals: 'measures.categories.vitals',
    lab_results: 'measures.categories.labResults',
    symptoms: 'measures.categories.symptoms',
    anthropometric: 'measures.categories.anthropometric',
    lifestyle: 'measures.categories.lifestyle',
    other: 'measures.categories.other'
  };

  return t(categoryTranslationKeys[category], category);
};
