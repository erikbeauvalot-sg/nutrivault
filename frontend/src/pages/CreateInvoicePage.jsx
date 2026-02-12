/**
 * CreateInvoicePage Component
 * Full page for creating new invoices with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import FormSection from '../components/ui/FormSection';
import SearchableSelect from '../components/ui/SearchableSelect';
import { createInvoice } from '../services/billingService';
import { getPatients } from '../services/patientService';
import visitService from '../services/visitService';
import { formatDate } from '../utils/dateUtils';

const CreateInvoicePage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);

  const [formData, setFormData] = useState({
    patient_id: '',
    visit_id: '',
    description: '',
    amount_total: '',
    due_date: ''
  });

  useEffect(() => {
    fetchPatients();

    // Handle pre-selected patient from navigation
    if (location.state?.selectedPatient) {
      const patient = location.state.selectedPatient;
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id
      }));
      fetchVisits(patient.id);
    }
  }, [location.state]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data } = await getPatients({ is_active: true, limit: 1000 });
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(t('errors.failedToLoadPatients'));
    } finally {
      setLoading(false);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);

    if (name === 'patient_id') {
      fetchVisits(value);
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
    if (!formData.description.trim()) {
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

    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        patient_id: formData.patient_id,
        service_description: formData.description.trim(),
        amount_total: parseFloat(formData.amount_total),
        due_date: formData.due_date || null,
        visit_id: formData.visit_id || null
      };

      const result = await createInvoice(submitData);

      const invoiceId = result.data?.id || result.id;
      navigate(`/billing/${invoiceId}`, {
        state: { message: t('billing.invoiceCreated', 'Invoice created successfully') }
      });
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message || t('errors.failedToCreateInvoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Progress indicator
  const filledRequired = [formData.patient_id, formData.description.trim(), formData.amount_total].filter(Boolean).length;

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex align-items-center gap-3 mb-1">
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--nv-gold), var(--nv-warm-500))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 6h6M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="h3 mb-0">{t('billing.createInvoice', 'Create Invoice')}</h1>
                <p className="text-muted mb-0">{t('billing.createInvoiceDescription', 'Create a new invoice for patient services')}</p>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              {/* Patient & Visit Section */}
              <FormSection
                title={t('billing.patientAndVisit', 'Patient & Visit')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                }
                accent="slate"
              >
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('billing.patient', 'Patient')} <span className="text-danger">*</span></Form.Label>
                      <SearchableSelect
                        name="patient_id"
                        options={patients.map(patient => ({
                          value: patient.id,
                          label: `${patient.first_name} ${patient.last_name}`,
                          subtitle: patient.email || ''
                        }))}
                        value={formData.patient_id}
                        onChange={(val) => {
                          handleInputChange({ target: { name: 'patient_id', value: val } });
                        }}
                        placeholder={loading ? t('common.loading', 'Loading...') : t('billing.selectPatient', 'Select a patient')}
                        searchPlaceholder={t('common.searchByName', 'Search by name...')}
                        noResultsText={t('common.noResults', 'No results found')}
                        disabled={loading}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {t('billing.visit', 'Visit')}
                        <span className="text-muted ms-1">({t('common.optional', 'Optional')})</span>
                      </Form.Label>
                      <Form.Select
                        name="visit_id"
                        value={formData.visit_id}
                        onChange={handleInputChange}
                        disabled={loading || !formData.patient_id}
                      >
                        <option value="">{t('billing.noVisit', 'No associated visit')}</option>
                        {visits.map(visit => (
                          <option key={visit.id} value={visit.id}>
                            {formatDate(visit.visit_date, i18n.language)} - {visit.visit_type}
                            {visit.status && ` (${getStatusText(visit.status)})`}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </FormSection>

              {/* Invoice Details Section */}
              <FormSection
                title={t('billing.invoiceDetails', 'Invoice Details')}
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                }
                description={`${filledRequired}/3 ${t('common.required', 'required')}`}
                accent="gold"
              >
                <Form.Group className="mb-3">
                  <Form.Label>{t('billing.description', 'Description')} <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('billing.descriptionPlaceholder', 'Enter invoice description')}
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('billing.amount', 'Amount')} <span className="text-danger">*</span></Form.Label>
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
                      <Form.Label>
                        {t('billing.dueDate', 'Due Date')}
                        <span className="text-muted ms-1">({t('common.optional', 'Optional')})</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </FormSection>

              <div className="d-flex gap-2 mt-4">
                <Button variant="outline-secondary" onClick={handleCancel} disabled={submitting}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || loading}>
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('billing.creating', 'Creating...')}
                    </>
                  ) : (
                    t('billing.createInvoice', 'Create Invoice')
                  )}
                </Button>
              </div>
            </Form>
          </Col>

          <Col lg={4}>
            <Card className="border-0" style={{ background: 'var(--nv-warm-100)', borderRadius: 12 }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--nv-slate)' }}>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <h6 className="mb-0">{t('common.help', 'Help')}</h6>
                </div>
                <p className="text-muted small mb-2">
                  {t('billing.createInvoiceHelp', 'Create invoices for patient services. You can optionally associate an invoice with a specific visit.')}
                </p>
                <ul className="text-muted small mb-0 ps-3">
                  <li>{t('billing.patientRequired', 'Patient selection is required')}</li>
                  <li>{t('billing.descriptionRequired', 'Description and amount are required')}</li>
                  <li>{t('billing.visitOptional', 'Visit association is optional')}</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default CreateInvoicePage;
