/**
 * CreateInvoiceModal Component
 * Slide panel for creating new invoices.
 * Uses SlidePanel + FormSection for harmonized UX.
 */

import { useState, useEffect } from 'react';
import { Form, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import * as visitService from '../services/visitService';
import visitTypeService from '../services/visitTypeService';
import SlidePanel from './ui/SlidePanel';
import FormSection from './ui/FormSection';
import SearchableSelect from './ui/SearchableSelect';
import { formatDate } from '../utils/dateUtils';

const CreateInvoiceModal = ({ show, onHide, onSubmit, preSelectedPatient }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);

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
      fetchVisitTypes();
      resetForm();
    }
  }, [show]);

  const fetchVisitTypes = async () => {
    try {
      const response = await visitTypeService.getAllVisitTypes();
      setVisitTypes(response?.data || []);
    } catch (err) {
      console.error('Failed to fetch visit types:', err);
      setVisitTypes([]);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatients({ is_active: true });
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

    if (name === 'patient_id') {
      fetchVisits(value);
      setFormData(prev => ({
        ...prev,
        visit_id: ''
      }));
    }

    if (name === 'visit_id' && value) {
      const selectedVisit = visits.find(v => v.id === value);
      if (selectedVisit?.visit_type) {
        const matchedType = visitTypes.find(vt => vt.name === selectedVisit.visit_type);
        if (matchedType?.default_price) {
          setFormData(prev => ({
            ...prev,
            amount_total: parseFloat(matchedType.default_price).toFixed(2),
            description: prev.description || `${selectedVisit.visit_type} - ${formatDate(selectedVisit.visit_date, i18n.language)}`
          }));
        }
      }
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
    if (e) e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
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

  // Progress indicator
  const filledRequired = [formData.patient_id, formData.description.trim(), formData.amount_total].filter(Boolean).length;

  return (
    <SlidePanel
      show={show}
      onHide={handleClose}
      title={t('billing.createInvoice', 'Create Invoice')}
      subtitle={t('billing.newInvoiceSubtitle', 'Generate a new invoice')}
      icon={
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 6h6M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }
      size="md"
      onSubmit={handleSubmit}
      submitLabel={t('billing.createInvoice', 'Create Invoice')}
      loading={submitting || loading}
    >
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Patient & Visit */}
        <FormSection
          title={t('billing.patientAndVisit', 'Patient & Visit')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          description={`${filledRequired}/3 ${t('common.required', 'required')}`}
          accent="slate"
        >
          <Form.Group className="mb-3">
            <Form.Label>
              {t('billing.patient', 'Patient')} <span className="text-danger">*</span>
            </Form.Label>
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

          <Form.Group className="mb-3">
            <Form.Label>
              {t('billing.visit', 'Visit')}
              <span className="text-muted ms-1">({t('common.optional', 'Optional')})</span>
            </Form.Label>
            <Form.Select
              name="visit_id"
              value={formData.visit_id}
              onChange={handleInputChange}
              disabled={loading}
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
        </FormSection>

        {/* Invoice Details */}
        <FormSection
          title={t('billing.invoiceDetails', 'Invoice Details')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          accent="gold"
        >
          <Form.Group className="mb-3">
            <Form.Label>
              {t('billing.description', 'Description')} <span className="text-danger">*</span>
            </Form.Label>
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
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  {t('billing.amount', 'Amount')} <span className="text-danger">*</span>
                </Form.Label>
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
            <Col sm={6}>
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
      </Form>
    </SlidePanel>
  );
};

export default CreateInvoiceModal;
