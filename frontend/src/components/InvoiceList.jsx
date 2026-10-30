import { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, InputGroup, Pagination, Dropdown, Card, Alert, Spinner, ButtonGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import * as billingService from '../services/billingService';
import { formatDate as utilFormatDate, getCurrentMonthKey, shiftMonthKey, formatMonthLabel } from '../utils/dateUtils';
import ActionButton from './ActionButton';
import ConfirmModal from './ConfirmModal';
import './InvoiceList.css';

function InvoiceList({
  invoices,
  loading,
  filters,
  pagination,
  onFilterChange,
  onPageChange,
  onView,
  onEdit,
  onRecordPayment,
  onDelete,
  canCreate,
  canUpdate,
  canDelete
}) {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Multi-select state
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [showSendInvoicesConfirm, setShowSendInvoicesConfirm] = useState(false);
  const [showSendRemindersConfirm, setShowSendRemindersConfirm] = useState(false);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SENT': return 'primary';
      case 'PAID': return 'success';
      case 'OVERDUE': return 'danger';
      case 'CANCELLED': return 'warning';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return utilFormatDate(dateString, i18n.language);
  };

  const handleStatusFilterChange = (status) => {
    onFilterChange({ status: status === 'all' ? '' : status });
  };

  // Month filter is only shown when the parent manages filters.month
  const hasMonthFilter = filters.month !== undefined;

  const [availableMonths, setAvailableMonths] = useState([]);

  const handleMonthChange = (month) => {
    onFilterChange({ month });
  };

  // Refresh on open so newly created invoices show up in the list
  const handleMonthMenuToggle = async (isOpen) => {
    if (!isOpen) return;
    try {
      const response = await billingService.getInvoiceMonths();
      setAvailableMonths(response.data.data || []);
    } catch (err) {
      console.error('Error fetching invoice months:', err);
    }
  };

  // At most MAX_MONTH_OPTIONS months (plus "All months"), centred on the selected month
  const MAX_MONTH_OPTIONS = 9;
  const getMonthOptions = () => {
    const months = availableMonths.map(m => m.month);
    if (filters.month && !months.includes(filters.month)) {
      months.push(filters.month);
      months.sort((a, b) => b.localeCompare(a));
    }
    const selectedIndex = Math.max(months.indexOf(filters.month), 0);
    const start = Math.max(
      0,
      Math.min(selectedIndex - Math.floor(MAX_MONTH_OPTIONS / 2), months.length - MAX_MONTH_OPTIONS)
    );
    const counts = Object.fromEntries(availableMonths.map(m => [m.month, m.count]));
    return months.slice(start, start + MAX_MONTH_OPTIONS).map(month => ({ month, count: counts[month] || 0 }));
  };

  const handleSearchChange = (search) => {
    onFilterChange({ search });
  };

  //Multi-select handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(invoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleBatchSendInvoices = () => {
    if (selectedInvoices.length === 0) return;
    setShowSendInvoicesConfirm(true);
  };

  const confirmBatchSendInvoices = async () => {
    try {
      setBatchLoading(true);
      setBatchResult(null);
      const result = await billingService.sendInvoiceBatch(selectedInvoices);
      setBatchResult({
        type: 'sendInvoices',
        ...result.data
      });
      setSelectedInvoices([]);
    } catch (err) {
      setBatchResult({
        type: 'error',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchSendReminders = () => {
    if (selectedInvoices.length === 0) return;
    setShowSendRemindersConfirm(true);
  };

  const confirmBatchSendReminders = async () => {
    try {
      setBatchLoading(true);
      setBatchResult(null);
      const result = await billingService.sendReminderBatch(selectedInvoices);
      setBatchResult({
        type: 'sendReminders',
        ...result.data
      });
      setSelectedInvoices([]);
    } catch (err) {
      setBatchResult({
        type: 'error',
        message: err.response?.data?.error || err.message
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages } = pagination;
    const items = [];

    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
    );

    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      items.push(<Pagination.Item key={1} onClick={() => onPageChange(1)}>1</Pagination.Item>);
      if (startPage > 2) items.push(<Pagination.Ellipsis key="start-ellipsis" />);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) items.push(<Pagination.Ellipsis key="end-ellipsis" />);
      items.push(<Pagination.Item key={totalPages} onClick={() => onPageChange(totalPages)}>{totalPages}</Pagination.Item>);
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      />
    );

    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination>{items}</Pagination>
      </div>
    );
  };

  return (
    <div>
      {/* Batch Actions Bar */}
      {selectedInvoices.length > 0 && canUpdate && (
        <Alert variant="info" className="mb-3 d-flex align-items-center justify-content-between">
          <div>
            <strong>{t('billing.selectedCount', { count: selectedInvoices.length, defaultValue: `${selectedInvoices.length} invoice(s) selected` })}</strong>
          </div>
          <ButtonGroup>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchSendInvoices}
              disabled={batchLoading}
            >
              {batchLoading ? <Spinner animation="border" size="sm" /> : '📧'} {t('billing.batchSendInvoices', 'Send Invoices')}
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={handleBatchSendReminders}
              disabled={batchLoading}
            >
              {batchLoading ? <Spinner animation="border" size="sm" /> : '🔔'} {t('billing.batchSendReminders', 'Send Reminders')}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setSelectedInvoices([])}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </ButtonGroup>
        </Alert>
      )}

      {/* Batch Operation Results */}
      {batchResult && (
        <Alert
          variant={batchResult.type === 'error' ? 'danger' : 'success'}
          dismissible
          onClose={() => setBatchResult(null)}
          className="mb-3"
        >
          {batchResult.type === 'error' ? (
            <div>{batchResult.message}</div>
          ) : (
            <div>
              <strong>{t('billing.batchOperationComplete', 'Batch operation complete')}</strong>
              <ul className="mb-0 mt-2">
                <li>✅ {t('billing.successfulCount', { count: batchResult.successful?.length || 0, defaultValue: `${batchResult.successful?.length || 0} successful` })}</li>
                {batchResult.failed?.length > 0 && (
                  <li>❌ {t('billing.failedCount', { count: batchResult.failed.length, defaultValue: `${batchResult.failed.length} failed` })}</li>
                )}
              </ul>
            </div>
          )}
        </Alert>
      )}

      {/* Search and Filter Controls — always rendered so the search input
          keeps focus while invoices are (re)loading */}
      <div className="invoice-list-controls mb-3">
        <div className="invoice-list-filters">
          {hasMonthFilter && (
            <div className="invoice-month-filter">
              <Button
                variant="outline-secondary"
                onClick={() => handleMonthChange(shiftMonthKey(filters.month || getCurrentMonthKey(), -1))}
                title={t('billing.previousMonth', 'Previous month')}
                aria-label={t('billing.previousMonth', 'Previous month')}
              >
                ‹
              </Button>
              <Dropdown onToggle={handleMonthMenuToggle}>
                <Dropdown.Toggle as="button" type="button" className="invoice-month-label">
                  {filters.month
                    ? formatMonthLabel(filters.month, i18n.language)
                    : t('billing.allMonths', 'All months')}
                </Dropdown.Toggle>
                <Dropdown.Menu className="invoice-month-menu">
                  <Dropdown.Item active={!filters.month} onClick={() => handleMonthChange('')}>
                    {t('billing.allMonths', 'All months')}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  {getMonthOptions().map(({ month, count }) => (
                    <Dropdown.Item
                      key={month}
                      active={filters.month === month}
                      onClick={() => handleMonthChange(month)}
                      className="invoice-month-option"
                    >
                      <span>{formatMonthLabel(month, i18n.language)}</span>
                      <Badge bg="light" text="dark" pill>{count}</Badge>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              <Button
                variant="outline-secondary"
                onClick={() => handleMonthChange(shiftMonthKey(filters.month || getCurrentMonthKey(), 1))}
                title={t('billing.nextMonth', 'Next month')}
                aria-label={t('billing.nextMonth', 'Next month')}
              >
                ›
              </Button>
            </div>
          )}

          <InputGroup className="invoice-search-input">
            <InputGroup.Text>🔍</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={t('billing.searchPlaceholder', 'Search by invoice number or patient')}
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </InputGroup>

          <Form.Select
            value={filters.status || 'all'}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="invoice-status-filter"
          >
            <option value="all">{t('common.all', 'All Status')}</option>
            <option value="DRAFT">{t('billing.status.draft', 'Draft')}</option>
            <option value="SENT">{t('billing.status.sent', 'Sent')}</option>
            <option value="PAID">{t('billing.status.paid', 'Paid')}</option>
            <option value="OVERDUE">{t('billing.status.overdue', 'Overdue')}</option>
            <option value="CANCELLED">{t('billing.status.cancelled', 'Cancelled')}</option>
          </Form.Select>
        </div>

        <div className="text-muted invoice-results-count">
          {pagination ? (
            t('billing.showingResults', {
              count: invoices.length,
              total: pagination.total,
              defaultValue: 'Showing {{count}} of {{total}} invoices'
            })
          ) : (
            t('billing.totalInvoices', {
              count: invoices.length,
              defaultValue: '{{count}} invoices'
            })
          )}
        </div>
      </div>

      {/* Mobile Card View / Desktop Table View */}
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
          </div>
          <div className="mt-2">{t('common.loading', 'Loading invoices...')}</div>
        </div>
      ) : isMobile ? (
        // Mobile Card View
        <div className="invoice-cards-container">
          {invoices.length === 0 ? (
            <Card className="text-center py-4">
              <Card.Body>
                <div className="text-muted">
                  <strong>{t('billing.noInvoices', 'No invoices found')}</strong>
                  <br />
                  <small>{t('billing.createFirstInvoice', 'Create your first invoice to get started')}</small>
                </div>
              </Card.Body>
            </Card>
          ) : (
            invoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="invoice-card mb-3"
                onClick={() => onView(invoice)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1">
                        <strong>{invoice.invoice_number}</strong>
                      </h6>
                      {invoice.patient && (
                        <div className="text-muted small">
                          {invoice.patient.first_name} {invoice.patient.last_name}
                        </div>
                      )}
                    </div>
                    <Badge bg={getStatusBadgeVariant(invoice.status)}>
                      {t(`billing.status.${invoice.status.toLowerCase()}`, invoice.status)}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">{t('billing.amount', 'Amount')}:</span>
                      <strong>{formatCurrency(invoice.amount_total)}</strong>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">{t('billing.paid', 'Paid')}:</span>
                      <span>{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">{t('billing.balance', 'Balance')}:</span>
                      <strong className={invoice.amount_due > 0 ? 'text-danger' : 'text-success'}>
                        {formatCurrency(invoice.amount_due)}
                      </strong>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between small text-muted mb-3">
                    <span>📅 {formatDate(invoice.invoice_date)}</span>
                    <span>⏰ {t('billing.due', 'Due')}: {formatDate(invoice.due_date)}</span>
                  </div>

                  <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                    {canUpdate && invoice.amount_due > 0 && (
                      <ActionButton
                        action="payment"
                        onClick={() => onRecordPayment(invoice)}
                        title={t('billing.recordPayment', 'Record Payment')}
                      />
                    )}
                    {canUpdate && (
                      <ActionButton
                        action="edit"
                        onClick={() => onEdit(invoice)}
                        title={t('common.edit', 'Edit')}
                      />
                    )}
                    {canDelete && (
                      <ActionButton
                        action="delete"
                        onClick={() => onDelete(invoice.id)}
                        title={t('common.delete', 'Delete')}
                      />
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="table-responsive">
          <Table striped bordered hover size="sm" className="invoice-table">
            <thead className="table-dark">
              <tr>
                {canUpdate && (
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                )}
                <th>{t('billing.invoiceNumber', 'Invoice #')}</th>
                <th>{t('billing.patient', 'Patient')}</th>
                <th>{t('billing.date', 'Date')}</th>
                <th>{t('billing.dueDate', 'Due Date')}</th>
                <th>{t('billing.amount', 'Amount')}</th>
                <th>{t('billing.paid', 'Paid')}</th>
                <th>{t('billing.balance', 'Balance')}</th>
                <th>{t('billing.statusLabel', 'Status')}</th>
                <th>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={canUpdate ? "10" : "9"} className="text-center py-4">
                    <div className="text-muted">
                      <strong>{t('billing.noInvoices', 'No invoices found')}</strong>
                      <br />
                      <small>{t('billing.createFirstInvoice', 'Create your first invoice to get started')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => onView(invoice)}
                    style={{ cursor: 'pointer' }}
                    className="invoice-row"
                  >
                    {canUpdate && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <Form.Check
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                        />
                      </td>
                    )}
                    <td>
                      <strong>{invoice.invoice_number}</strong>
                    </td>
                    <td>
                      {invoice.patient ? (
                        <span>{invoice.patient.first_name} {invoice.patient.last_name}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td className="text-end">{formatCurrency(invoice.amount_total)}</td>
                    <td className="text-end">{formatCurrency(invoice.amount_paid)}</td>
                    <td className="text-end">
                      <strong className={invoice.amount_due > 0 ? 'text-danger' : 'text-success'}>
                        {formatCurrency(invoice.amount_due)}
                      </strong>
                    </td>
                    <td>
                      <Badge bg={getStatusBadgeVariant(invoice.status)}>
                        {t(`billing.status.${invoice.status.toLowerCase()}`, invoice.status)}
                      </Badge>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        {canUpdate && (
                          <>
                            <ActionButton
                              action="edit"
                              onClick={() => onEdit(invoice)}
                              title={t('common.edit', 'Edit')}
                            />

                            {invoice.amount_due > 0 && (
                              <ActionButton
                                action="payment"
                                onClick={() => onRecordPayment(invoice)}
                                title={t('billing.recordPayment', 'Record Payment')}
                              />
                            )}
                          </>
                        )}

                        {canDelete && (
                          <ActionButton
                            action="delete"
                            onClick={() => onDelete(invoice.id)}
                            title={t('common.delete', 'Delete')}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}

      {/* Confirm Modals */}
      <ConfirmModal
        show={showSendInvoicesConfirm}
        onHide={() => setShowSendInvoicesConfirm(false)}
        onConfirm={confirmBatchSendInvoices}
        title={t('common.confirmation', 'Confirmation')}
        message={t('billing.confirmBatchSendInvoices', {
          count: selectedInvoices.length,
          defaultValue: `Send ${selectedInvoices.length} invoice(s) by email?`
        })}
        confirmLabel={t('billing.send', 'Send')}
        variant="primary"
      />

      <ConfirmModal
        show={showSendRemindersConfirm}
        onHide={() => setShowSendRemindersConfirm(false)}
        onConfirm={confirmBatchSendReminders}
        title={t('common.confirmation', 'Confirmation')}
        message={t('billing.confirmBatchSendReminders', {
          count: selectedInvoices.length,
          defaultValue: `Send payment reminders for ${selectedInvoices.length} invoice(s)?`
        })}
        confirmLabel={t('billing.send', 'Send')}
        variant="warning"
      />
    </div>
  );
}

export default InvoiceList;