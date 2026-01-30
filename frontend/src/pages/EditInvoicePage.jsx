/**
 * EditInvoicePage Component
 * Full page for editing existing invoices with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { getInvoiceById, updateInvoice } from '../services/billingService';
import { getPatients } from '../services/patientService';
import visitService from '../services/visitService';

const EditInvoicePage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const getVisitStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  const getInvoiceStatusText = (status) => {
    const statusKey = status?.toLowerCase();
    return t(`billing.status.${statusKey}`, status);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [invoice, setInvoice] = useState(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    visit_id: '',
    service_description: '',
    amount_total: '',
    due_date: ''
  });

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchPatients();
    }
  }, [id]);

  useEffect(() => {
    if (invoice) {
      populateFormData();
    }
  }, [invoice]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await getInvoiceById(id);
      const invoiceData = response.data?.data || response.data;
      setInvoice(invoiceData);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(t('billing.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data } = await getPatients({ is_active: true, limit: 1000 });
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      // Error fetching patients
    }
  };

  const fetchVisits = async (patientId) => {
    if (!patientId) {
      setVisits([]);
      return;
    }
    try {
      const { data } = await visitService.getVisits({ patient_id: patientId, limit: 100 });
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      setVisits([]);
    }
  };

  const populateFormData = () => {
    if (!invoice) return;

    setFormData({
      patient_id: invoice.patient_id || '',
      visit_id: invoice.visit_id || '',
      service_description: invoice.service_description || '',
      amount_total: invoice.amount_total || '',
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : ''
    });

    // Fetch visits for the selected patient
    if (invoice.patient_id) {
      fetchVisits(invoice.patient_id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);

    // If patient changed, fetch their visits
    if (name === 'patient_id') {
      fetchVisits(value);
      // Clear visit selection when patient changes
      setFormData(prev => ({
        ...prev,
        visit_id: ''
      }));
    }
  };

  const validateForm = () => {
    if (!formData.patient_id) {
      setError(t('billing.selectPatientRequired', 'Please select a patient'));
      return false;
    }
    if (!formData.service_description.trim()) {
      setError(t('billing.descriptionRequired', 'Description is required'));
      return false;
    }
    if (!formData.amount_total || parseFloat(formData.amount_total) <= 0) {
      setError(t('billing.amountRequired', 'Amount must be greater than 0'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      // Prepare submit data
      const submitData = {
        patient_id: formData.patient_id,
        service_description: formData.service_description.trim(),
        amount_total: parseFloat(formData.amount_total),
        due_date: formData.due_date || null,
        visit_id: formData.visit_id || null
      };

      await updateInvoice(id, submitData);

      // Navigate back to invoice detail page
      navigate(`/billing/${id}`, {
        state: { message: t('billing.invoiceUpdated', 'Invoice updated successfully') }
      });
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err.message || t('errors.failedToUpdateInvoice'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/billing/${id}`); // Go back to invoice detail page
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <Row className="justify-content-center">
            <Col xs="auto">
              <Spinner animation="border" />
            </Col>
          </Row>
        </Container>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <Alert variant="danger">
            {t('billing.invoiceNotFound', 'Invoice not found')}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h1 className="h3 mb-0">{t('billing.editInvoice', 'Edit Invoice')}</h1>
            <p className="text-muted">{t('billing.editInvoiceDescription', 'Update invoice details')}</p>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card>
              <Card.Body>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('billing.patient', 'Patient')} *</Form.Label>
                        <Form.Select
                          name="patient_id"
                          value={formData.patient_id}
                          onChange={handleInputChange}
                          disabled={saving}
                          required
                        >
                          <option value="">
                            {t('billing.selectPatient', 'Select a patient')}
                          </option>
                          {patients.map(patient => (
                            <option key={patient.id} value={patient.id}>
                              {patient.first_name} {patient.last_name}
                              {patient.email && ` (${patient.email})`}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('billing.visit', 'Visit')} ({t('common.optional', 'Optional')})</Form.Label>
                        <Form.Select
                          name="visit_id"
                          value={formData.visit_id}
                          onChange={handleInputChange}
                          disabled={saving || !formData.patient_id}
                        >
                          <option value="">{t('billing.noVisit', 'No associated visit')}</option>
                          {visits.map(visit => (
                            <option key={visit.id} value={visit.id}>
                              {formatDate(visit.visit_date)} - {visit.visit_type}
                              {visit.status && ` (${getVisitStatusText(visit.status)})`}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>{t('billing.description', 'Description')} *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="service_description"
                      value={formData.service_description}
                      onChange={handleInputChange}
                      placeholder={t('billing.descriptionPlaceholder', 'Enter invoice description')}
                      required
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('billing.amount', 'Amount')} *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>€</InputGroup.Text>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0.01"
                            name="amount_total"
                            value={formData.amount_total}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            required
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('billing.dueDate', 'Due Date')} ({t('common.optional', 'Optional')})</Form.Label>
                        <Form.Control
                          type="date"
                          name="due_date"
                          value={formData.due_date}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2 mt-4">
                    <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button variant="primary" type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {t('billing.updating', 'Updating...')}
                        </>
                      ) : (
                        t('billing.updateInvoice', 'Update Invoice')
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('common.help', 'Help')}</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small">
                  {t('billing.editInvoiceHelp', 'Update invoice information. You can change the patient, visit association, description, amount, and due date.')}
                </p>
                <ul className="text-muted small">
                  <li>{t('billing.patientRequired', 'Patient selection is required')}</li>
                  <li>{t('billing.descriptionRequired', 'Description and amount are required')}</li>
                  <li>{t('billing.visitOptional', 'Visit association is optional')}</li>
                </ul>
              </Card.Body>
            </Card>

            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0">{t('billing.invoiceInfo', 'Invoice Information')}</h6>
              </Card.Header>
              <Card.Body>
                <div className="small text-muted">
                  <div><strong>{t('billing.invoiceNumber', 'Invoice #')}:</strong> {invoice.invoice_number}</div>
                  <div><strong>{t('billing.statusLabel', 'Status')}:</strong>
                    <Badge bg={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'danger' : 'warning'} className="ms-2">
                      {getInvoiceStatusText(invoice.status)}
                    </Badge>
                  </div>
                  <div><strong>{t('billing.created', 'Created')}:</strong> {formatDate(invoice.created_at)}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default EditInvoicePage;