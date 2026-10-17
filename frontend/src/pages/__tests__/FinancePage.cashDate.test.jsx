/**
 * FinancePage — Recettes tab cash date (date d'encaissement) tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancePage from '../FinancePage';
import * as financeService from '../../services/financeService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => (typeof defaultValue === 'string' ? defaultValue : key),
    i18n: { language: 'fr' }
  })
}));

let mockPermissions = ['finance.read', 'billing.update'];
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (code) => mockPermissions.includes(code), user: { id: 'u1' } })
}));

vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }) => <div>{children}</div>
}));

vi.mock('recharts', () => {
  const Box = ({ children }) => <div>{children}</div>;
  const Nothing = () => null;
  return {
    AreaChart: Box, Area: Nothing, XAxis: Nothing, YAxis: Nothing, CartesianGrid: Nothing,
    Tooltip: Nothing, ResponsiveContainer: Box, PieChart: Box, Pie: Nothing, Cell: Nothing, Legend: Nothing
  };
});

vi.mock('../../services/financeService', () => ({
  getDashboard: vi.fn(),
  getCashFlow: vi.fn(),
  getRevenue: vi.fn(),
  getForecast: vi.fn(),
  getAgingReport: vi.fn(),
  sendReminders: vi.fn(),
  downloadComptaExport: vi.fn(),
  writeComptaToDisk: vi.fn(),
  setCashDate: vi.fn(),
  shiftCashDateToNextMonth: vi.fn(),
  setLocation: vi.fn()
}));

vi.mock('../../services/practiceLocationService', () => ({
  default: {
    getAllPracticeLocations: vi.fn().mockResolvedValue({
      data: [
        { code: 'SURESNES', label: 'Suresnes', is_active: true, is_default: true },
        { code: 'ISSY', label: 'Issy Les Moulineaux', is_active: true, is_default: false }
      ]
    })
  }
}));

vi.mock('../../services/expenseService', () => ({
  getExpenses: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getExpenseSummary: vi.fn().mockResolvedValue({ data: { data: null } })
}));

vi.mock('../../services/accountingEntryService', () => ({
  getEntries: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getEntrySummary: vi.fn().mockResolvedValue({ data: { data: null } })
}));

vi.mock('../../services/expenseCategoryService', () => ({
  default: { getAllExpenseCategories: vi.fn().mockResolvedValue({ data: { data: [] } }) }
}));

vi.mock('../../components/PaymentMethodSelect', () => ({ default: () => null }));
vi.mock('../../components/ExpenseCategorySelect', () => ({ default: () => null }));

const invoices = [
  {
    id: 'inv-1', invoice_number: 'INV-1', invoice_date: '2026-03-18T10:00:00.000Z', payment_date: null,
    cash_date: '2026-03-18', cash_date_overridden: false, amount_total: 60, amount_paid: 60,
    payment_method: 'CHECK', location_code: 'SURESNES', patient: { id: 'p1', first_name: 'Anne', last_name: 'Martin' }
  },
  {
    id: 'inv-2', invoice_number: 'INV-2', invoice_date: '2026-03-20T10:00:00.000Z', payment_date: null,
    cash_date: '2026-04-02', cash_date_overridden: true, amount_total: 50, amount_paid: 50,
    payment_method: 'CREDIT_CARD', patient: { id: 'p2', first_name: 'Paul', last_name: 'Dubois' }
  }
];

const renderRevenueTab = async () => {
  render(
    <MemoryRouter initialEntries={['/finance?tab=revenue']}>
      <FinancePage />
    </MemoryRouter>
  );
  await screen.findByText('INV-1');
};

const rowOf = (invoiceNumber) => screen.getByText(invoiceNumber).closest('tr');

describe('FinancePage cash date', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = ['finance.read', 'billing.update'];
    // Unrelated tabs: the page tolerates failed loads
    financeService.getDashboard.mockRejectedValue(new Error('not needed'));
    financeService.getCashFlow.mockResolvedValue({ data: { data: [] } });
    financeService.getForecast.mockRejectedValue(new Error('not needed'));
    financeService.getAgingReport.mockRejectedValue(new Error('not needed'));
    financeService.getRevenue.mockResolvedValue({ data: { data: { invoices, total: 2, totalPages: 1, totalPaid: 110 } } });
    financeService.shiftCashDateToNextMonth.mockResolvedValue({ success: true, data: [] });
    financeService.setCashDate.mockResolvedValue({ success: true, data: [] });
    financeService.setLocation.mockResolvedValue({ success: true, data: [] });
  });

  it('shows the cash date and flags moved ones', async () => {
    await renderRevenueTab();

    // Column 0 is the selection checkbox, column 1 the cash date
    expect(rowOf('INV-1').cells[1]).toHaveTextContent('18/03/2026');
    expect(rowOf('INV-2').cells[1]).toHaveTextContent('02/04/2026');
    expect(rowOf('INV-2').cells[3]).toHaveTextContent('20/03/2026');
    expect(within(rowOf('INV-2')).getByText('décalé')).toBeInTheDocument();
    expect(within(rowOf('INV-1')).queryByText('décalé')).not.toBeInTheDocument();
  });

  it('moves one invoice to next month from its row', async () => {
    await renderRevenueTab();

    fireEvent.click(within(rowOf('INV-1')).getByText('+1 mois'));

    await waitFor(() => expect(financeService.shiftCashDateToNextMonth).toHaveBeenCalledWith(['inv-1']));
    // Revenue is reloaded after the change
    await waitFor(() => expect(financeService.getRevenue.mock.calls.length).toBeGreaterThan(1));
  });

  it('moves the selected invoices to next month in one call', async () => {
    await renderRevenueTab();

    fireEvent.click(screen.getByLabelText('Sélectionner toutes les recettes de la page'));
    expect(screen.getByText('{{count}} recette(s) sélectionnée(s)')).toBeInTheDocument();

    // Row buttons show "+1 mois"; the bulk bar button shows the full label
    fireEvent.click(screen.getByText('Décaler au mois prochain', { selector: 'button' }));

    await waitFor(() => expect(financeService.shiftCashDateToNextMonth).toHaveBeenCalledWith(['inv-1', 'inv-2']));
  });

  it('edits the cash date in the modal', async () => {
    await renderRevenueTab();

    fireEvent.click(within(rowOf('INV-1')).getByLabelText("Modifier la date d'encaissement"));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(dialog.querySelector('input[type="date"]'), { target: { value: '2026-04-10' } });
    fireEvent.click(within(dialog).getByText('Enregistrer'));

    await waitFor(() => expect(financeService.setCashDate).toHaveBeenCalledWith(['inv-1'], '2026-04-10'));
  });

  it('resets the cash date to the invoice date', async () => {
    await renderRevenueTab();

    fireEvent.click(within(rowOf('INV-2')).getByLabelText("Modifier la date d'encaissement"));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByText('Revenir à la date de facture'));

    await waitFor(() => expect(financeService.setCashDate).toHaveBeenCalledWith(['inv-2'], null));
  });

  it('hides the actions without billing.update', async () => {
    mockPermissions = ['finance.read'];
    await renderRevenueTab();

    expect(screen.queryByText('+1 mois')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sélectionner toutes les recettes de la page')).not.toBeInTheDocument();
  });

  it('shows the location and flags invoices without one', async () => {
    await renderRevenueTab();

    expect(await within(rowOf('INV-1')).findByText('Suresnes')).toBeInTheDocument();
    expect(within(rowOf('INV-2')).getByText('To set')).toBeInTheDocument();
  });

  it('sets the location of the selected invoices in one call', async () => {
    await renderRevenueTab();

    fireEvent.click(screen.getByLabelText('Sélectionner toutes les recettes de la page'));
    fireEvent.click(screen.getByText('Change location', { selector: 'button' }));
    const dialog = await screen.findByRole('dialog');
    const select = within(dialog).getByLabelText('Location');
    await within(dialog).findByText('Issy Les Moulineaux');
    fireEvent.change(select, { target: { value: 'ISSY' } });
    fireEvent.click(within(dialog).getByText('Enregistrer'));

    await waitFor(() => expect(financeService.setLocation).toHaveBeenCalledWith(['inv-1', 'inv-2'], 'ISSY'));
  });
});
