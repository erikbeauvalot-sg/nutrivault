/**
 * ServerConfigScreen Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key
  })
}));

// Mock platform
vi.mock('../../utils/platform', () => ({
  isNative: false,
  isIOS: false,
  isAndroid: false,
  isWeb: true,
}));

// Mock api
vi.mock('../../services/api', () => ({
  default: { defaults: { baseURL: '/api' } },
  setApiBaseUrl: vi.fn(),
}));

// Mock serverConfigService
const mockGetServerUrl = vi.fn().mockResolvedValue('https://nutrivault.beauvalot.com/api');
const mockSetServerUrl = vi.fn().mockResolvedValue(undefined);
const mockResetServerUrl = vi.fn().mockResolvedValue('https://nutrivault.beauvalot.com/api');
const mockTestConnection = vi.fn().mockResolvedValue({ ok: true, message: 'Connected', version: '1.0' });
const mockValidateUrl = vi.fn().mockReturnValue({ valid: true });
const mockGetDefaultUrl = vi.fn().mockReturnValue('https://nutrivault.beauvalot.com/api');

vi.mock('../../services/serverConfigService', () => ({
  getServerUrl: (...args) => mockGetServerUrl(...args),
  setServerUrl: (...args) => mockSetServerUrl(...args),
  resetServerUrl: (...args) => mockResetServerUrl(...args),
  testConnection: (...args) => mockTestConnection(...args),
  validateUrl: (...args) => mockValidateUrl(...args),
  getDefaultUrl: (...args) => mockGetDefaultUrl(...args),
}));

// Mock LoginPage.css (no actual styles needed)
vi.mock('../LoginPage.css', () => ({}));

import ServerConfigScreen from '../ServerConfigScreen';

const renderWithRouter = (ui) => {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
};

describe('ServerConfigScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerUrl.mockResolvedValue('https://nutrivault.beauvalot.com/api');
    mockValidateUrl.mockReturnValue({ valid: true });
    mockGetDefaultUrl.mockReturnValue('https://nutrivault.beauvalot.com/api');
  });

  it('renders the title', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Server Configuration')).toBeInTheDocument();
    });
  });

  it('loads and displays the current server URL', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      const input = screen.getByDisplayValue('https://nutrivault.beauvalot.com/api');
      expect(input).toBeInTheDocument();
    });
  });

  it('allows typing a custom URL', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('https://nutrivault.beauvalot.com/api');
    fireEvent.change(input, { target: { value: 'http://localhost:3001' } });
    expect(input.value).toBe('http://localhost:3001');
  });

  it('calls testConnection when test button is clicked', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });

  it('shows green indicator on successful connection', async () => {
    mockTestConnection.mockResolvedValue({ ok: true, message: 'Connected', version: '1.0' });
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connected/)).toBeInTheDocument();
    });
  });

  it('shows red indicator on failed connection', async () => {
    mockTestConnection.mockResolvedValue({ ok: false, message: 'Server unreachable' });
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Server unreachable')).toBeInTheDocument();
    });
  });

  it('shows error when URL is invalid', async () => {
    mockValidateUrl.mockReturnValue({ valid: false, reason: 'URL must start with http:// or https://' });
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('URL must start with http:// or https://')).toBeInTheDocument();
    });
  });

  it('saves URL and navigates back to login', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Save & Return')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save & Return'));

    await waitFor(() => {
      expect(mockSetServerUrl).toHaveBeenCalled();
    });
  });

  it('shows reset button when URL differs from default', async () => {
    mockGetServerUrl.mockResolvedValue('http://custom:3001');
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Reset to default')).toBeInTheDocument();
    });
  });

  it('hides reset button when URL is the default', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    expect(screen.queryByText('Reset to default')).not.toBeInTheDocument();
  });

  it('resets URL when reset button is clicked', async () => {
    mockGetServerUrl.mockResolvedValue('http://custom:3001');
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Reset to default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reset to default'));

    await waitFor(() => {
      expect(mockResetServerUrl).toHaveBeenCalled();
    });
  });

  it('has a back to login link', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Back to login')).toBeInTheDocument();
    });
  });
});
