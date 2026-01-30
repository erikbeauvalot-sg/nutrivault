/**
 * Timezone Utility for NutriVault Backend
 * Centralized date/time formatting using configured timezone
 */

// Default timezone if not configured
const DEFAULT_TIMEZONE = 'Europe/Paris';

/**
 * Get the configured timezone from environment variable
 * @returns {string} IANA timezone string
 */
const getTimezone = () => {
  return process.env.TZ || DEFAULT_TIMEZONE;
};

/**
 * Get locale string based on language
 * @param {string} language - Language code ('fr', 'en', etc.)
 * @returns {string} Locale string
 */
const getLocale = (language = 'fr') => {
  const locales = {
    fr: 'fr-FR',
    en: 'en-GB', // European format (day/month/year)
    de: 'de-DE',
    es: 'es-ES',
    it: 'it-IT'
  };
  return locales[language] || locales.fr;
};

/**
 * Format a date for display (date only)
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Formatted date string (e.g., "30/01/2026")
 */
const formatDate = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString(getLocale(language), {
    timeZone: getTimezone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format a date with time for display
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Formatted datetime string (e.g., "30/01/2026, 17:00:00")
 */
const formatDateTime = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(getLocale(language), {
    timeZone: getTimezone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Format a date with time but without seconds
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Formatted datetime string (e.g., "30/01/2026, 17:00")
 */
const formatDateTimeShort = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(getLocale(language), {
    timeZone: getTimezone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Format time only
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Formatted time string (e.g., "17:00")
 */
const formatTime = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString(getLocale(language), {
    timeZone: getTimezone(),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Get current date/time in the configured timezone
 * @returns {Date} Current date adjusted for timezone display
 */
const now = () => {
  return new Date();
};

/**
 * Get current date/time as ISO string in configured timezone
 * This creates an ISO string that represents the local time in the configured timezone
 * @returns {string} ISO string representation
 */
const nowISO = () => {
  const date = new Date();
  return date.toISOString();
};

/**
 * Convert a date to ISO string for storage
 * @param {Date|string|number} date - Date to convert
 * @returns {string|null} ISO string or null if invalid
 */
const toISO = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

/**
 * Format date for long display (e.g., "30 janvier 2026")
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Long formatted date string
 */
const formatDateLong = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString(getLocale(language), {
    timeZone: getTimezone(),
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format date and time for long display (e.g., "30 janvier 2026 à 17:00")
 * @param {Date|string|number} date - Date to format
 * @param {string} language - Language code for locale
 * @returns {string} Long formatted datetime string
 */
const formatDateTimeLong = (date, language = 'fr') => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(getLocale(language), {
    timeZone: getTimezone(),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Get start of day in configured timezone
 * @param {Date|string|number} date - Date to get start of day for
 * @returns {Date} Date object set to start of day
 */
const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  // Get the date string in the configured timezone
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: getTimezone() }); // en-CA gives YYYY-MM-DD format
  return new Date(dateStr + 'T00:00:00');
};

/**
 * Get end of day in configured timezone
 * @param {Date|string|number} date - Date to get end of day for
 * @returns {Date} Date object set to end of day
 */
const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: getTimezone() });
  return new Date(dateStr + 'T23:59:59.999');
};

module.exports = {
  getTimezone,
  getLocale,
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  formatTime,
  formatDateLong,
  formatDateTimeLong,
  now,
  nowISO,
  toISO,
  startOfDay,
  endOfDay,
  DEFAULT_TIMEZONE
};
