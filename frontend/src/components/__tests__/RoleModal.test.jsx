/**
 * RoleModal Component Tests
 * Free-form role names (normalized to uppercase) and data visibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleModal, { normalizeRoleName } from '../RoleModal';
import roleService from '../../services/roleService';
import sidebarMenuConfigService from '../../services/sidebarMenuConfigService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => (typeof defaultValue === 'string' ? defaultValue : key)
  })
}));

vi.mock('../../services/roleService', () => ({
  default: {
    getAllPermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    updateRolePermissions: vi.fn(),
    getRoleMenuItems: vi.fn(),
    updateRoleMenuItems: vi.fn()
  }
}));

vi.mock('../../services/sidebarMenuConfigService', () => ({
  default: {
    getAllConfigs: vi.fn(),
    clearSidebarCache: vi.fn()
  }
}));

vi.mock('../PermissionTree', () => ({
  default: () => <div data-testid="permission-tree" />
}));

describe('RoleModal', () => {
  const baseProps = { show: true, onHide: vi.fn(), onSave: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    roleService.getAllPermissions.mockResolvedValue({ data: { data: [] } });
    roleService.createRole.mockResolvedValue({ data: { data: { id: 'role-1', name: 'COMPTABLE' } } });
    roleService.updateRole.mockResolvedValue({ data: { data: {} } });
    roleService.updateRolePermissions.mockResolvedValue({ data: { data: {} } });
    roleService.getRoleMenuItems.mockResolvedValue([]);
    roleService.updateRoleMenuItems.mockResolvedValue([]);
    sidebarMenuConfigService.getAllConfigs.mockResolvedValue([
      { item_key: 'patients', section: 'main', display_order: 2 },
      { item_key: 'billing', section: 'main', display_order: 11 },
      { item_key: 'finance', section: 'main', display_order: 13 },
      { item_key: 'themes', section: 'settings', display_order: 2 }
    ]);
  });

  it('normalizes role names like the backend', () => {
    expect(normalizeRoleName('Comptabilité générale')).toBe('COMPTABILITE_GENERALE');
    expect(normalizeRoleName('expert-comptable')).toBe('EXPERT_COMPTABLE');
  });

  it('creates a role with a free-form name forced to uppercase', async () => {
    render(<RoleModal {...baseProps} mode="create" role={null} />);

    const nameInput = screen.getByPlaceholderText('e.g. ACCOUNTANT');
    fireEvent.change(nameInput, { target: { value: 'comptable' } });
    expect(nameInput.value).toBe('COMPTABLE');

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.createRole).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'COMPTABLE', data_scope: 'all' })
      );
    });
  });

  it('rejects an invalid name', async () => {
    render(<RoleModal {...baseProps} mode="create" role={null} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. ACCOUNTANT'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText(/Use 2 to 50 letters/)).toBeInTheDocument();
    expect(roleService.createRole).not.toHaveBeenCalled();
  });

  it('lets a custom role be renamed and re-scoped', async () => {
    const role = { id: 'role-1', name: 'COMPTABLE', data_scope: 'own', is_system: false, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    const nameInput = screen.getByDisplayValue('COMPTABLE');
    expect(nameInput).not.toHaveAttribute('readonly');
    fireEvent.change(nameInput, { target: { value: 'expert comptable' } });
    fireEvent.change(screen.getByLabelText('Data visibility'), { target: { value: 'all' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRole).toHaveBeenCalledWith(
        'role-1',
        expect.objectContaining({ name: 'EXPERT_COMPTABLE', data_scope: 'all' })
      );
    });
  });

  it('locks the name and hides visibility for system roles', async () => {
    const role = { id: 'role-2', name: 'DIETITIAN', description: 'Diet', is_system: true, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    expect(screen.getByDisplayValue('DIETITIAN')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Data visibility')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRole).toHaveBeenCalledWith('role-2', { description: 'Diet', home_page: null });
    });
  });

  it('creates a role with the selected menu entries', async () => {
    render(<RoleModal {...baseProps} mode="create" role={null} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. ACCOUNTANT'), { target: { value: 'accounting' } });
    fireEvent.click(screen.getByText('Menu'));
    // "Check all" on the finance group selects billing + finance, not patients
    const financeGroup = (await screen.findByText('finance', { selector: 'strong' })).parentElement;
    fireEvent.click(financeGroup.querySelector('button'));

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRoleMenuItems).toHaveBeenCalledWith('role-1', ['billing', 'finance']);
    });
    expect(sidebarMenuConfigService.clearSidebarCache).toHaveBeenCalled();
  });

  it('loads and updates the menu entries of an existing role', async () => {
    roleService.getRoleMenuItems.mockResolvedValue(['finance']);
    const role = { id: 'role-3', name: 'ACCOUNTING', data_scope: 'all', is_system: false, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    fireEvent.click(screen.getByText('Menu'));
    const financeBox = await screen.findByLabelText(/💹 finance/);
    await waitFor(() => expect(financeBox).toBeChecked());
    fireEvent.click(screen.getByLabelText(/💰 billing/));

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRoleMenuItems).toHaveBeenCalledWith('role-3', ['finance', 'billing']);
    });
  });

  it('has no menu tab for ADMIN', async () => {
    const role = { id: 'role-4', name: 'ADMIN', is_system: true, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    expect(roleService.getRoleMenuItems).not.toHaveBeenCalled();
  });

  it('saves a home page chosen among the checked entries', async () => {
    roleService.getRoleMenuItems.mockResolvedValue(['billing', 'finance']);
    const role = { id: 'role-5', name: 'ACCOUNTING', data_scope: 'all', is_system: false, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    fireEvent.click(screen.getByText('Menu'));
    const select = await screen.findByLabelText('Home page after login');
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(3));
    fireEvent.change(select, { target: { value: 'finance' } });

    // Unchecking another entry keeps the home page
    fireEvent.click(screen.getByLabelText(/💰 billing/));
    expect(select.value).toBe('finance');

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRole).toHaveBeenCalledWith(
        'role-5',
        expect.objectContaining({ home_page: 'finance' })
      );
    });
  });

  it('resets the home page when its entry is unchecked', async () => {
    roleService.getRoleMenuItems.mockResolvedValue(['finance']);
    const role = { id: 'role-6', name: 'ACCOUNTING', home_page: 'finance', is_system: false, permissions: [] };
    render(<RoleModal {...baseProps} mode="edit" role={role} />);

    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(await screen.findByLabelText(/💹 finance/));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(roleService.updateRole).toHaveBeenCalledWith(
        'role-6',
        expect.objectContaining({ home_page: null })
      );
    });
  });
});
