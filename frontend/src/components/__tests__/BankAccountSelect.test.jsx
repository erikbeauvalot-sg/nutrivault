/**
 * BankAccountSelect tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BankAccountSelect from '../BankAccountSelect';
import bankAccountService from '../../services/bankAccountService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, defaultValue) => defaultValue || key })
}));

vi.mock('../../services/bankAccountService', () => ({
  default: { getAllBankAccounts: vi.fn() }
}));

describe('BankAccountSelect', () => {
  beforeEach(() => {
    bankAccountService.getAllBankAccounts.mockResolvedValue({
      data: [
        { code: 'PRO', label: 'Compte pro', is_active: true, is_default: true },
        { code: 'CAISSE', label: 'Caisse', is_active: true, is_default: false },
        { code: 'OLD', label: 'Ancien compte', is_active: false, is_default: false }
      ]
    });
  });

  it('shows the default account when no value is chosen yet', async () => {
    render(<BankAccountSelect value={undefined} showDefault onChange={() => {}} aria-label="loc" />);
    await waitFor(() => expect(screen.getByLabelText('loc')).toHaveValue('PRO'));
  });

  it('shows "no account" for an explicit empty value and hides inactive accounts', async () => {
    render(<BankAccountSelect value="" onChange={() => {}} aria-label="loc" />);
    await screen.findByText('Compte pro');
    expect(screen.getByLabelText('loc')).toHaveValue('');
    expect(screen.queryByText('Ancien compte')).not.toBeInTheDocument();
  });

  it('keeps an inactive account that is the current value', async () => {
    render(<BankAccountSelect value="OLD" onChange={() => {}} aria-label="loc" />);
    expect(await screen.findByText('Ancien compte')).toBeInTheDocument();
    expect(screen.getByLabelText('loc')).toHaveValue('OLD');
  });
});
