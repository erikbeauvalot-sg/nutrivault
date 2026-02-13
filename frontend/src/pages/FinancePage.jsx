/**
 * Finance Page
 * Unified finance dashboard with overview, cash flow, expenses, entries, and aging report tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Alert, Badge, Table, Form, Modal, Spinner, Button, InputGroup, Nav, Tab, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import * as financeService from '../services/financeService';
import * as expenseService from '../services/expenseService';
import * as accountingEntryService from '../services/accountingEntryService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CATEGORIES = ['RENT', 'EQUIPMENT', 'SOFTWARE', 'INSURANCE', 'TRAINING', 'MARKETING', 'UTILITIES', 'STAFF', 'PROFESSIONAL_FEES', 'SUPPLIES', 'TRAVEL', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'];
const RECURRING_PERIODS = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
const ENTRY_CATEGORIES = ['ADJUSTMENT', 'REFUND', 'CORRECTION', 'BANK_FEE', 'TAX', 'OTHER'];

const PIE_COLORS = ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2', '#B7E4C7', '#D4A373', '#E6CBA8', '#FAEDCD', '#CCD5AE', '#D4E09B', '#A3B18A'];

const emptyExpense = {
  description: '', amount: '', category: 'OTHER', expense_date: new Date().toISOString().slice(0, 10),
  vendor: '', payment_method: '', notes: '', is_recurring: false, recurring_period: '', recurring_end_date: '', tax_deductible: false
};

const emptyEntry = {
  description: '', amount: '', entry_type: 'CREDIT', entry_date: new Date().toISOString().slice(0, 10),
  category: '', reference: '', notes: ''
};

const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);

// --- KPI Card ---
const KpiCard = ({ label, value, suffix, variant = 'primary' }) => {
  const colorMap = { primary: '#2D6A4F', success: '#40916C', danger: '#BC4749', warning: '#D4A373', info: '#457B9D' };
  return (
    <Card className="h-100 border-0 shadow-sm" style={{ borderLeft: `4px solid ${colorMap[variant] || colorMap.primary}` }}>
      <Card.Body className="py-3">
        <div className="text-muted small mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 200, letterSpacing: '0.03em' }}>{label}</div>
        <div className="d-flex align-items-baseline">
          <span style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: colorMap[variant] }}>{value}</span>
          {suffix && <span className="ms-1 text-muted small">{suffix}</span>}
        </div>
      </Card.Body>
    </Card>
  );
};

const FinancePage = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  // Global state
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Overview
  const [dashboard, setDashboard] = useState(null);

  // Cash flow
  const [cashFlow, setCashFlow] = useState([]);

  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [expensePagination, setExpensePagination] = useState(null);
  const [expenseFilters, setExpenseFilters] = useState({ category: '', search: '', page: 1, limit: 20 });
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({ ...emptyExpense });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Accounting entries
  const [entries, setEntries] = useState([]);
  const [entryPagination, setEntryPagination] = useState(null);
  const [entryFilters, setEntryFilters] = useState({ entry_type: '', search: '', page: 1, limit: 20 });
  const [entrySummary, setEntrySummary] = useState(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryFormData, setEntryFormData] = useState({ ...emptyEntry });
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [showEntryDeleteConfirm, setShowEntryDeleteConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState(null);

  // Aging report
  const [agingReport, setAgingReport] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [sendingReminders, setSendingReminders] = useState(false);

  // --- Data loading ---
  const loadDashboard = useCallback(async () => {
    try {
      const res = await financeService.getDashboard();
      setDashboard(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }, []);

  const loadCashFlow = useCallback(async () => {
    try {
      const res = await financeService.getCashFlow();
      setCashFlow(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load cash flow:', err);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const res = await expenseService.getExpenses(expenseFilters);
      const data = res.data || res;
      setExpenses(data.data || []);
      setExpensePagination(data.pagination || null);
    } catch (err) {
      setError(t('expenses.messages.fetchError', 'Failed to load expenses'));
    }
  }, [expenseFilters, t]);

  const loadExpenseSummary = useCallback(async () => {
    try {
      const res = await expenseService.getExpenseSummary();
      setExpenseSummary(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load expense summary:', err);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const res = await accountingEntryService.getEntries(entryFilters);
      const data = res.data || res;
      setEntries(data.data || []);
      setEntryPagination(data.pagination || null);
    } catch (err) {
      setError(t('accounting.messages.fetchError', 'Failed to load entries'));
    }
  }, [entryFilters, t]);

  const loadEntrySummary = useCallback(async () => {
    try {
      const res = await accountingEntryService.getEntrySummary();
      setEntrySummary(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load entry summary:', err);
    }
  }, []);

  const loadAgingReport = useCallback(async () => {
    try {
      const res = await financeService.getAgingReport();
      setAgingReport(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load aging report:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadCashFlow(), loadExpenses(), loadExpenseSummary(), loadEntries(), loadEntrySummary(), loadAgingReport()]);
      setLoading(false);
    };
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) loadExpenses();
  }, [expenseFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) loadEntries();
  }, [entryFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Expense CRUD ---
  const handleOpenExpenseForm = (expense = null) => {
    if (expense) {
      setExpenseFormData({
        description: expense.description || '',
        amount: expense.amount || '',
        category: expense.category || 'OTHER',
        expense_date: expense.expense_date || '',
        vendor: expense.vendor || '',
        payment_method: expense.payment_method || '',
        notes: expense.notes || '',
        is_recurring: expense.is_recurring || false,
        recurring_period: expense.recurring_period || '',
        recurring_end_date: expense.recurring_end_date || '',
        tax_deductible: expense.tax_deductible || false
      });
      setEditingExpenseId(expense.id);
    } else {
      setExpenseFormData({ ...emptyExpense });
      setEditingExpenseId(null);
    }
    setShowExpenseForm(true);
  };

  const handleSaveExpense = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount),
        recurring_period: expenseFormData.is_recurring ? expenseFormData.recurring_period : null,
        recurring_end_date: expenseFormData.is_recurring ? expenseFormData.recurring_end_date || null : null
      };
      if (editingExpenseId) {
        await expenseService.updateExpense(editingExpenseId, payload);
        setSuccess(t('expenses.messages.updated', 'Expense updated'));
      } else {
        await expenseService.createExpense(payload);
        setSuccess(t('expenses.messages.created', 'Expense created'));
      }
      setShowExpenseForm(false);
      loadExpenses();
      loadExpenseSummary();
      loadDashboard();
      loadCashFlow();
    } catch (err) {
      setError(err.response?.data?.error || t('expenses.messages.saveError', 'Failed to save expense'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingId) return;
    try {
      await expenseService.deleteExpense(deletingId);
      setSuccess(t('expenses.messages.deleted', 'Expense deleted'));
      setShowDeleteConfirm(false);
      setDeletingId(null);
      loadExpenses();
      loadExpenseSummary();
      loadDashboard();
      loadCashFlow();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  // --- Entry CRUD ---
  const handleOpenEntryForm = (entry = null) => {
    if (entry) {
      setEntryFormData({
        description: entry.description || '',
        amount: Math.abs(parseFloat(entry.amount)) || '',
        entry_type: entry.entry_type || 'CREDIT',
        entry_date: entry.entry_date || '',
        category: entry.category || '',
        reference: entry.reference || '',
        notes: entry.notes || ''
      });
      setEditingEntryId(entry.id);
    } else {
      setEntryFormData({ ...emptyEntry });
      setEditingEntryId(null);
    }
    setShowEntryForm(true);
  };

  const handleSaveEntry = async () => {
    setEntrySubmitting(true);
    setError(null);
    try {
      const payload = {
        ...entryFormData,
        amount: parseFloat(entryFormData.amount)
      };
      if (editingEntryId) {
        await accountingEntryService.updateEntry(editingEntryId, payload);
        setSuccess(t('accounting.messages.updated', 'Entry updated'));
      } else {
        await accountingEntryService.createEntry(payload);
        setSuccess(t('accounting.messages.created', 'Entry created'));
      }
      setShowEntryForm(false);
      loadEntries();
      loadEntrySummary();
      loadDashboard();
      loadCashFlow();
    } catch (err) {
      setError(err.response?.data?.error || t('accounting.messages.saveError', 'Failed to save entry'));
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntryId) return;
    try {
      await accountingEntryService.deleteEntry(deletingEntryId);
      setSuccess(t('accounting.messages.deleted', 'Entry deleted'));
      setShowEntryDeleteConfirm(false);
      setDeletingEntryId(null);
      loadEntries();
      loadEntrySummary();
      loadDashboard();
      loadCashFlow();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  // --- Aging / Reminders ---
  const allAgingInvoices = agingReport?.brackets?.flatMap(b => b.invoices) || [];

  const toggleInvoiceSelection = (id) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === allAgingInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(allAgingInvoices.map(i => i.id));
    }
  };

  const handleSendReminders = async () => {
    if (selectedInvoices.length === 0) return;
    setSendingReminders(true);
    try {
      await financeService.sendReminders(selectedInvoices);
      setSuccess(t('finance.agingReport.remindersSuccess', 'Reminders sent successfully'));
      setSelectedInvoices([]);
      loadAgingReport();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <Layout>
        <Container fluid className="py-4 text-center">
          <Spinner animation="border" />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800 }}>
            {t('navigation.finance', 'Finance')}
          </h2>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-4">
            <Nav.Item><Nav.Link eventKey="overview">{t('finance.tabs.overview', 'Overview')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="cashFlow">{t('finance.tabs.cashFlow', 'Cash Flow')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="expenses">{t('finance.tabs.expenses', 'Expenses')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="entries">{t('finance.tabs.entries', 'Entries')}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="agingReport">{t('finance.tabs.agingReport', 'Aging Report')}</Nav.Link></Nav.Item>
          </Nav>

          <Tab.Content>
            {/* ========== OVERVIEW TAB ========== */}
            <Tab.Pane eventKey="overview">
              {dashboard && (
                <>
                  <Row className="g-3 mb-4">
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.totalRevenue', 'Total Revenue')} value={formatCurrency(dashboard.totalRevenue)} variant="success" /></Col>
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.totalExpenses', 'Total Expenses')} value={formatCurrency(dashboard.totalExpenses)} variant="warning" /></Col>
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.adjustments', 'Adjustments')} value={formatCurrency(dashboard.totalAdjustments)} variant={dashboard.totalAdjustments >= 0 ? 'info' : 'danger'} /></Col>
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.netProfit', 'Net Profit')} value={formatCurrency(dashboard.netProfit)} variant={dashboard.netProfit >= 0 ? 'success' : 'danger'} /></Col>
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.collectionRate', 'Collection Rate')} value={`${dashboard.collectionRate}%`} variant="info" /></Col>
                    <Col md={4} lg={2}><KpiCard label={t('finance.kpi.overdueInvoices', 'Overdue Invoices')} value={dashboard.overdueCount} suffix={formatCurrency(dashboard.overdueAmount)} variant="danger" /></Col>
                  </Row>

                  {/* Mini P&L */}
                  <Card className="border-0 shadow-sm">
                    <Card.Header style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, background: 'transparent' }}>
                      {t('finance.profitLoss.title', 'Profit & Loss')}
                    </Card.Header>
                    <Card.Body>
                      <Table hover size="sm">
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600 }}>{t('finance.profitLoss.revenue', 'Revenue')}</td>
                            <td className="text-end" style={{ color: '#2D6A4F', fontWeight: 700 }}>{formatCurrency(dashboard.totalRevenue)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }}>{t('finance.profitLoss.expenses', 'Expenses')}</td>
                            <td className="text-end" style={{ color: '#D4A373', fontWeight: 700 }}>- {formatCurrency(dashboard.totalExpenses)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }}>{t('finance.profitLoss.adjustments', 'Adjustments')}</td>
                            <td className="text-end" style={{ color: dashboard.totalAdjustments >= 0 ? '#457B9D' : '#BC4749', fontWeight: 700 }}>
                              {dashboard.totalAdjustments >= 0 ? '+ ' : ''}{formatCurrency(dashboard.totalAdjustments)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #2D6A4F' }}>
                            <td style={{ fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif' }}>{t('finance.profitLoss.netProfit', 'Net Profit')}</td>
                            <td className="text-end" style={{ fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: dashboard.netProfit >= 0 ? '#2D6A4F' : '#BC4749' }}>
                              {formatCurrency(dashboard.netProfit)}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </>
              )}
            </Tab.Pane>

            {/* ========== CASH FLOW TAB ========== */}
            <Tab.Pane eventKey="cashFlow">
              <Card className="border-0 shadow-sm">
                <Card.Header style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, background: 'transparent' }}>
                  {t('finance.cashFlow.title', 'Cash Flow — 12 Months')}
                </Card.Header>
                <Card.Body>
                  {cashFlow.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={cashFlow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="monthLabel" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12 }} />
                        <YAxis style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontFamily: 'Space Grotesk, sans-serif' }} />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.3} name={t('finance.cashFlow.revenue', 'Revenue')} />
                        <Area type="monotone" dataKey="expenses" stackId="2" stroke="#D4A373" fill="#D4A373" fillOpacity={0.3} name={t('finance.cashFlow.expenses', 'Expenses')} />
                        <Area type="monotone" dataKey="adjustments" stroke="#457B9D" fill="#457B9D" fillOpacity={0.2} name={t('finance.cashFlow.adjustments', 'Adjustments')} />
                        <Area type="monotone" dataKey="net" stroke="#40916C" fill="none" strokeWidth={2} strokeDasharray="5 5" name={t('finance.cashFlow.net', 'Net')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted text-center py-5">{t('common.noData', 'No data available')}</p>
                  )}
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* ========== EXPENSES TAB ========== */}
            <Tab.Pane eventKey="expenses">
              <Row className="g-3">
                <Col lg={8}>
                  {/* Filters */}
                  <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
                    <InputGroup style={{ maxWidth: 250 }}>
                      <Form.Control
                        placeholder={t('common.search', 'Search')}
                        value={expenseFilters.search}
                        onChange={e => setExpenseFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                      />
                    </InputGroup>
                    <Form.Select
                      style={{ maxWidth: 180 }}
                      value={expenseFilters.category}
                      onChange={e => setExpenseFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                    >
                      <option value="">{t('common.all', 'All')}</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{t(`expenses.categories.${c}`, c)}</option>
                      ))}
                    </Form.Select>
                    {hasPermission('expenses.create') && (
                      <Button variant="success" onClick={() => handleOpenExpenseForm()} style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                        + {t('expenses.addExpense', 'Add Expense')}
                      </Button>
                    )}
                  </div>

                  {/* Table */}
                  <Card className="border-0 shadow-sm">
                    <Table hover responsive size="sm" className="mb-0">
                      <thead>
                        <tr style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                          <th>{t('expenses.expenseDate', 'Date')}</th>
                          <th>{t('expenses.description', 'Description')}</th>
                          <th>{t('expenses.category', 'Category')}</th>
                          <th>{t('expenses.vendor', 'Vendor')}</th>
                          <th className="text-end">{t('expenses.amount', 'Amount')}</th>
                          <th>{t('common.actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-muted py-4">{t('expenses.noExpenses', 'No expenses found')}</td></tr>
                        ) : expenses.map(exp => (
                          <tr key={exp.id}>
                            <td>{new Date(exp.expense_date).toLocaleDateString('fr-FR')}</td>
                            <td>
                              {exp.description}
                              {exp.is_recurring && <Badge bg="info" className="ms-2" pill>↻</Badge>}
                              {exp.tax_deductible && <Badge bg="success" className="ms-1" pill>TD</Badge>}
                            </td>
                            <td><Badge bg="light" text="dark" style={{ fontWeight: 600 }}>{t(`expenses.categories.${exp.category}`, exp.category)}</Badge></td>
                            <td className="text-muted">{exp.vendor || '—'}</td>
                            <td className="text-end" style={{ fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{formatCurrency(exp.amount)}</td>
                            <td>
                              {hasPermission('expenses.update') && (
                                <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleOpenExpenseForm(exp)}>{t('common.edit', 'Edit')}</Button>
                              )}
                              {hasPermission('expenses.delete') && (
                                <Button variant="outline-danger" size="sm" onClick={() => { setDeletingId(exp.id); setShowDeleteConfirm(true); }}>{t('common.delete', 'Delete')}</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>

                  {/* Pagination */}
                  {expensePagination && expensePagination.totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3 gap-2">
                      <Button variant="outline-secondary" size="sm" disabled={expenseFilters.page <= 1}
                        onClick={() => setExpenseFilters(prev => ({ ...prev, page: prev.page - 1 }))}>{t('common.previous', 'Prev')}</Button>
                      <span className="align-self-center text-muted small">{expenseFilters.page} / {expensePagination.totalPages}</span>
                      <Button variant="outline-secondary" size="sm" disabled={expenseFilters.page >= expensePagination.totalPages}
                        onClick={() => setExpenseFilters(prev => ({ ...prev, page: prev.page + 1 }))}>{t('common.next', 'Next')}</Button>
                    </div>
                  )}
                </Col>

                {/* Pie chart */}
                <Col lg={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, background: 'transparent' }}>
                      {t('expenses.category', 'Category')}
                    </Card.Header>
                    <Card.Body>
                      {expenseSummary?.byCategory?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={expenseSummary.byCategory.map(c => ({ name: t(`expenses.categories.${c.category}`, c.category), value: c.total }))}
                              cx="50%" cy="50%" outerRadius={100} dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                              style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 11 }}
                            >
                              {expenseSummary.byCategory.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted text-center py-5">{t('common.noData', 'No data')}</p>
                      )}
                      {expenseSummary && (
                        <div className="text-center mt-2" style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#D4A373' }}>
                          {t('expenses.title', 'Expenses')}: {formatCurrency(expenseSummary.total)}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab.Pane>

            {/* ========== ENTRIES TAB ========== */}
            <Tab.Pane eventKey="entries">
              {/* Summary KPIs */}
              {entrySummary && (
                <Row className="g-3 mb-4">
                  <Col md={4}>
                    <KpiCard label={t('accounting.summary.totalCredits', 'Total Credits')} value={formatCurrency(entrySummary.totalCredits)} variant="success" />
                  </Col>
                  <Col md={4}>
                    <KpiCard label={t('accounting.summary.totalDebits', 'Total Debits')} value={formatCurrency(entrySummary.totalDebits)} variant="danger" />
                  </Col>
                  <Col md={4}>
                    <KpiCard label={t('accounting.summary.netBalance', 'Net Balance')} value={formatCurrency(entrySummary.netBalance)} variant={entrySummary.netBalance >= 0 ? 'info' : 'danger'} />
                  </Col>
                </Row>
              )}

              {/* Filters */}
              <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
                <InputGroup style={{ maxWidth: 250 }}>
                  <Form.Control
                    placeholder={t('common.search', 'Search')}
                    value={entryFilters.search}
                    onChange={e => setEntryFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  />
                </InputGroup>
                <Form.Select
                  style={{ maxWidth: 150 }}
                  value={entryFilters.entry_type}
                  onChange={e => setEntryFilters(prev => ({ ...prev, entry_type: e.target.value, page: 1 }))}
                >
                  <option value="">{t('common.all', 'All')}</option>
                  <option value="CREDIT">{t('accounting.types.CREDIT', 'Credit')}</option>
                  <option value="DEBIT">{t('accounting.types.DEBIT', 'Debit')}</option>
                </Form.Select>
                {hasPermission('accounting.create') && (
                  <Button variant="success" onClick={() => handleOpenEntryForm()} style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                    + {t('accounting.addEntry', 'Add Entry')}
                  </Button>
                )}
              </div>

              {/* Table */}
              <Card className="border-0 shadow-sm">
                <Table hover responsive size="sm" className="mb-0">
                  <thead>
                    <tr style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                      <th>{t('accounting.entryDate', 'Date')}</th>
                      <th>{t('accounting.description', 'Description')}</th>
                      <th>{t('accounting.entryType', 'Type')}</th>
                      <th>{t('accounting.category', 'Category')}</th>
                      <th>{t('accounting.reference', 'Reference')}</th>
                      <th className="text-end">{t('accounting.amount', 'Amount')}</th>
                      <th>{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted py-4">{t('accounting.noEntries', 'No entries found')}</td></tr>
                    ) : entries.map(entry => {
                      const amt = parseFloat(entry.amount);
                      return (
                        <tr key={entry.id}>
                          <td>{new Date(entry.entry_date).toLocaleDateString('fr-FR')}</td>
                          <td>{entry.description}</td>
                          <td>
                            <Badge bg={entry.entry_type === 'CREDIT' ? 'success' : 'danger'} style={{ fontWeight: 600 }}>
                              {t(`accounting.types.${entry.entry_type}`, entry.entry_type)}
                            </Badge>
                          </td>
                          <td className="text-muted">{entry.category ? t(`accounting.categories.${entry.category}`, entry.category) : '—'}</td>
                          <td className="text-muted"><code>{entry.reference || '—'}</code></td>
                          <td className="text-end" style={{ fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: amt >= 0 ? '#2D6A4F' : '#BC4749' }}>
                            {formatCurrency(amt)}
                          </td>
                          <td>
                            {hasPermission('accounting.update') && (
                              <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleOpenEntryForm(entry)}>{t('common.edit', 'Edit')}</Button>
                            )}
                            {hasPermission('accounting.delete') && (
                              <Button variant="outline-danger" size="sm" onClick={() => { setDeletingEntryId(entry.id); setShowEntryDeleteConfirm(true); }}>{t('common.delete', 'Delete')}</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card>

              {/* Pagination */}
              {entryPagination && entryPagination.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3 gap-2">
                  <Button variant="outline-secondary" size="sm" disabled={entryFilters.page <= 1}
                    onClick={() => setEntryFilters(prev => ({ ...prev, page: prev.page - 1 }))}>{t('common.previous', 'Prev')}</Button>
                  <span className="align-self-center text-muted small">{entryFilters.page} / {entryPagination.totalPages}</span>
                  <Button variant="outline-secondary" size="sm" disabled={entryFilters.page >= entryPagination.totalPages}
                    onClick={() => setEntryFilters(prev => ({ ...prev, page: prev.page + 1 }))}>{t('common.next', 'Next')}</Button>
                </div>
              )}
            </Tab.Pane>

            {/* ========== AGING REPORT TAB ========== */}
            <Tab.Pane eventKey="agingReport">
              {agingReport && (
                <>
                  {/* Bracket summary */}
                  <Row className="g-3 mb-4">
                    {agingReport.brackets.map((bracket) => (
                      <Col md={3} key={bracket.label}>
                        <Card className="border-0 shadow-sm text-center h-100">
                          <Card.Body>
                            <div className="text-muted small" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {bracket.label === '0-30' ? t('finance.agingReport.bracket030', '0–30 days') :
                               bracket.label === '31-60' ? t('finance.agingReport.bracket3160', '31–60 days') :
                               bracket.label === '61-90' ? t('finance.agingReport.bracket6190', '61–90 days') :
                               t('finance.agingReport.bracket90plus', '90+ days')}
                            </div>
                            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '1.5rem',
                              color: bracket.label === '90+' ? '#BC4749' : bracket.label === '61-90' ? '#D4A373' : '#2D6A4F' }}>
                              {formatCurrency(bracket.totalDue)}
                            </div>
                            <Badge bg="secondary" pill>{bracket.count} {t('finance.agingReport.invoiceCount', 'invoice(s)')}</Badge>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  {/* Send reminders button */}
                  {hasPermission('billing.update') && allAgingInvoices.length > 0 && (
                    <div className="mb-3">
                      <Button
                        variant="warning"
                        disabled={selectedInvoices.length === 0 || sendingReminders}
                        onClick={handleSendReminders}
                        style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
                      >
                        {sendingReminders ? <Spinner size="sm" className="me-2" /> : null}
                        {t('finance.agingReport.sendReminders', 'Send Reminders')} ({selectedInvoices.length})
                      </Button>
                    </div>
                  )}

                  {/* Invoice table */}
                  {allAgingInvoices.length === 0 ? (
                    <Alert variant="success">{t('finance.agingReport.noOverdue', 'No overdue invoices')}</Alert>
                  ) : (
                    <Card className="border-0 shadow-sm">
                      <Table hover responsive size="sm" className="mb-0">
                        <thead>
                          <tr style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
                            <th>
                              <Form.Check
                                type="checkbox"
                                checked={selectedInvoices.length === allAgingInvoices.length && allAgingInvoices.length > 0}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th>{t('finance.agingReport.patient', 'Patient')}</th>
                            <th>{t('finance.agingReport.invoiceNumber', 'Invoice #')}</th>
                            <th>{t('finance.agingReport.dueDate', 'Due Date')}</th>
                            <th className="text-end">{t('finance.agingReport.amountDue', 'Amount Due')}</th>
                            <th>{t('finance.agingReport.daysOverdue', 'Days Overdue')}</th>
                            <th>{t('finance.agingReport.remindersSent', 'Reminders')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allAgingInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td><Form.Check type="checkbox" checked={selectedInvoices.includes(inv.id)} onChange={() => toggleInvoiceSelection(inv.id)} /></td>
                              <td>{inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : '—'}</td>
                              <td><code>{inv.invoice_number}</code></td>
                              <td>{new Date(inv.due_date).toLocaleDateString('fr-FR')}</td>
                              <td className="text-end" style={{ fontWeight: 700 }}>{formatCurrency(inv.amount_due)}</td>
                              <td>
                                <Badge bg={inv.days_overdue > 90 ? 'danger' : inv.days_overdue > 60 ? 'warning' : inv.days_overdue > 30 ? 'info' : 'secondary'}>
                                  {inv.days_overdue}j
                                </Badge>
                              </td>
                              <td>{inv.reminders_sent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card>
                  )}

                  <div className="mt-3 text-muted" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {t('finance.agingReport.totalDue', 'Total Due')}: <strong style={{ color: '#BC4749' }}>{formatCurrency(agingReport.totalAmount)}</strong>
                  </div>
                </>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>

        {/* ========== Expense Form Modal ========== */}
        <Modal show={showExpenseForm} onHide={() => setShowExpenseForm(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
              {editingExpenseId ? t('expenses.editExpense', 'Edit Expense') : t('expenses.addExpense', 'Add Expense')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={8}>
                <Form.Group>
                  <Form.Label>{t('expenses.description', 'Description')} *</Form.Label>
                  <Form.Control value={expenseFormData.description} onChange={e => setExpenseFormData(prev => ({ ...prev, description: e.target.value }))} maxLength={500} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('expenses.amount', 'Amount')} *</Form.Label>
                  <InputGroup>
                    <Form.Control type="number" step="0.01" min="0.01" value={expenseFormData.amount} onChange={e => setExpenseFormData(prev => ({ ...prev, amount: e.target.value }))} />
                    <InputGroup.Text>€</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('expenses.category', 'Category')} *</Form.Label>
                  <Form.Select value={expenseFormData.category} onChange={e => setExpenseFormData(prev => ({ ...prev, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.categories.${c}`, c)}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('expenses.expenseDate', 'Date')} *</Form.Label>
                  <Form.Control type="date" value={expenseFormData.expense_date} onChange={e => setExpenseFormData(prev => ({ ...prev, expense_date: e.target.value }))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('expenses.paymentMethod', 'Payment Method')}</Form.Label>
                  <Form.Select value={expenseFormData.payment_method} onChange={e => setExpenseFormData(prev => ({ ...prev, payment_method: e.target.value }))}>
                    <option value="">—</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`expenses.paymentMethods.${m}`, m.replace('_', ' '))}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('expenses.vendor', 'Vendor')}</Form.Label>
                  <Form.Control value={expenseFormData.vendor} onChange={e => setExpenseFormData(prev => ({ ...prev, vendor: e.target.value }))} maxLength={200} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{t('expenses.notes', 'Notes')}</Form.Label>
                  <Form.Control as="textarea" rows={2} value={expenseFormData.notes} onChange={e => setExpenseFormData(prev => ({ ...prev, notes: e.target.value }))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Check type="switch" label={t('expenses.recurring', 'Recurring')} checked={expenseFormData.is_recurring}
                  onChange={e => setExpenseFormData(prev => ({ ...prev, is_recurring: e.target.checked }))} className="mt-4" />
              </Col>
              {expenseFormData.is_recurring && (
                <>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{t('expenses.recurringPeriod', 'Period')}</Form.Label>
                      <Form.Select value={expenseFormData.recurring_period} onChange={e => setExpenseFormData(prev => ({ ...prev, recurring_period: e.target.value }))}>
                        <option value="">—</option>
                        {RECURRING_PERIODS.map(p => <option key={p} value={p}>{t(`expenses.recurringPeriods.${p}`, p)}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{t('expenses.recurringEndDate', 'End Date')}</Form.Label>
                      <Form.Control type="date" value={expenseFormData.recurring_end_date} onChange={e => setExpenseFormData(prev => ({ ...prev, recurring_end_date: e.target.value }))} />
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={4}>
                <Form.Check type="switch" label={t('expenses.taxDeductible', 'Tax Deductible')} checked={expenseFormData.tax_deductible}
                  onChange={e => setExpenseFormData(prev => ({ ...prev, tax_deductible: e.target.checked }))} className="mt-4" />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowExpenseForm(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant="success" onClick={handleSaveExpense} disabled={submitting || !expenseFormData.description || !expenseFormData.amount || !expenseFormData.expense_date}
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
              {submitting ? <Spinner size="sm" className="me-2" /> : null}
              {t('common.save', 'Save')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ========== Entry Form Modal ========== */}
        <Modal show={showEntryForm} onHide={() => setShowEntryForm(false)} size="lg">
          <Modal.Header closeButton style={{ borderBottom: `3px solid ${entryFormData.entry_type === 'CREDIT' ? '#2D6A4F' : '#BC4749'}` }}>
            <Modal.Title style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>
              {editingEntryId ? t('accounting.editEntry', 'Edit Entry') : t('accounting.addEntry', 'Add Entry')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: 700 }}>{t('accounting.entryType', 'Type')} *</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="radio"
                      id="entry-credit"
                      name="entry_type"
                      label={t('accounting.types.CREDIT', 'Credit')}
                      checked={entryFormData.entry_type === 'CREDIT'}
                      onChange={() => setEntryFormData(prev => ({ ...prev, entry_type: 'CREDIT' }))}
                      style={{ fontWeight: 700, color: '#2D6A4F' }}
                    />
                    <Form.Check
                      type="radio"
                      id="entry-debit"
                      name="entry_type"
                      label={t('accounting.types.DEBIT', 'Debit')}
                      checked={entryFormData.entry_type === 'DEBIT'}
                      onChange={() => setEntryFormData(prev => ({ ...prev, entry_type: 'DEBIT' }))}
                      style={{ fontWeight: 700, color: '#BC4749' }}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group>
                  <Form.Label>{t('accounting.description', 'Description')} *</Form.Label>
                  <Form.Control value={entryFormData.description} onChange={e => setEntryFormData(prev => ({ ...prev, description: e.target.value }))} maxLength={500} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('accounting.amount', 'Amount')} *</Form.Label>
                  <InputGroup>
                    <Form.Control type="number" step="0.01" min="0.01" value={entryFormData.amount} onChange={e => setEntryFormData(prev => ({ ...prev, amount: e.target.value }))} />
                    <InputGroup.Text>€</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('accounting.entryDate', 'Date')} *</Form.Label>
                  <Form.Control type="date" value={entryFormData.entry_date} onChange={e => setEntryFormData(prev => ({ ...prev, entry_date: e.target.value }))} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('accounting.category', 'Category')}</Form.Label>
                  <Form.Select value={entryFormData.category} onChange={e => setEntryFormData(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="">—</option>
                    {ENTRY_CATEGORIES.map(c => <option key={c} value={c}>{t(`accounting.categories.${c}`, c)}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('accounting.reference', 'Reference')}</Form.Label>
                  <Form.Control value={entryFormData.reference} onChange={e => setEntryFormData(prev => ({ ...prev, reference: e.target.value }))} maxLength={200} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>{t('accounting.notes', 'Notes')}</Form.Label>
                  <Form.Control as="textarea" rows={2} value={entryFormData.notes} onChange={e => setEntryFormData(prev => ({ ...prev, notes: e.target.value }))} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEntryForm(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              variant={entryFormData.entry_type === 'CREDIT' ? 'success' : 'danger'}
              onClick={handleSaveEntry}
              disabled={entrySubmitting || !entryFormData.description || !entryFormData.amount || !entryFormData.entry_date}
              style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
            >
              {entrySubmitting ? <Spinner size="sm" className="me-2" /> : null}
              {t('common.save', 'Save')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete confirm — Expense */}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
          onConfirm={handleDeleteExpense}
          title={t('expenses.deleteExpense', 'Delete Expense')}
          message={t('expenses.deleteConfirm', 'Are you sure you want to delete this expense?')}
          variant="danger"
        />

        {/* Delete confirm — Entry */}
        <ConfirmModal
          show={showEntryDeleteConfirm}
          onHide={() => { setShowEntryDeleteConfirm(false); setDeletingEntryId(null); }}
          onConfirm={handleDeleteEntry}
          title={t('accounting.deleteEntry', 'Delete Entry')}
          message={t('accounting.deleteConfirm', 'Are you sure you want to delete this entry?')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default FinancePage;
