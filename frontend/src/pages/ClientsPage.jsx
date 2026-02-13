/**
 * Clients Page
 * Client management with list view, create/edit modals
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Row, Col, Alert, Badge, Table, Form, Modal, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import * as clientService from '../services/clientService';

const emptyClient = {
  client_type: 'person',
  company_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  postal_code: '',
  country: 'France',
  siret: '',
  vat_number: '',
  contact_person: '',
  notes: '',
  patient_id: '',
  language_preference: 'fr'
};

const ClientsPage = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({ client_type: '', search: '', page: 1, limit: 20 });
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...emptyClient });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.client_type) params.client_type = filters.client_type;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.limit = filters.limit;

      const response = await clientService.getClients(params);
      const data = response?.data || response;
      setClients(data.data || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.response?.data?.error || t('clients.fetchError', 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    if (hasPermission('clients.read')) {
      fetchClients();
    }
  }, [fetchClients, hasPermission]);

  const handleOpenCreate = () => {
    setFormData({ ...emptyClient });
    setEditingId(null);
    setShowForm(true);
  };

  const handleOpenEdit = async (client) => {
    try {
      const response = await clientService.getClientById(client.id);
      const data = response?.data?.data || response?.data || client;
      setFormData({
        client_type: data.client_type || 'person',
        company_name: data.company_name || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'France',
        siret: data.siret || '',
        vat_number: data.vat_number || '',
        contact_person: data.contact_person || '',
        notes: data.notes || '',
        patient_id: data.patient_id || '',
        language_preference: data.language_preference || 'fr'
      });
      setEditingId(data.id);
      setShowForm(true);
    } catch (err) {
      setError(t('clients.loadError', 'Failed to load client details'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (!payload.patient_id) delete payload.patient_id;
      if (!payload.email) payload.email = null;

      if (editingId) {
        await clientService.updateClient(editingId, payload);
        setSuccess(t('clients.updateSuccess', 'Client updated successfully'));
      } else {
        await clientService.createClient(payload);
        setSuccess(t('clients.createSuccess', 'Client created successfully'));
      }
      setShowForm(false);
      fetchClients();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('clients.saveError', 'Failed to save client'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await clientService.deleteClient(clientToDelete.id);
      setSuccess(t('clients.deleteSuccess', 'Client deleted successfully'));
      setShowDeleteConfirm(false);
      setClientToDelete(null);
      fetchClients();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('clients.deleteError', 'Failed to delete client'));
    }
  };

  const getDisplayName = (client) => {
    if (client.client_type === 'company') return client.company_name || '';
    return [client.first_name, client.last_name].filter(Boolean).join(' ');
  };

  const getTypeBadge = (type) => {
    return type === 'company'
      ? <Badge bg="info">{t('clients.company', 'Company')}</Badge>
      : <Badge bg="secondary">{t('clients.person', 'Person')}</Badge>;
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4 align-items-center">
          <Col>
            <h2 className="mb-0" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
              {t('clients.title', 'Clients')}
            </h2>
          </Col>
          <Col xs="auto">
            {hasPermission('clients.create') && (
              <Button variant="primary" onClick={handleOpenCreate}>
                + {t('clients.create', 'New Client')}
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
                placeholder={t('clients.searchPlaceholder', 'Search by name, email...')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select
              value={filters.client_type}
              onChange={(e) => setFilters(prev => ({ ...prev, client_type: e.target.value, page: 1 }))}
            >
              <option value="">{t('clients.allTypes', 'All types')}</option>
              <option value="person">{t('clients.person', 'Person')}</option>
              <option value="company">{t('clients.company', 'Company')}</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Table */}
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : clients.length === 0 ? (
          <Alert variant="info">{t('clients.noClients', 'No clients found')}</Alert>
        ) : (
          <>
            <Table hover responsive className="align-middle">
              <thead>
                <tr>
                  <th>{t('clients.name', 'Name')}</th>
                  <th>{t('clients.type', 'Type')}</th>
                  <th>{t('clients.emailLabel', 'Email')}</th>
                  <th>{t('clients.phoneLabel', 'Phone')}</th>
                  <th>{t('clients.city', 'City')}</th>
                  <th className="text-end">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td className="fw-semibold">{getDisplayName(client)}</td>
                    <td>{getTypeBadge(client.client_type)}</td>
                    <td>{client.email || '—'}</td>
                    <td>{client.phone || '—'}</td>
                    <td>{client.city || '—'}</td>
                    <td className="text-end">
                      {hasPermission('clients.update') && (
                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleOpenEdit(client)}>
                          {t('common.edit', 'Edit')}
                        </Button>
                      )}
                      {hasPermission('clients.delete') && (
                        <Button size="sm" variant="outline-danger" onClick={() => { setClientToDelete(client); setShowDeleteConfirm(true); }}>
                          {t('common.delete', 'Delete')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">
                  {t('common.showingOf', '{{from}}-{{to}} of {{total}}', {
                    from: (pagination.page - 1) * pagination.limit + 1,
                    to: Math.min(pagination.page * pagination.limit, pagination.total),
                    total: pagination.total
                  })}
                </span>
                <div>
                  <Button
                    size="sm" variant="outline-secondary" className="me-1"
                    disabled={pagination.page <= 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    {t('common.previous', 'Previous')}
                  </Button>
                  <Button
                    size="sm" variant="outline-secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    {t('common.next', 'Next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        <Modal show={showForm} onHide={() => setShowForm(false)} size="lg">
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingId ? t('clients.editClient', 'Edit Client') : t('clients.createClient', 'New Client')}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('clients.clientType', 'Client Type')}</Form.Label>
                    <Form.Select
                      value={formData.client_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_type: e.target.value }))}
                    >
                      <option value="person">{t('clients.person', 'Person')}</option>
                      <option value="company">{t('clients.company', 'Company')}</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('clients.language', 'Language')}</Form.Label>
                    <Form.Select
                      value={formData.language_preference}
                      onChange={(e) => setFormData(prev => ({ ...prev, language_preference: e.target.value }))}
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {formData.client_type === 'company' ? (
                <>
                  <Row className="mb-3">
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label>{t('clients.companyName', 'Company Name')} *</Form.Label>
                        <Form.Control required value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('clients.siret', 'SIRET')}</Form.Label>
                        <Form.Control value={formData.siret} onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>{t('clients.contactPerson', 'Contact Person')}</Form.Label>
                        <Form.Control value={formData.contact_person} onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>{t('clients.vatNumber', 'VAT Number')}</Form.Label>
                        <Form.Control value={formData.vat_number} onChange={(e) => setFormData(prev => ({ ...prev, vat_number: e.target.value }))} />
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              ) : (
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('clients.firstName', 'First Name')} *</Form.Label>
                      <Form.Control required value={formData.first_name} onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('clients.lastName', 'Last Name')} *</Form.Label>
                      <Form.Control required value={formData.last_name} onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))} />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('clients.emailLabel', 'Email')}</Form.Label>
                    <Form.Control type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('clients.phoneLabel', 'Phone')}</Form.Label>
                    <Form.Control value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>{t('clients.address', 'Address')}</Form.Label>
                    <Form.Control value={formData.address_line1} onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))} placeholder={t('clients.addressLine1', 'Address line 1')} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <Form.Control value={formData.address_line2} onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))} placeholder={t('clients.addressLine2', 'Address line 2')} />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('clients.postalCode', 'Postal Code')}</Form.Label>
                    <Form.Control value={formData.postal_code} onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('clients.cityLabel', 'City')}</Form.Label>
                    <Form.Control value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>{t('clients.country', 'Country')}</Form.Label>
                    <Form.Control value={formData.country} onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>{t('clients.notes', 'Notes')}</Form.Label>
                <Form.Control as="textarea" rows={2} value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? <Spinner size="sm" className="me-1" /> : null}
                {editingId ? t('common.save', 'Save') : t('clients.create', 'Create')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title={t('clients.deleteTitle', 'Delete Client')}
          message={t('clients.deleteConfirm', 'Are you sure you want to delete this client?')}
          confirmVariant="danger"
          confirmText={t('common.delete', 'Delete')}
        />
      </Container>
    </Layout>
  );
};

export default ClientsPage;
