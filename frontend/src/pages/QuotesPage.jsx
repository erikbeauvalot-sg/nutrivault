/**
 * Quotes Page
 * Quote/estimate management with list view, CRUD, status lifecycle, and PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Row, Col, Alert, Badge, Table, Form, Modal, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import * as quoteService from '../services/quoteService';
import * as clientService from '../services/clientService';
import { formatDate } from '../utils/dateUtils';

const statusColors = {
  DRAFT: 'secondary',
  SENT: 'primary',
  ACCEPTED: 'success',
  DECLINED: 'danger',
  EXPIRED: 'warning'
};

const QuotesPage = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '', page: 1, limit: 20 });
  const [pagination, setPagination] = useState(null);

  // Detail view
  const [detailQuote, setDetailQuote] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const defaultValidity = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; };
  const [formData, setFormData] = useState({ client_id: '', subject: '', notes: '', validity_date: defaultValidity(), tax_rate: '0', items: [{ item_name: '', description: '', quantity: '1', unit_price: '' }] });
  const [submitting, setSubmitting] = useState(false);

  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchingClients, setSearchingClients] = useState(false);

  // Status/delete/actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState({ quoteId: null, status: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.search) delete params.search;

      const response = await quoteService.getQuotes(params);
      const data = response?.data || response;
      setQuotes(data.data || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.fetchError', 'Failed to load quotes'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    if (hasPermission('quotes.read')) fetchQuotes();
  }, [fetchQuotes, hasPermission]);

  // Load detail if URL has id
  useEffect(() => {
    if (id) loadQuoteDetail(id);
  }, [id]);

  const loadQuoteDetail = async (quoteId) => {
    try {
      setDetailLoading(true);
      const response = await quoteService.getQuoteById(quoteId);
      setDetailQuote(response?.data?.data || response?.data || null);
    } catch (err) {
      setError(t('quotes.loadError', 'Failed to load quote'));
    } finally {
      setDetailLoading(false);
    }
  };

  // Client search debounce
  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        setSearchingClients(true);
        const response = await clientService.searchClients(clientSearch);
        setClientResults(response?.data?.data || []);
      } catch { setClientResults([]); }
      finally { setSearchingClients(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const getClientName = (client) => {
    if (!client) return '';
    if (client.client_type === 'company') return client.company_name || '';
    return [client.first_name, client.last_name].filter(Boolean).join(' ');
  };

  // Form handlers
  const handleOpenCreate = () => {
    setFormData({ client_id: '', subject: '', notes: '', validity_date: defaultValidity(), tax_rate: '0', items: [{ item_name: '', description: '', quantity: '1', unit_price: '' }] });
    setEditingId(null);
    setSelectedClient(null);
    setClientSearch('');
    setShowForm(true);
  };

  const handleOpenEdit = async (quote) => {
    try {
      const response = await quoteService.getQuoteById(quote.id);
      const q = response?.data?.data || response?.data || quote;
      setFormData({
        client_id: q.client_id,
        subject: q.subject || '',
        notes: q.notes || '',
        validity_date: q.validity_date ? new Date(q.validity_date).toISOString().split('T')[0] : '',
        tax_rate: String(q.tax_rate || 0),
        items: (q.items || []).map(i => ({
          item_name: i.item_name || '',
          description: i.description || '',
          quantity: String(i.quantity || 1),
          unit_price: String(i.unit_price || '')
        }))
      });
      if (q.items?.length === 0) {
        setFormData(prev => ({ ...prev, items: [{ item_name: '', description: '', quantity: '1', unit_price: '' }] }));
      }
      setSelectedClient(q.client || null);
      setEditingId(q.id);
      setShowForm(true);
    } catch (err) {
      setError(t('quotes.loadError', 'Failed to load quote'));
    }
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { item_name: '', description: '', quantity: '1', unit_price: '' }] }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * ((parseFloat(formData.tax_rate) || 0) / 100);
    return subtotal + tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        client_id: formData.client_id,
        subject: formData.subject || null,
        notes: formData.notes || null,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        items: formData.items.map((item, i) => ({
          item_name: item.item_name,
          description: item.description || null,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          sort_order: i
        }))
      };
      if (formData.validity_date) payload.validity_date = formData.validity_date;

      if (editingId) {
        await quoteService.updateQuote(editingId, payload);
        setSuccess(t('quotes.updateSuccess', 'Quote updated'));
      } else {
        await quoteService.createQuote(payload);
        setSuccess(t('quotes.createSuccess', 'Quote created'));
      }
      setShowForm(false);
      fetchQuotes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('quotes.saveError', 'Failed to save quote'));
    } finally {
      setSubmitting(false);
    }
  };

  // Actions
  const handleDelete = async () => {
    if (!quoteToDelete) return;
    try {
      await quoteService.deleteQuote(quoteToDelete.id);
      setSuccess(t('quotes.deleteSuccess', 'Quote deleted'));
      setShowDeleteConfirm(false);
      setQuoteToDelete(null);
      fetchQuotes();
      if (detailQuote?.id === quoteToDelete.id) { setDetailQuote(null); navigate('/quotes'); }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.deleteError', 'Failed to delete'));
    }
  };

  const handleStatusChange = async () => {
    setActionLoading(true);
    try {
      await quoteService.changeQuoteStatus(statusAction.quoteId, statusAction.status, { declined_reason: statusAction.reason || undefined });
      setSuccess(t('quotes.statusChanged', 'Status updated'));
      setShowStatusModal(false);
      fetchQuotes();
      if (detailQuote?.id === statusAction.quoteId) loadQuoteDetail(statusAction.quoteId);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.statusError', 'Failed to update status'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async (quoteId) => {
    setActionLoading(true);
    try {
      const result = await quoteService.convertToInvoice(quoteId);
      const invoiceNumber = result?.data?.invoice?.invoice_number || '';
      setSuccess(t('quotes.convertSuccess', 'Converted to invoice {{number}}', { number: invoiceNumber }));
      fetchQuotes();
      if (detailQuote?.id === quoteId) loadQuoteDetail(quoteId);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.convertError', 'Failed to convert'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (quoteId) => {
    try {
      await quoteService.duplicateQuote(quoteId);
      setSuccess(t('quotes.duplicateSuccess', 'Quote duplicated'));
      fetchQuotes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.duplicateError', 'Failed to duplicate'));
    }
  };

  const handleDownloadPDF = async (quoteId, quoteNumber) => {
    try {
      const response = await quoteService.downloadQuotePDF(quoteId, i18n.language);
      const blob = response?.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quoteNumber || 'devis'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(t('quotes.pdfError', 'Failed to download PDF'));
    }
  };

  const handleSendEmail = async (quoteId) => {
    setActionLoading(true);
    try {
      await quoteService.sendQuoteEmail(quoteId);
      setSuccess(t('quotes.sendSuccess', 'Quote sent by email'));
      fetchQuotes();
      if (detailQuote?.id === quoteId) loadQuoteDetail(quoteId);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('quotes.sendError', 'Failed to send email'));
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusChange = (quoteId, status) => {
    setStatusAction({ quoteId, status, reason: '' });
    setShowStatusModal(true);
  };

  const getStatusLabel = (status) => {
    const labels = { DRAFT: t('quotes.draft', 'Draft'), SENT: t('quotes.sent', 'Sent'), ACCEPTED: t('quotes.accepted', 'Accepted'), DECLINED: t('quotes.declined', 'Declined'), EXPIRED: t('quotes.expired', 'Expired') };
    return labels[status] || status;
  };

  // Detail view
  if (id && detailQuote) {
    const q = detailQuote;
    return (
      <Layout>
        <Container fluid className="py-4">
          <Button variant="outline-secondary" className="mb-3" onClick={() => { setDetailQuote(null); navigate('/quotes'); }}>
            ← {t('common.back', 'Back')}
          </Button>

          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

          <Row className="mb-4 align-items-center">
            <Col>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
                {q.quote_number} <Badge bg={statusColors[q.status]}>{getStatusLabel(q.status)}</Badge>
              </h2>
              {q.subject && <p className="text-muted mb-0">{q.subject}</p>}
            </Col>
            <Col xs="auto" className="d-flex gap-2 flex-wrap">
              {q.status === 'DRAFT' && hasPermission('quotes.update') && (
                <>
                  <Button variant="outline-primary" onClick={() => handleOpenEdit(q)}>{t('common.edit', 'Edit')}</Button>
                  <Button variant="primary" onClick={() => handleSendEmail(q.id)} disabled={actionLoading}>
                    {t('quotes.send', 'Send')}
                  </Button>
                  <Button variant="outline-danger" onClick={() => { setQuoteToDelete(q); setShowDeleteConfirm(true); }}>
                    {t('common.delete', 'Delete')}
                  </Button>
                </>
              )}
              {q.status === 'SENT' && hasPermission('quotes.update') && (
                <>
                  <Button variant="success" onClick={() => openStatusChange(q.id, 'ACCEPTED')}>{t('quotes.markAccepted', 'Accept')}</Button>
                  <Button variant="outline-danger" onClick={() => openStatusChange(q.id, 'DECLINED')}>{t('quotes.markDeclined', 'Decline')}</Button>
                  <Button variant="outline-secondary" onClick={() => handleSendEmail(q.id)} disabled={actionLoading}>{t('quotes.resend', 'Resend')}</Button>
                </>
              )}
              {q.status === 'ACCEPTED' && !q.billing_id && hasPermission('quotes.convert') && (
                <Button variant="warning" size="lg" onClick={() => handleConvert(q.id)} disabled={actionLoading}>
                  {t('quotes.convertToInvoice', 'Convert to Invoice')}
                </Button>
              )}
              {q.billing_id && q.invoice && (
                <Button variant="outline-info" onClick={() => navigate(`/billing/${q.invoice.id}`)}>
                  {t('quotes.viewInvoice', 'View Invoice')} ({q.invoice.invoice_number})
                </Button>
              )}
              <Button variant="outline-secondary" onClick={() => handleDownloadPDF(q.id, q.quote_number)}>
                PDF
              </Button>
              {hasPermission('quotes.create') && (
                <Button variant="outline-secondary" onClick={() => handleDuplicate(q.id)}>
                  {t('quotes.duplicate', 'Duplicate')}
                </Button>
              )}
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <div className="p-3 border rounded mb-3">
                <h6 className="text-muted mb-2">{t('quotes.clientInfo', 'Client')}</h6>
                <div className="fw-semibold">{getClientName(q.client)}</div>
                {q.client?.email && <div>{q.client.email}</div>}
                {q.client?.phone && <div>{q.client.phone}</div>}
                {q.client?.address_line1 && <div>{q.client.address_line1}</div>}
                {(q.client?.postal_code || q.client?.city) && (
                  <div>{[q.client.postal_code, q.client.city].filter(Boolean).join(' ')}</div>
                )}
              </div>
            </Col>
            <Col md={6}>
              <div className="p-3 border rounded mb-3">
                <h6 className="text-muted mb-2">{t('quotes.details', 'Details')}</h6>
                <div><strong>{t('quotes.date', 'Date')}:</strong> {formatDate(q.quote_date, i18n.language)}</div>
                <div><strong>{t('quotes.validUntil', 'Valid Until')}:</strong> {formatDate(q.validity_date, i18n.language)}</div>
                {q.notes && <div className="mt-2"><em>{q.notes}</em></div>}
              </div>
            </Col>
          </Row>

          {/* Items table */}
          <Table bordered className="mt-3">
            <thead className="table-light">
              <tr>
                <th>{t('quotes.itemName', 'Item')}</th>
                <th>{t('quotes.itemDescription', 'Description')}</th>
                <th className="text-end">{t('quotes.qty', 'Qty')}</th>
                <th className="text-end">{t('quotes.unitPrice', 'Unit Price')}</th>
                <th className="text-end">{t('quotes.lineTotal', 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              {(q.items || []).map((item, i) => {
                const lineTotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
                return (
                  <tr key={item.id || i}>
                    <td>{item.item_name}</td>
                    <td className="text-muted">{item.description || '—'}</td>
                    <td className="text-end">{parseFloat(item.quantity) || 1}</td>
                    <td className="text-end">€{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="text-end fw-semibold">€{lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" className="text-end">{t('quotes.subtotalHT', 'Subtotal HT')}</td>
                <td className="text-end">€{parseFloat(q.amount_subtotal).toFixed(2)}</td>
              </tr>
              {parseFloat(q.tax_rate) > 0 && (
                <tr>
                  <td colSpan="4" className="text-end">{t('quotes.tva', 'TVA')} ({q.tax_rate}%)</td>
                  <td className="text-end">€{parseFloat(q.amount_tax).toFixed(2)}</td>
                </tr>
              )}
              <tr className="fw-bold">
                <td colSpan="4" className="text-end">{t('quotes.totalTTC', 'Total TTC')}</td>
                <td className="text-end" style={{ fontSize: '1.1em' }}>€{parseFloat(q.amount_total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </Table>
        </Container>
      </Layout>
    );
  }

  // Detail loading
  if (id && detailLoading) {
    return <Layout><Container className="text-center py-5"><Spinner animation="border" /></Container></Layout>;
  }

  // List view
  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4 align-items-center">
          <Col>
            <h2 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
              {t('quotes.title', 'Quotes')}
            </h2>
          </Col>
          <Col xs="auto">
            {hasPermission('quotes.create') && (
              <Button variant="primary" onClick={handleOpenCreate}>
                + {t('quotes.create', 'New Quote')}
              </Button>
            )}
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Filters */}
        <Row className="mb-3 g-2">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>🔍</InputGroup.Text>
              <Form.Control
                placeholder={t('quotes.searchPlaceholder', 'Search by number, subject...')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}>
              <option value="">{t('quotes.allStatuses', 'All statuses')}</option>
              <option value="DRAFT">{t('quotes.draft', 'Draft')}</option>
              <option value="SENT">{t('quotes.sent', 'Sent')}</option>
              <option value="ACCEPTED">{t('quotes.accepted', 'Accepted')}</option>
              <option value="DECLINED">{t('quotes.declined', 'Declined')}</option>
              <option value="EXPIRED">{t('quotes.expired', 'Expired')}</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Table */}
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : quotes.length === 0 ? (
          <Alert variant="info">{t('quotes.noQuotes', 'No quotes found')}</Alert>
        ) : (
          <>
            <Table hover responsive className="align-middle">
              <thead>
                <tr>
                  <th>{t('quotes.number', '#')}</th>
                  <th>{t('quotes.date', 'Date')}</th>
                  <th>{t('quotes.client', 'Client')}</th>
                  <th>{t('quotes.subject', 'Subject')}</th>
                  <th className="text-end">{t('quotes.amount', 'Amount')}</th>
                  <th>{t('quotes.status', 'Status')}</th>
                  <th>{t('quotes.validUntil', 'Valid Until')}</th>
                  <th className="text-end">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}>
                    <td className="fw-semibold">{q.quote_number}</td>
                    <td>{formatDate(q.quote_date, i18n.language)}</td>
                    <td>{getClientName(q.client)}</td>
                    <td>{q.subject || '—'}</td>
                    <td className="text-end">€{parseFloat(q.amount_total).toFixed(2)}</td>
                    <td><Badge bg={statusColors[q.status]}>{getStatusLabel(q.status)}</Badge></td>
                    <td>{formatDate(q.validity_date, i18n.language)}</td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => handleDownloadPDF(q.id, q.quote_number)}>
                        PDF
                      </Button>
                      {q.status === 'DRAFT' && hasPermission('quotes.update') && (
                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleOpenEdit(q)}>
                          {t('common.edit', 'Edit')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {pagination && pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">
                  {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                </span>
                <div>
                  <Button size="sm" variant="outline-secondary" className="me-1" disabled={pagination.page <= 1} onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>
                    {t('common.previous', 'Previous')}
                  </Button>
                  <Button size="sm" variant="outline-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>
                    {t('common.next', 'Next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Quote Modal */}
        <Modal show={showForm} onHide={() => setShowForm(false)} size="xl">
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingId ? t('quotes.editQuote', 'Edit Quote') : t('quotes.createQuote', 'New Quote')}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {/* Client selection */}
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('quotes.client', 'Client')} *</Form.Label>
                    {selectedClient ? (
                      <div className="d-flex align-items-center border rounded p-2">
                        <div className="flex-grow-1">
                          <strong>{getClientName(selectedClient)}</strong>
                          {selectedClient.email && <span className="text-muted ms-2">{selectedClient.email}</span>}
                        </div>
                        <Button size="sm" variant="outline-secondary" onClick={() => { setSelectedClient(null); setFormData(prev => ({ ...prev, client_id: '' })); }}>
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="position-relative">
                        <Form.Control
                          placeholder={t('quotes.searchClient', 'Search client...')}
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          required={!formData.client_id}
                        />
                        {searchingClients && <Spinner size="sm" className="position-absolute" style={{ right: 10, top: 10 }} />}
                        {clientResults.length > 0 && (
                          <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: 200, overflowY: 'auto' }}>
                            {clientResults.map(c => (
                              <div
                                key={c.id}
                                className="p-2 border-bottom cursor-pointer"
                                style={{ cursor: 'pointer' }}
                                onClick={() => { setSelectedClient(c); setFormData(prev => ({ ...prev, client_id: c.id })); setClientSearch(''); setClientResults([]); }}
                              >
                                <strong>{getClientName(c)}</strong>
                                {c.email && <span className="text-muted ms-2">{c.email}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('quotes.subject', 'Subject')}</Form.Label>
                    <Form.Control
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder={t('quotes.subjectPlaceholder', 'e.g. Nutritional program - 3 months')}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('quotes.validityDate', 'Valid Until')}</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.validity_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, validity_date: e.target.value }))}
                    />
                    <Form.Text className="text-muted">{t('quotes.validityHint', 'Default: 30 days')}</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('quotes.taxRate', 'Tax Rate (%)')}</Form.Label>
                    <Form.Control
                      type="number" step="0.1" min="0" max="100"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Line items */}
              <h6 className="mt-4 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t('quotes.items', 'Items')}
              </h6>
              <Table bordered size="sm">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '30%' }}>{t('quotes.itemName', 'Item')} *</th>
                    <th style={{ width: '25%' }}>{t('quotes.itemDescription', 'Description')}</th>
                    <th style={{ width: '12%' }} className="text-end">{t('quotes.qty', 'Qty')}</th>
                    <th style={{ width: '15%' }} className="text-end">{t('quotes.unitPrice', 'Unit Price')} *</th>
                    <th style={{ width: '12%' }} className="text-end">{t('quotes.lineTotal', 'Total')}</th>
                    <th style={{ width: '6%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    return (
                      <tr key={index}>
                        <td>
                          <Form.Control size="sm" required value={item.item_name} onChange={(e) => updateItem(index, 'item_name', e.target.value)} />
                        </td>
                        <td>
                          <Form.Control size="sm" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                        </td>
                        <td>
                          <Form.Control size="sm" type="number" step="0.01" min="0.01" required className="text-end"
                            value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                        </td>
                        <td>
                          <Form.Control size="sm" type="number" step="0.01" min="0" required className="text-end"
                            value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} />
                        </td>
                        <td className="text-end align-middle fw-semibold">€{lineTotal.toFixed(2)}</td>
                        <td className="text-center align-middle">
                          {formData.items.length > 1 && (
                            <Button size="sm" variant="outline-danger" onClick={() => removeItem(index)}>×</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <Button size="sm" variant="outline-primary" onClick={addItem} className="mb-3">
                + {t('quotes.addItem', 'Add Item')}
              </Button>

              {/* Totals */}
              <div className="text-end mt-2">
                <div className="text-muted">{t('quotes.subtotalHT', 'Subtotal HT')}: <strong>€{calculateSubtotal().toFixed(2)}</strong></div>
                {parseFloat(formData.tax_rate) > 0 && (
                  <div className="text-muted">TVA ({formData.tax_rate}%): <strong>€{(calculateSubtotal() * parseFloat(formData.tax_rate) / 100).toFixed(2)}</strong></div>
                )}
                <div style={{ fontSize: '1.2em' }}>{t('quotes.totalTTC', 'Total TTC')}: <strong>€{calculateTotal().toFixed(2)}</strong></div>
              </div>

              <Form.Group className="mt-3">
                <Form.Label>{t('quotes.notes', 'Notes / Conditions')}</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" variant="primary" disabled={submitting || !formData.client_id}>
                {submitting && <Spinner size="sm" className="me-1" />}
                {editingId ? t('common.save', 'Save') : t('quotes.saveDraft', 'Save Draft')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Status Change Modal */}
        <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('quotes.changeStatus', 'Change Status')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{t('quotes.confirmStatus', 'Change status to {{status}}?', { status: getStatusLabel(statusAction.status) })}</p>
            {statusAction.status === 'DECLINED' && (
              <Form.Group>
                <Form.Label>{t('quotes.declineReason', 'Reason (optional)')}</Form.Label>
                <Form.Control as="textarea" rows={2} value={statusAction.reason} onChange={(e) => setStatusAction(prev => ({ ...prev, reason: e.target.value }))} />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant={statusAction.status === 'ACCEPTED' ? 'success' : 'danger'} onClick={handleStatusChange} disabled={actionLoading}>
              {actionLoading && <Spinner size="sm" className="me-1" />}
              {t('common.confirm', 'Confirm')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title={t('quotes.deleteTitle', 'Delete Quote')}
          message={t('quotes.deleteConfirm', 'Are you sure you want to delete this quote?')}
          confirmVariant="danger"
          confirmText={t('common.delete', 'Delete')}
        />
      </Container>
    </Layout>
  );
};

export default QuotesPage;
