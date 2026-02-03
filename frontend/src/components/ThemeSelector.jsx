import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSelector = () => {
  const { t } = useTranslation();
  const { themes, currentTheme, setTheme } = useTheme();

  if (!themes || themes.length === 0) return null;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-secondary" size="sm" id="theme-selector">
        <span className="me-2" role="img" aria-label="theme">🎨</span>
        {currentTheme?.name || t('themes.selectTheme', 'Theme')}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {themes.map((theme) => (
          <Dropdown.Item
            key={theme.id}
            active={currentTheme?.id === theme.id}
            onClick={() => setTheme(theme.id)}
          >
            <span
              className="d-inline-block rounded-circle me-2"
              style={{
                width: 12,
                height: 12,
                backgroundColor: theme.colors?.['bs-primary'] || '#4a6572',
                border: '1px solid rgba(0,0,0,0.15)'
              }}
            />
            {theme.name}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ThemeSelector;
