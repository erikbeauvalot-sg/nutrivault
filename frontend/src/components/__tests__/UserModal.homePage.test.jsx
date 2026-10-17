/**
 * UserModal home page tests: admins can override the role home page per user
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserModal from '../UserModal';
import * as userService from '../../services/userService';
import sidebarMenuConfigService from '../../services/sidebarMenuConfigService';

const mockAuth = { user: { id: 'admin-1', role: 'ADMIN' } };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => (typeof defaultValue === 'string' ? defaultValue : key)
  })
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth
}));

vi.mock('../../hooks/useEmailCheck', () => ({
  default: () => ({ checking: false, available: true, error: null })
}));

vi.mock('../../services/userService', () => ({
  default: {},
  updateUser: vi.fn(),
  createUser: vi.fn()
}));

vi.mock('../../services/sidebarMenuConfigService', () => ({
  default: { getAllConfigs: vi.fn() }
}));

describe('UserModal home page', () => {
  const roles = [{ id: 'role-1', name: 'ACCOUNTING' }];
  const user = {
    id: 'user-1',
    username: 'ladaf',
    email: 'daf@example.com',
    role_id: 'role-1',
    first_name: 'La',
    last_name: 'Daf',
    is_active: true,
    language_preference: 'fr',
    home_page: 'finance'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: 'admin-1', role: 'ADMIN' };
    userService.default.updateUser = userService.updateUser;
    userService.updateUser.mockResolvedValue({ data: user });
    sidebarMenuConfigService.getAllConfigs.mockResolvedValue([
      { item_key: 'billing', section: 'main', display_order: 11 },
      { item_key: 'finance', section: 'main', display_order: 13 }
    ]);
  });

  const renderModal = () => render(
    <UserModal show onHide={vi.fn()} mode="edit" user={user} roles={roles} onSave={vi.fn()} />
  );

  it('shows the saved home page and sends null for "same as the role"', async () => {
    renderModal();

    const select = await screen.findByLabelText('Home page after login');
    await waitFor(() => expect(select.value).toBe('finance'));

    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByText('users.editUser'));

    await waitFor(() => {
      expect(userService.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ home_page: null }));
    });
  });

  it('is hidden for non-admin users', () => {
    mockAuth.user = { id: 'user-1', role: 'ACCOUNTING' };
    renderModal();

    expect(screen.queryByLabelText('Home page after login')).not.toBeInTheDocument();
    expect(sidebarMenuConfigService.getAllConfigs).not.toHaveBeenCalled();
  });
});
