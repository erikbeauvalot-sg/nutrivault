/**
 * EditInvoiceModal Component
 * Modal form for editing existing invoices
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import * as visitService from '../services/visitService';
import SearchableSelect from './ui/SearchableSelect';

const EditInvoiceModal = ({ show, onHide, onSubmit, invoice }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);

  const [formData, setFormData] = useState({
    patient_id: '',
    visit_id: '',
    service_description: '',
    amount_total: '',
    due_date: '',
    items: []
  });

  useEffect(() => {
    if (show) {
      fetchPatients();
      if (invoice) {
        populateFormData();
      }
    }
  }, [show, invoice]);

  const populateFormData = () => {
    if (!invoice) return;

    setFormData({
      patient_id: invoice.patient_id || '',
      visit_id: invoice.visit_id || '',
      service_description: invoice.service_description || '',
      amount_total: invoice.amount_total || '',
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',
      items: invoice.items || []
    });

    // Fetch visits for the selected patient
    if (invoice.patient_id) {
      fetchVisits(invoice.patient_id);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatients({ is_active: true });
      // Handle both POC format and new API format
      const patientsData = response.data?.data || response.data || [];
      setPatients(Array.isArray(patientsData) ? patientsData : []);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
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
      const response = await visitService.getVisits({
        patient_id: patientId,
        status: 'COMPLETED' // Only show completed visits for billing
      });
      const visitsData = response.data?.data || response.data || [];
      setVisits(Array.isArray(visitsData) ? visitsData : []);
    } catch (err) {
      console.error('Failed to fetch visits:', err);
      setVisits([]);
    }
  };

  const handlePatientChange = (e) => {
    const patientId = e.target.value;
    setFormData(prev => ({
      ...prev,
      patient_id: patientId,
      visit_id: '' // Reset visit selection when patient changes
    }));
    fetchVisits(patientId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patient_id || !formData.service_description || !formData.amount_total) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const submitData = {
        ...formData,
        amount_total: parseFloat(formData.amount_total),
        visit_id: formData.visit_id || null,
        due_date: formData.due_date || null,
        items: formData.items || null
      };

      await onSubmit(invoice.id, submitData);
      onHide();
    } catch (err) {
      console.error('Failed to update invoice:', err);
      setError(err.response?.data?.message || t('errors.failedToUpdateInvoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      visit_id: '',
      service_description: '',
      amount_total: '',
      due_date: '',
      items: []
    });
    setError(null);
    setVisits([]);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('billing.editInvoice', 'Edit Invoice')}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('billing.patient', 'Patient')} *</Form.Label>
                <SearchableSelect
                  name="patient_id"
                  options={patients.map(patient => ({
                    value: patient.id,
                    label: `${patient.first_name} ${patient.last_name}`,
                    subtitle: patient.email || ''
                  }))}
                  value={formData.patient_id}
                  onChange={(val) => {
                    handlePatientChange({ target: { name: 'patient_id', value: val } });
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
                <Form.Label>{t('billing.visit', 'Visit')} ({t('common.optional', 'optional')})</Form.Label>
                <Form.Select
                  name="visit_id"
                  value={formData.visit_id}
                  onChange={handleInputChange}
                  disabled={!formData.patient_id}
                >
                  <option value="">
                    {t('billing.selectVisit', 'Select a visit (optional)')}
                  </option>
                  {visits.map(visit => (
                    <option key={visit.id} value={visit.id}>
                      {new Date(visit.visit_date).toLocaleDateString()} - {visit.visit_type || 'Visit'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>{t('billing.serviceDescription', 'Service Description')} *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="service_description"
              value={formData.service_description}
              onChange={handleInputChange}
              placeholder={t('billing.serviceDescriptionPlaceholder', 'Describe the services provided')}
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
                    min="0"
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
                <Form.Label>{t('billing.dueDate', 'Due Date')} ({t('common.optional', 'optional')})</Form.Label>
                <Form.Control
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || loading}>
            {submitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                {t('common.updating', 'Updating...')}
              </>
            ) : (
              t('common.update', 'Update')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditInvoiceModal;