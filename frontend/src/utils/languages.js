/**
 * Language Configuration
 * US-5.5.6: Email Template Multi-Language Support
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' }
];

export const DEFAULT_LANGUAGE = 'en';
export const FALLBACK_LANGUAGE = 'en';

/**
 * Get language info by code
 * @param {string} code - Language code
 * @returns {Object|null} Language object or null
 */
export const getLanguageByCode = (code) => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || null;
};

/**
 * Get language name by code
 * @param {string} code - Language code
 * @returns {string} Language name
 */
export const getLanguageName = (code) => {
  const lang = getLanguageByCode(code);
  return lang ? lang.name : code;
};

/**
 * Get language flag by code
 * @param {string} code - Language code
 * @returns {string} Language flag emoji
 */
export const getLanguageFlag = (code) => {
  const lang = getLanguageByCode(code);
  return lang ? lang.flag : '🌐';
};

/**
 * Get language native name by code
 * @param {string} code - Language code
 * @returns {string} Native language name
 */
export const getLanguageNativeName = (code) => {
  const lang = getLanguageByCode(code);
  return lang ? lang.nativeName : code;
};

/**
 * Format language for display
 * @param {string} code - Language code
 * @returns {string} Formatted display string with flag
 */
export const formatLanguageDisplay = (code) => {
  const lang = getLanguageByCode(code);
  if (!lang) return code;
  return `${lang.flag} ${lang.nativeName}`;
};

export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  getLanguageByCode,
  getLanguageName,
  getLanguageFlag,
  getLanguageNativeName,
  formatLanguageDisplay
};
