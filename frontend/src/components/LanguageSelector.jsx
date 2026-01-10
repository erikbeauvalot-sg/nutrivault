/**
 * LanguageSelector Component
 * Allows users to switch between French and English
 */

import { useTranslation } from 'react-i18next';
import { Dropdown } from 'react-bootstrap';
import { useState, useEffect } from 'react';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => i18n.language || 'fr');

  useEffect(() => {
    // Set initial language from i18n
    setCurrentLanguage(i18n.language);

    const handleLanguageChange = (lng) => {
      console.log('🌐 Language changed event:', lng);
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = (language) => {
    console.log('🌐 Changing language to:', language);
    i18n.changeLanguage(language).then(() => {
      console.log('🌐 Language changed to:', i18n.language);
      console.log('🌐 localStorage after change:', localStorage.getItem('i18nextLng'));
    });
  };

  const languages = [
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' },
    { code: 'en', name: t('language.english'), flag: '🇬🇧' },
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-secondary" size="sm" id="language-selector">
        <span className="me-2">{currentLang.flag}</span>
        {currentLang.name}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            active={currentLanguage === language.code}
            onClick={() => changeLanguage(language.code)}
          >
            <span className="me-2">{language.flag}</span>
            {language.name}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSelector;