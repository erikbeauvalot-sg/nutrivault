/**
 * Date formatting utilities
 * Handles locale-specific date formatting for the application
 */

/**
 * Format a date string according to the current locale
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted date string (DD/MM/YYYY for fr, MM/DD/YYYY for en)
 */
export const formatDate = (dateString, language = 'en') => {
  if (!dateString) return '-';
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale);
};

/**
 * Format a date string with time according to the current locale
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateString, language = 'en') => {
  if (!dateString) return '-';
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Date(dateString).toLocaleString(locale);
};
