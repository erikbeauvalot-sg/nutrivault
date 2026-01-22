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
import { createInvoice } from '../services/billingService';
import { getPatients } from '../services/patientService';
import visitService from '../services/visitService';

const CreateInvoicePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      const response = await getPatients({ is_active: true, limit: 1000 });
      const data = response.data?.data || response.data || response;
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
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
      const response = await visitService.getVisits({ patient_id: patientId, limit: 100 });
      const data = response.data?.data || response.data || response;
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching visits:', err);
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
      // Prepare submit data
      const submitData = {
        patient_id: formData.patient_id,
        service_description: formData.description.trim(),
        amount_total: parseFloat(formData.amount_total),
        due_date: formData.due_date || null,
        visit_id: formData.visit_id || null
      };

      const result = await createInvoice(submitData);

      // Navigate to the created invoice detail page
      navigate(`/billing/${result.id}`, {
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
    navigate(-1); // Go back to previous page
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h1 className="h3 mb-0">{t('billing.createInvoice', 'Create Invoice')}</h1>
            <p className="text-muted">{t('billing.createInvoiceDescription', 'Create a new invoice for patient services')}</p>
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
                          disabled={loading}
                          required
                        >
                          <option value="">
                            {loading ? t('common.loading', 'Loading...') : t('billing.selectPatient', 'Select a patient')}
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
                          disabled={loading || !formData.patient_id}
                        >
                          <option value="">{t('billing.noVisit', 'No associated visit')}</option>
                          {visits.map(visit => (
                            <option key={visit.id} value={visit.id}>
                              {new Date(visit.visit_date).toLocaleDateString()} - {visit.visit_type}
                              {visit.status && ` (${visit.status})`}
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
                        <Form.Label>{t('billing.amount', 'Amount')} *</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>$</InputGroup.Text>
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
                    <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
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
                  {t('billing.createInvoiceHelp', 'Create invoices for patient services. You can optionally associate an invoice with a specific visit.')}
                </p>
                <ul className="text-muted small">
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