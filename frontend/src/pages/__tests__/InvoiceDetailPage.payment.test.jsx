/**
 * InvoiceDetailPage — History "Payment" row: change status and cash date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import InvoiceDetailPage from '../InvoiceDetailPage';
import * as billingService from '../../services/billingService';
import * as financeService from '../../services/financeService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => (typeof defaultValue === 'string' ? defaultValue : key),
    i18n: { language: 'fr' }
  })
}));

// Stable references, like the real AuthProvider (the page refetches when hasPermission changes)
const mockAuth = { user: { id: 'u1' }, hasPermission: () => true };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth
}));

vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div>{children}</div>
}));

vi.mock('../../services/billingService', () => ({
  getInvoiceById: vi.fn(),
  changePaymentStatus: vi.fn()
}));

vi.mock('../../services/financeService', () => ({
  setCashDate: vi.fn()
}));

const baseInvoice = {
  id: 'inv-1',
  invoice_number: 'INV-1',
  invoice_date: '2026-03-18T10:00:00.000Z',
  due_date: '2026-04-18T10:00:00.000Z',
  cash_date: null,
  status: 'PAID',
  amount_total: 60,
  amount_paid: 60,
  amount_due: 0,
  patient: { id: 'p1', first_name: 'Anne', last_name: 'Martin' },
  payments: [{ id: 'pay-1', amount: 60, payment_method: 'CHECK', payment_date: '2026-03-18T10:00:00.000Z', status: 'PAID' }],
  email_history: [],
  update_log: []
};

const renderPage = async (invoice = baseInvoice) => {
  billingService.getInvoiceById.mockResolvedValue({ data: { data: invoice } });
  render(
    <MemoryRouter initialEntries={['/billing/inv-1']}>
      <Routes>
        <Route path="/billing/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
  fireEvent.click(await screen.findByText(/Change$/));
  return screen.findByRole('dialog');
};

describe('InvoiceDetailPage payment edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingService.changePaymentStatus.mockResolvedValue({});
    financeService.setCashDate.mockResolvedValue({ success: true });
  });

  it('prefills the cash date with the invoice date', async () => {
    const dialog = await renderPage();

    expect(dialog.querySelector('input[type="date"]')).toHaveValue('2026-03-18');
    expect(within(dialog).getByText('Save').closest('button')).toBeDisabled();
  });

  it('changes only the cash date', async () => {
    const dialog = await renderPage();

    fireEvent.change(dialog.querySelector('input[type="date"]'), { target: { value: '2026-04-02' } });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => expect(financeService.setCashDate).toHaveBeenCalledWith(['inv-1'], '2026-04-02'));
    expect(billingService.changePaymentStatus).not.toHaveBeenCalled();
  });

  it('changes only the payment status', async () => {
    const dialog = await renderPage();

    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'CANCELLED' } });
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => expect(billingService.changePaymentStatus).toHaveBeenCalledWith('pay-1', 'CANCELLED'));
    expect(financeService.setCashDate).not.toHaveBeenCalled();
  });

  it('resets a moved cash date to the invoice date with null', async () => {
    const dialog = await renderPage({ ...baseInvoice, cash_date: '2026-04-02' });

    expect(dialog.querySelector('input[type="date"]')).toHaveValue('2026-04-02');
    fireEvent.click(within(dialog).getByText('Revenir à la date de facture'));
    fireEvent.click(within(dialog).getByText('Save'));

    await waitFor(() => expect(financeService.setCashDate).toHaveBeenCalledWith(['inv-1'], null));
  });

  it('labels cash date changes in the history', async () => {
    billingService.getInvoiceById.mockResolvedValue({
      data: {
        data: {
          ...baseInvoice,
          cash_date: '2026-04-02',
          update_log: [{ field: 'cash_date', old_value: '2026-03-18', new_value: '2026-04-02', changed_at: '2026-03-30T10:00:00.000Z', changed_by: { username: 'admin' } }]
        }
      }
    });
    render(
      <MemoryRouter initialEntries={['/billing/inv-1']}>
        <Routes>
          <Route path="/billing/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Date d'encaissement :/)).toBeInTheDocument();
    expect(screen.queryByText(/Mode de paiement :/)).not.toBeInTheDocument();
  });
});
