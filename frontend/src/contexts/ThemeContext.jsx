import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getThemes, updateUserThemePreference } from '../services/themeService';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

// Convert hex to RGB triplet string (e.g. "#4a6572" -> "74, 101, 114")
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

// Derived color map: for certain base colors, compute rgba/rgb variants
const DERIVED_COLORS = {
  'nv-slate': [
    { suffix: '-pale', template: (rgb) => `rgba(${rgb}, 0.12)` },
    { suffix: '-ghost', template: (rgb) => `rgba(${rgb}, 0.06)` }
  ],
  'nv-gold': [
    { suffix: '-muted', template: (rgb) => `rgba(${rgb}, 0.7)` },
    { suffix: '-faint', template: (rgb) => `rgba(${rgb}, 0.15)` }
  ],
  'nv-danger': [
    { suffix: '-pale', template: (rgb) => `rgba(${rgb}, 0.12)` }
  ],
  'nv-info': [
    { suffix: '-pale', template: (rgb) => `rgba(${rgb}, 0.12)` }
  ],
  'nv-warning': [
    { suffix: '-pale', template: (rgb) => `rgba(${rgb}, 0.12)` }
  ],
  'nv-success': [
    { suffix: '-pale', template: (rgb) => `rgba(${rgb}, 0.12)` }
  ]
};

// Bootstrap vars that need -rgb companion
const BS_RGB_VARS = [
  'bs-primary', 'bs-secondary', 'bs-success', 'bs-info',
  'bs-warning', 'bs-danger', 'bs-light', 'bs-dark'
];

function applyTheme(colors) {
  if (!colors) return;
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);

    // Compute derived rgba variants
    if (DERIVED_COLORS[key]) {
      const rgb = hexToRgb(value);
      if (rgb) {
        DERIVED_COLORS[key].forEach(({ suffix, template }) => {
          root.style.setProperty(`--${key}${suffix}`, template(rgb));
        });
      }
    }

    // Compute Bootstrap -rgb companion vars
    if (BS_RGB_VARS.includes(key)) {
      const rgb = hexToRgb(value);
      if (rgb) {
        root.style.setProperty(`--${key}-rgb`, rgb);
      }
    }
  });

  // Derived warm-ghost from warm-700
  if (colors['nv-warm-700']) {
    const rgb = hexToRgb(colors['nv-warm-700']);
    if (rgb) {
      root.style.setProperty('--nv-warm-ghost', `rgba(${rgb}, 0.05)`);
    }
  }

  // Derive body-related Bootstrap vars
  if (colors['bs-body-bg']) {
    const rgb = hexToRgb(colors['bs-body-bg']);
    if (rgb) root.style.setProperty('--bs-body-bg-rgb', rgb);
  }
  if (colors['bs-body-color']) {
    const rgb = hexToRgb(colors['bs-body-color']);
    if (rgb) root.style.setProperty('--bs-body-color-rgb', rgb);
  }

  // Derive link colors from warm-600/warm-700 if available
  if (colors['nv-warm-600']) {
    root.style.setProperty('--bs-link-color', colors['nv-warm-600']);
    const rgb = hexToRgb(colors['nv-warm-600']);
    if (rgb) root.style.setProperty('--bs-link-color-rgb', rgb);
  }
  if (colors['nv-warm-700']) {
    root.style.setProperty('--bs-link-hover-color', colors['nv-warm-700']);
    const rgb = hexToRgb(colors['nv-warm-700']);
    if (rgb) root.style.setProperty('--bs-link-hover-color-rgb', rgb);
  }

  // Border color from warm-200
  if (colors['nv-warm-200']) {
    root.style.setProperty('--bs-border-color', colors['nv-warm-200']);
  }
}

const CACHE_KEY = 'nutrivault-theme';

export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [themes, setThemes] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load cached theme immediately (avoids flash of unstyled content)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCurrentTheme(parsed);
        applyTheme(parsed.colors);
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  // Fetch fresh themes from API when authenticated — always overrides cache
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchThemes = async () => {
      try {
        const res = await getThemes();
        const list = res.data?.data || [];
        setThemes(list);

        // Determine active theme: user's preference or default
        const userThemeId = user?.theme_id;
        let active = null;

        if (userThemeId) {
          active = list.find(t => t.id === userThemeId);
        }
        if (!active) {
          active = list.find(t => t.is_default);
        }
        if (!active && list.length > 0) {
          active = list[0];
        }

        if (active) {
          setCurrentTheme(active);
          applyTheme(active.colors);
          localStorage.setItem(CACHE_KEY, JSON.stringify(active));
        }
      } catch (error) {
        console.error('Failed to load themes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThemes();
  }, [isAuthenticated]);

  // Re-apply correct theme when user.theme_id changes (e.g. after switching theme)
  useEffect(() => {
    if (!themes.length || !user?.theme_id) return;
    const target = themes.find(t => t.id === user.theme_id);
    if (target && currentTheme?.id !== target.id) {
      setCurrentTheme(target);
      applyTheme(target.colors);
      localStorage.setItem(CACHE_KEY, JSON.stringify(target));
    }
  }, [user?.theme_id, themes]);

  const setTheme = useCallback(async (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    setCurrentTheme(theme);
    applyTheme(theme.colors);
    localStorage.setItem(CACHE_KEY, JSON.stringify(theme));

    // Update user profile in auth state + storage so it persists across reloads
    if (updateUser) {
      updateUser({ theme_id: themeId });
    }

    try {
      await updateUserThemePreference(themeId);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [themes, updateUser]);

  const refreshThemes = useCallback(async () => {
    try {
      const res = await getThemes();
      const list = res.data?.data || [];
      setThemes(list);
      return list;
    } catch (error) {
      console.error('Failed to refresh themes:', error);
      return themes;
    }
  }, [themes]);

  return (
    <ThemeContext.Provider value={{ themes, currentTheme, setTheme, loading, refreshThemes, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
