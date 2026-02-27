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

const mockServer = { id: 'srv1', name: 'Production', url: 'https://nutrivault.beauvalot.com/api', isActive: true };
const mockCustomServer = { id: 'srv2', name: 'Local Dev', url: 'http://localhost:3001', isActive: false };

const mockGetServers = vi.fn().mockReturnValue([mockServer]);
const mockAddServer = vi.fn().mockReturnValue(mockServer);
const mockUpdateServer = vi.fn().mockReturnValue(mockServer);
const mockDeleteServer = vi.fn().mockReturnValue(undefined);
const mockSetActiveServer = vi.fn().mockReturnValue(undefined);
const mockTestConnection = vi.fn().mockResolvedValue({ ok: true, message: 'Connected', version: '1.0' });
const mockValidateUrl = vi.fn().mockReturnValue({ valid: true });
const mockGetDefaultUrl = vi.fn().mockReturnValue('https://nutrivault.beauvalot.com/api');

vi.mock('../../services/serverConfigService', () => ({
  getServers: (...args) => mockGetServers(...args),
  addServer: (...args) => mockAddServer(...args),
  updateServer: (...args) => mockUpdateServer(...args),
  deleteServer: (...args) => mockDeleteServer(...args),
  setActiveServer: (...args) => mockSetActiveServer(...args),
  testConnection: (...args) => mockTestConnection(...args),
  validateUrl: (...args) => mockValidateUrl(...args),
  getDefaultUrl: (...args) => mockGetDefaultUrl(...args),
}));

// Mock LoginPage.css
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
    mockGetServers.mockReturnValue([mockServer]);
    mockValidateUrl.mockReturnValue({ valid: true });
    mockGetDefaultUrl.mockReturnValue('https://nutrivault.beauvalot.com/api');
    mockTestConnection.mockResolvedValue({ ok: true, message: 'Connected', version: '1.0' });
    mockAddServer.mockReturnValue(mockServer);
  });

  it('renders the title', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Server Configuration')).toBeInTheDocument();
    });
  });

  it('loads and displays servers from getServers', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('Production')).toBeInTheDocument();
    });
  });

  it('shows the server URL', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });
  });

  it('shows Add Server button', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Add Server/)).toBeInTheDocument();
    });
  });

  it('opens add form when Add Server is clicked', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText(/\+ Add Server/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
    });
  });

  it('allows typing a server URL in the form', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText(/\+ Add Server/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api');
    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001' } });
    expect(urlInput.value).toBe('http://localhost:3001');
  });

  it('calls testConnection when Test Connection is clicked in form', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText(/\+ Add Server/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api');
    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001' } });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalledWith('http://localhost:3001');
    });
  });

  it('shows connected status on successful connection', async () => {
    mockTestConnection.mockResolvedValue({ ok: true, message: 'Connected', version: '1.0' });
    renderWithRouter(<ServerConfigScreen />);

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api');
    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001' } });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Connected/)).toBeInTheDocument();
    });
  });

  it('shows error status on failed connection', async () => {
    mockTestConnection.mockResolvedValue({ ok: false, message: 'Server unreachable' });
    renderWithRouter(<ServerConfigScreen />);

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api');
    fireEvent.change(urlInput, { target: { value: 'http://bad-server' } });

    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText(/Server unreachable/)).toBeInTheDocument();
    });
  });

  it('shows validation error when URL is invalid', async () => {
    mockValidateUrl.mockReturnValue({ valid: false, reason: 'URL must start with http:// or https://' });
    renderWithRouter(<ServerConfigScreen />);

    fireEvent.click(screen.getByText(/\+ Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api')).toBeInTheDocument();
    });

    // Fill both fields and try to save
    const nameInput = screen.getByPlaceholderText('e.g. Production, Local Dev');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const urlInput = screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api');
    fireEvent.change(urlInput, { target: { value: 'bad-url' } });

    // Click Save (Add Server button in form)
    const saveButtons = screen.getAllByText('Add Server');
    // The save button in the form is the second one (first is the list button, but now we're in form view)
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('URL must start with http:// or https://')).toBeInTheDocument();
    });
  });

  it('calls addServer when form is submitted with valid data', async () => {
    mockGetServers.mockReturnValue([]);
    mockAddServer.mockReturnValue({ ...mockServer, id: 'new1', isActive: true });
    renderWithRouter(<ServerConfigScreen />);

    fireEvent.click(screen.getByText(/Add Server/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Production, Local Dev')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. Production, Local Dev'), { target: { value: 'My Server' } });
    fireEvent.change(screen.getByPlaceholderText('https://nutrivault.beauvalot.com/api'), { target: { value: 'https://my-server.com/api' } });

    const addButtons = screen.getAllByText('Add Server');
    fireEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(mockAddServer).toHaveBeenCalledWith('My Server', 'https://my-server.com/api');
    });
  });

  it('shows no servers message when server list is empty', async () => {
    mockGetServers.mockReturnValue([]);
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText('No servers configured')).toBeInTheDocument();
    });
  });

  it('has a back to login link', async () => {
    renderWithRouter(<ServerConfigScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Back to login/)).toBeInTheDocument();
    });
  });
});
