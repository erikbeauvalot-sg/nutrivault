/**
 * LoginPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithRouter } from '../utils/testUtils';
import { AuthContext } from '../../src/contexts/AuthContext';

// Mock the usePrefetchRoutes hook
vi.mock('../../src/hooks/usePrefetchRoutes', () => ({
  default: vi.fn()
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  const renderLoginPage = (authOverrides = {}) => {
    const authValue = {
      user: null,
      loading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: vi.fn(),
      hasPermission: vi.fn(),
      ...authOverrides
    };

    return renderWithRouter(
      <AuthContext.Provider value={authValue}>
        <LoginPage />
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      renderLoginPage();

      expect(screen.getByText('NutriVault')).toBeInTheDocument();
      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });

    it('should have empty inputs initially', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/username or email/i)).toHaveValue('');
      expect(screen.getByLabelText(/password/i)).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
      });
    });

    it('should show error for short username', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'ab');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Check for minimum character validation message
        expect(screen.getByText(/minimum.*3.*characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for short password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'short');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Check for minimum character validation message
        expect(screen.getByText(/minimum.*8.*characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login with correct data', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123', false);
      });
    });

    it('should call login with rememberMe when checked', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByLabelText(/remember me/i));
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123', true);
      });
    });

    it('should navigate to dashboard on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error message on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue({ error: 'Invalid credentials' });
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should disable form while loading', async () => {
      const user = userEvent.setup();
      // Make login hang
      mockLogin.mockImplementation(() => new Promise(() => {}));
      renderLoginPage();

      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/username or email/i)).toBeDisabled();
        expect(screen.getByLabelText(/password/i)).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should dismiss error alert when closed', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue({ error: 'Test error' });
      renderLoginPage();

      // Trigger error
      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Close alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });
  });
});
