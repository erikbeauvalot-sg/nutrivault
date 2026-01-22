/**
 * CreateInvoiceModal Component
 * Modal form for creating new invoices
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import * as visitService from '../services/visitService';

const CreateInvoiceModal = ({ show, onHide, onSubmit, preSelectedPatient }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);

  const getStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  const [formData, setFormData] = useState({
    patient_id: '',
    visit_id: '',
    description: '',
    amount_total: '',
    due_date: '',
    items: []
  });

  useEffect(() => {
    if (show) {
      fetchPatients();
      resetForm();
    }
  }, [show]);

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
      const response = await visitService.getVisits({ patient_id: patientId, limit: 100 });
      // Handle both POC format and new API format
      const visitsData = response.data?.data || response.data || [];
      setVisits(Array.isArray(visitsData) ? visitsData : []);
    } catch (err) {
      console.error('Failed to fetch visits:', err);
      setVisits([]);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: preSelectedPatient?.id || '',
      visit_id: '',
      description: '',
      amount_total: '',
      due_date: '',
      items: []
    });
    setError(null);
    // If patient is pre-selected, fetch their visits
    if (preSelectedPatient?.id) {
      fetchVisits(preSelectedPatient.id);
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
      setError('Please select a patient');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.amount_total || parseFloat(formData.amount_total) <= 0) {
      setError('Amount must be greater than 0');
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
        visit_id: formData.visit_id || null,
        items: formData.items.length > 0 ? formData.items : null
      };

      await onSubmit(submitData);
      onHide();
    } catch (err) {
      setError(err.message || t('errors.failedToCreateInvoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t('billing.createInvoice', 'Create Invoice')}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

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
                  disabled={loading}
                >
                  <option value="">{t('billing.noVisit', 'No associated visit')}</option>
                  {visits.map(visit => (
                    <option key={visit.id} value={visit.id}>
                      {new Date(visit.visit_date).toLocaleDateString()} - {visit.visit_type} 
                      {visit.status && ` (${getStatusText(visit.status)})`}
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
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
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
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateInvoiceModal;