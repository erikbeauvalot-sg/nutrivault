import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  fr: {
    translation: frTranslations,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // lng: 'en', // Remove forced initial language - let detector handle it
    fallbackLng: 'en', // English as fallback if no language detected
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      checkWhitelist: true,
    },

    supportedLngs: ['en', 'fr'], // Only support English and French
  });

// Debug logging
console.log('🌐 i18n initialized');
console.log('🌐 Detected language:', i18n.language);
console.log('🌐 localStorage value:', localStorage.getItem('i18nextLng'));
console.log('🌐 Available languages:', i18n.languages);

export default i18n;