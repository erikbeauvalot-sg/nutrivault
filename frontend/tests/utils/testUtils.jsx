/**
 * Test Utilities
 * Render helpers and common test utilities
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18nTestConfig';
import { AuthContext } from '../../src/contexts/AuthContext';
import ThemeContext from '../../src/contexts/ThemeContext';

/**
 * Default mock user for authenticated tests
 */
export const mockAdminUser = {
  id: 'test-admin-id',
  username: 'admin',
  email: 'admin@test.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'ADMIN',
  permissions: [
    'patients.create', 'patients.read', 'patients.update', 'patients.delete',
    'visits.create', 'visits.read', 'visits.update', 'visits.delete',
    'billing.create', 'billing.read', 'billing.update', 'billing.delete',
    'users.create', 'users.read', 'users.update', 'users.delete',
    'roles.create', 'roles.read', 'roles.update', 'roles.delete',
    'admin.settings', 'admin.ai_config'
  ]
};

export const mockDietitianUser = {
  id: 'test-dietitian-id',
  username: 'dietitian',
  email: 'dietitian@test.com',
  first_name: 'Dietitian',
  last_name: 'User',
  role: 'DIETITIAN',
  permissions: [
    'patients.create', 'patients.read', 'patients.update',
    'visits.create', 'visits.read', 'visits.update',
    'billing.create', 'billing.read', 'billing.update'
  ]
};

export const mockAssistantUser = {
  id: 'test-assistant-id',
  username: 'assistant',
  email: 'assistant@test.com',
  first_name: 'Assistant',
  last_name: 'User',
  role: 'ASSISTANT',
  permissions: [
    'patients.read',
    'visits.read',
    'billing.read'
  ]
};

/**
 * Create mock auth context value
 */
export const createMockAuthContext = (user = mockAdminUser, overrides = {}) => ({
  user,
  loading: false,
  isAuthenticated: !!user,
  login: vi.fn().mockResolvedValue(user),
  logout: vi.fn().mockResolvedValue(),
  hasPermission: (permission) => user?.permissions?.includes(permission) || false,
  hasRole: (role) => user?.role === role,
  isAdmin: () => user?.role === 'ADMIN',
  ...overrides
});

/**
 * Default mock theme context value
 */
const mockThemeContextValue = {
  themes: [],
  currentTheme: null,
  setTheme: vi.fn(),
  loading: false,
  refreshThemes: vi.fn(),
  applyTheme: vi.fn(),
};

/**
 * All providers wrapper for tests
 */
const AllProviders = ({ children, authValue }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={authValue}>
        <ThemeContext.Provider value={mockThemeContextValue}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </ThemeContext.Provider>
      </AuthContext.Provider>
    </I18nextProvider>
  );
};

/**
 * Custom render with all providers
 * @param {ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.authValue - Auth context value override
 * @param {Object} options.user - User for auth context (creates default auth value)
 * @returns {Object} Render result with additional utilities
 */
export const renderWithProviders = (
  ui,
  {
    authValue = null,
    user = mockAdminUser,
    ...renderOptions
  } = {}
) => {
  const finalAuthValue = authValue || createMockAuthContext(user);

  const Wrapper = ({ children }) => (
    <AllProviders authValue={finalAuthValue}>
      {children}
    </AllProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue: finalAuthValue
  };
};

/**
 * Render without auth (for login page, etc.)
 */
export const renderWithRouter = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </I18nextProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Wait for loading to complete
 */
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create mock API response
 */
export const createMockResponse = (data, success = true) => ({
  data: {
    success,
    data,
    message: success ? 'Success' : 'Error'
  }
});

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
