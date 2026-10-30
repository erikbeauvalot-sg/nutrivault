/**
 * Date formatting utilities
 * Handles locale-specific date formatting for the application
 * Uses configured timezone from environment variable
 */

// Default timezone if not configured
const DEFAULT_TIMEZONE = 'Europe/Paris';

/**
 * Get the configured timezone from environment variable
 * @returns {string} IANA timezone string
 */
export const getTimezone = () => {
  return import.meta.env.VITE_TZ || DEFAULT_TIMEZONE;
};

/**
 * Get locale string based on language
 * @param {string} language - Language code ('fr', 'en', etc.)
 * @returns {string} Locale string
 */
export const getLocale = (language = 'fr') => {
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
 * Format a date string according to the current locale and timezone
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
export const formatDate = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(getLocale(language), {
    timeZone: getTimezone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format a date string with time according to the current locale and timezone
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted date and time string (DD/MM/YYYY, HH:mm:ss)
 */
export const formatDateTime = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString(getLocale(language), {
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
 * Format a date string with time but without seconds
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted date and time string (DD/MM/YYYY, HH:mm)
 */
export const formatDateTimeShort = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString(getLocale(language), {
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
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Formatted time string (HH:mm)
 */
export const formatTime = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString(getLocale(language), {
    timeZone: getTimezone(),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Format date for long display (e.g., "30 janvier 2026")
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Long formatted date string
 */
export const formatDateLong = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(getLocale(language), {
    timeZone: getTimezone(),
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format date and time for long display (e.g., "30 janvier 2026 à 17:00")
 * @param {string|Date} dateString - The date to format
 * @param {string} language - The language code ('fr' or 'en')
 * @returns {string} Long formatted datetime string
 */
export const formatDateTimeLong = (dateString, language = 'fr') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleString(getLocale(language), {
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
 * Convert a datetime-local input value to a Date object
 * The input is assumed to be in the configured timezone
 * @param {string} localDateTimeStr - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns {Date|null} Date object or null if invalid
 */
export const parseLocalDateTime = (localDateTimeStr) => {
  if (!localDateTimeStr) return null;
  const date = new Date(localDateTimeStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Format a Date for use in datetime-local input
 * Converts to the configured timezone for display
 * @param {Date|string} date - Date to format
 * @returns {string} String in format YYYY-MM-DDTHH:mm
 */
export const toLocalDateTimeInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  // Get date parts in the configured timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getValue = (type) => parts.find(p => p.type === type)?.value || '';

  return `${getValue('year')}-${getValue('month')}-${getValue('day')}T${getValue('hour')}:${getValue('minute')}`;
};

/**
 * Format a Date for use in date input
 * Converts to the configured timezone for display
 * @param {Date|string} date - Date to format
 * @returns {string} String in format YYYY-MM-DD
 */
export const toLocalDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-CA', {
    timeZone: getTimezone()
  });
};

/**
 * Current month as a month key
 * @returns {string} String in format YYYY-MM
 */
export const getCurrentMonthKey = () => toLocalDateInput(new Date()).slice(0, 7);

/**
 * Shift a month key by a number of months
 * @param {string} monthKey - Month in format YYYY-MM
 * @param {number} offset - Number of months to add (negative to go back)
 * @returns {string} String in format YYYY-MM
 */
export const shiftMonthKey = (monthKey, offset) => {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Date range covering a whole month, for API date filters
 * @param {string} monthKey - Month in format YYYY-MM
 * @returns {{start_date: string, end_date: string}}
 */
export const getMonthDateRange = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start_date: `${monthKey}-01T00:00:00`,
    end_date: `${monthKey}-${String(lastDay).padStart(2, '0')}T23:59:59.999`
  };
};

/**
 * Format a month key as a readable label (e.g. "octobre 2026")
 * @param {string} monthKey - Month in format YYYY-MM
 * @param {string} language - Language code
 * @returns {string}
 */
export const formatMonthLabel = (monthKey, language = 'fr') => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(getLocale(language), {
    month: 'long',
    year: 'numeric'
  });
};
