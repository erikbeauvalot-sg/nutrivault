/**
 * PatientDetailPage Component
 * Detailed patient view with tabbed interface
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Dropdown, Modal, Form, InputGroup } from 'react-bootstrap';
import ResponsiveTabs, { Tab } from '../components/ResponsiveTabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentListComponent from '../components/DocumentListComponent';
import MeasurementCharts from '../components/MeasurementCharts';
import InvoiceList from '../components/InvoiceList';
import CustomFieldInput from '../components/CustomFieldInput';
import CustomFieldDisplay from '../components/CustomFieldDisplay';
import MeasureHistory from '../components/MeasureHistory';
import MeasureComparison from '../components/MeasureComparison';
import EmailHistory from '../components/EmailHistory';
import PatientHealthScore from '../components/PatientHealthScore';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import customFieldService from '../services/customFieldService';
import { formatDate as utilFormatDate } from '../utils/dateUtils';
import { getBMICategory, calculateBMI } from '../utils/bmiUtils';
import { applyTranslationsToMeasures, fetchMeasureTranslations } from '../utils/measureTranslations';
import * as gdprService from '../services/gdprService';
import * as billingService from '../services/billingService';
import * as measureService from '../services/measureService';
import api from '../services/api';
import './PatientDetailPage.css';

const PatientDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const getStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('basic-info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingFields, setSavingFields] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientMeasures, setPatientMeasures] = useState([]);
  const [measuresLoading, setMeasuresLoading] = useState(false);
  const [measuresDisplayLimit, setMeasuresDisplayLimit] = useState(20);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [showDeleteVisitConfirm, setShowDeleteVisitConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [showDeleteInvoiceConfirm, setShowDeleteInvoiceConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
      fetchPatientDocuments();
      fetchPatientInvoices();
      fetchPatientMeasures();
    }
  }, [id]);

  // Separate effect for custom fields that depends on language
  useEffect(() => {
    if (id) {
      fetchCustomFields();
    }
  }, [id, i18n.resolvedLanguage, i18n.language]);

  // Re-apply measure translations when language changes
  useEffect(() => {
    if (patientMeasures.length > 0 && Object.keys(measureTranslations).length > 0) {
      const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
      const translatedMeasures = applyTranslationsToMeasures(
        patientMeasures,
        measureTranslations,
        currentLanguage
      );
      setPatientMeasures(translatedMeasures);
    }
  }, [i18n.resolvedLanguage, i18n.language]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/patients/${id}/details`);
      const patientData = response.data.data || response.data;
      setPatient(patientData);
      setVisits(patientData.visits || []);
      setError(null);
    } catch (err) {
      setError(t('patients.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDocuments = async () => {
    try {
      const response = await api.get(`/api/documents?resource_type=patient&resource_id=${id}`);
      const documentsData = response.data?.data || response.data || [];
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (err) {
      console.error('Error fetching patient documents:', err);
      // Don't set error for documents failure
    }
  };

  const fetchPatientInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await billingService.getInvoices({ patient_id: id, limit: 1000 });
      const invoicesData = response.data?.data || response.data || [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err) {
      console.error('Error fetching patient invoices:', err);
      // Don't set error for invoices failure
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchPatientMeasures = async () => {
    try {
      setMeasuresLoading(true);
      const response = await api.get(`/api/patients/${id}/measures`);
      const measuresData = response.data?.data || response.data || [];
      const measuresArray = Array.isArray(measuresData) ? measuresData : [];

      // Get unique measure definition IDs
      const measureDefIds = [...new Set(
        measuresArray
          .filter(m => m.measure_definition_id)
          .map(m => m.measure_definition_id)
      )];

      // Fetch translations for all measure definitions
      if (measureDefIds.length > 0) {
        const translations = await fetchMeasureTranslations(
          measureDefIds,
          measureService.getAllMeasureTranslations
        );
        setMeasureTranslations(translations);

        // Apply translations based on current language
        const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
        const translatedMeasures = applyTranslationsToMeasures(
          measuresArray,
          translations,
          currentLanguage
        );
        setPatientMeasures(translatedMeasures);
      } else {
        setPatientMeasures(measuresArray);
      }
    } catch (err) {
      console.error('Error fetching patient measures:', err);
      // Don't set error for measures failure
    } finally {
      setMeasuresLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      let language = i18n.resolvedLanguage || i18n.language;
      if (!language) {
        language = localStorage.getItem('i18nextLng') || 'fr';
      }
      const data = await customFieldService.getPatientCustomFields(id, language);
      setCustomFieldCategories(data || []);

      // Build initial values map
      const values = {};
      data.forEach(category => {
        category.fields.forEach(field => {
          values[field.definition_id] = field.value;
        });
      });
      setFieldValues(values);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      // Don't set error for custom fields failure
    }
  };

  const handleFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [definitionId]: value
    }));

    // Clear error for this field
    if (fieldErrors[definitionId]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[definitionId];
        return newErrors;
      });
    }
  };

  const handleSaveCustomFields = async () => {
    try {
      setSavingFields(true);

      // Build fields array for API
      const fieldsToUpdate = [];
      Object.keys(fieldValues).forEach(definitionId => {
        const value = fieldValues[definitionId];
        // Only include fields that have a value
        if (value !== null && value !== undefined && value !== '') {
          fieldsToUpdate.push({
            definition_id: definitionId,
            value: value
          });
        }
      });

      if (fieldsToUpdate.length > 0) {
        await customFieldService.updatePatientCustomFields(id, fieldsToUpdate);
        await fetchCustomFields();
      }
    } catch (err) {
      console.error('Error saving custom fields:', err);
      setError(err.response?.data?.error || 'Failed to save custom fields');
    } finally {
      setSavingFields(false);
    }
  };

  const handleBack = () => {
    navigate('/patients');
  };

  const handleEditPatient = () => {
    navigate(`/patients/${id}/edit`);
  };

  // Search across custom fields
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { hasResults: false, matchingFields: [], matchingCategory: null };
    }

    const query = searchQuery.toLowerCase();
    const matchingFields = [];
    let matchingCategory = null;

    customFieldCategories.forEach(category => {
      category.fields.forEach(field => {
        const fieldLabel = field.field_label?.toLowerCase() || '';
        const fieldValue = fieldValues[field.definition_id]?.toString()?.toLowerCase() || '';
        const categoryName = category.name?.toLowerCase() || '';

        if (fieldLabel.includes(query) || fieldValue.includes(query) || categoryName.includes(query)) {
          matchingFields.push({
            ...field,
            categoryId: category.id,
            categoryName: category.name
          });
          if (!matchingCategory) {
            matchingCategory = category.id;
          }
        }
      });
    });

    return {
      hasResults: matchingFields.length > 0,
      matchingFields,
      matchingCategory
    };
  }, [searchQuery, customFieldCategories, fieldValues]);

  // Auto-switch to tab with search results
  useEffect(() => {
    if (searchResults.hasResults && searchResults.matchingCategory) {
      setActiveTab(`category-${searchResults.matchingCategory}`);
    }
  }, [searchResults]);

  // Highlight matching text
  const highlightText = (text, query) => {
    if (!text || !query.trim()) return text;

    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleExportData = async (format) => {
    try {
      setIsExporting(true);
      setError(null);
      await gdprService.exportPatientData(id, format);
      alert(t('gdpr.exportSuccess', 'Patient data exported successfully'));
    } catch (err) {
      setError(t('gdpr.exportFailed') + ': ' + (err.response?.data?.error || err.message));
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeletePermanently = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await gdprService.deletePatientPermanently(id);
      alert(t('gdpr.deleteSuccess', 'Patient permanently deleted'));
      navigate('/patients');
    } catch (err) {
      setError(t('gdpr.deleteFailed') + ': ' + (err.response?.data?.error || err.message));
      console.error('Delete error:', err);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewVisit = (visitId) => {
    navigate(`/visits/${visitId}`);
  };

  const handleEditVisit = (visitId) => {
    navigate(`/visits/${visitId}/edit`);
  };

  const handleDeleteVisit = (visitId) => {
    setVisitToDelete(visitId);
    setShowDeleteVisitConfirm(true);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;

    try {
      await api.delete(`/api/visits/${visitToDelete}`);
      // Refresh patient details to update visit list
      fetchPatientDetails();
    } catch (err) {
      console.error('Error deleting visit:', err);
      setError(t('errors.failedToDeleteVisit', { error: err.response?.data?.error || err.message }));
    } finally {
      setVisitToDelete(null);
    }
  };

  const handleAddVisit = () => {
    navigate('/visits/create', { state: { selectedPatient: patient } });
  };

  const handleAddPayment = () => {
    navigate('/billing/create', { state: { selectedPatient: patient } });
  };

  const handleViewInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}`);
  };

  const handleEditInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}/edit`);
  };

  const handleRecordPayment = (invoice) => {
    navigate(`/billing/${invoice.id}/record-payment`);
  };

  const handleDeleteInvoice = (invoiceId) => {
    setInvoiceToDelete(invoiceId);
    setShowDeleteInvoiceConfirm(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await billingService.deleteInvoice(invoiceToDelete);
      // Refresh invoices list
      fetchPatientInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(t('errors.failedToDeleteInvoice', { error: err.response?.data?.error || err.message }));
    } finally {
      setInvoiceToDelete(null);
    }
  };



  const formatDate = (dateString) => {
    return utilFormatDate(dateString, i18n.language);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleString(locale);
  };

  // Check permissions
  const canEditPatient = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';
  const canViewMedicalData = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  const canEditVisits = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';
  const canDeleteVisits = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">{t('patients.loadingPatientDetails', 'Loading patient details...')}</div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.errorLoadingPatient')}</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="warning">
            <Alert.Heading>{t('patients.patientNotFound')}</Alert.Heading>
            <p>{t('patients.patientNotFoundMessage')}</p>
            <Button variant="outline-warning" onClick={handleBack}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid>
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={handleBack}
            className="patient-detail-back-btn mb-3"
          >
            ← {t('patients.backToPatients', 'Back to Patients')}
          </Button>

          <div className="patient-detail-header d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-0">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                  {patient.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                </Badge>
                {patient.medical_record_number && (
                  <small className="text-muted">
                    {t('patients.mrn', 'MRN')}: {patient.medical_record_number}
                  </small>
                )}
              </div>
            </div>

            <div className="patient-detail-actions d-flex gap-2 flex-wrap">
              <Button
                variant="success"
                onClick={handleAddVisit}
                title={t('patients.addVisit')}
              >
                ➕ {t('patients.addVisit')}
              </Button>
              <Button
                variant="info"
                onClick={handleAddPayment}
                title={t('patients.addPayment')}
              >
                💰 {t('patients.addPayment')}
              </Button>
              {canEditPatient && (
                <Button
                  variant="primary"
                  onClick={handleEditPatient}
                >
                  {t('patients.editPatient')}
                </Button>
              )}
              {canEditPatient && (
                <Dropdown>
                  <Dropdown.Toggle
                    variant="secondary"
                    id="gdpr-actions"
                    style={{ minHeight: '38px' }}
                  >
                    🔒 {t('gdpr.actions', 'RGPD')}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => handleExportData('json')}
                      disabled={isExporting}
                    >
                      📄 {t('gdpr.exportJSON', 'Export Data (JSON)')}
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => handleExportData('csv')}
                      disabled={isExporting}
                    >
                      📊 {t('gdpr.exportCSV', 'Export Data (CSV)')}
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={() => setShowDeleteModal(true)}
                      className="text-danger"
                    >
                      🗑️ {t('gdpr.deletePermanently', 'Delete Permanently')}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </div>
        </div>

        {/* Health Score */}
        <Row className="mb-3">
          <Col xs={12} md={6} lg={4}>
            <PatientHealthScore patientId={id} />
          </Col>
        </Row>

        {/* Patient Details Tabs */}
        <Card>
          <Card.Body>
            {/* Search Bar for Custom Fields */}
            <Row className="mb-3">
              <Col xs={12} md={6}>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSearchQuery('')}
                      title="Effacer la recherche"
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
                {searchQuery && (
                  <Form.Text className="text-muted">
                    {searchResults.hasResults ? (
                      <>
                        {searchResults.matchingFields.length} champ{searchResults.matchingFields.length !== 1 ? 's' : ''} trouvé
                        {searchResults.matchingCategory && ' - basculé vers l\'onglet correspondant'}
                      </>
                    ) : (
                      'Aucun champ ne correspond à votre recherche'
                    )}
                  </Form.Text>
                )}
              </Col>
            </Row>

            <ResponsiveTabs activeKey={activeTab} onSelect={setActiveTab} id="patient-detail-tabs">
              {/* Basic Info Tab */}
              <Tab eventKey="basic-info" title={`📋 ${t('patients.basicInformation', 'Basic Information')}`}>
                {/* Essential Patient Info */}
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">{t('patients.basicInformationTitle', 'Patient Basic Information')}</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col xs={12} md={6}>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('patients.firstName', 'First Name')}:</strong></Col>
                          <Col sm={7}>{patient.first_name}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('patients.lastName', 'Last Name')}:</strong></Col>
                          <Col sm={7}>{patient.last_name}</Col>
                        </Row>
                      </Col>
                      <Col xs={12} md={6}>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('patients.email', 'Email')}:</strong></Col>
                          <Col sm={7}>{patient.email || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('patients.phone', 'Phone')}:</strong></Col>
                          <Col sm={7}>{patient.phone || '-'}</Col>
                        </Row>
                      </Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col>
                        <strong>{t('patients.status', 'Status')}:</strong>{' '}
                        <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                          {patient.is_active ? t('patients.active', 'Active') : t('patients.inactive', 'Inactive')}
                        </Badge>
                      </Col>
                      {patient.assigned_dietitian && (
                        <Col>
                          <strong>{t('patients.assignedDietitian', 'Assigned Dietitian')}:</strong> {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>

                {/* Custom Fields marked as "show_in_basic_info", grouped by category */}
                {customFieldCategories
                  .filter(category => category.fields.some(field => field.show_in_basic_info))
                  .map((category) => {
                    const basicInfoFields = category.fields.filter(field => field.show_in_basic_info);
                    if (basicInfoFields.length === 0) return null;

                    return (
                      <Card key={category.id} className="mb-3">
                        <Card.Header
                          style={{
                            backgroundColor: category.color || '#3498db',
                            color: '#fff',
                            borderLeft: `4px solid ${category.color || '#3498db'}`
                          }}
                        >
                          <h6 className="mb-0">
                            <span
                              style={{
                                display: 'inline-block',
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#fff',
                                borderRadius: '50%',
                                marginRight: '8px',
                                opacity: 0.8
                              }}
                            />
                            {category.name}
                          </h6>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            {basicInfoFields.map((field) => (
                              <Col xs={12} md={6} key={field.definition_id}>
                                <CustomFieldDisplay
                                  fieldDefinition={field}
                                  value={fieldValues[field.definition_id]}
                                  searchQuery={searchQuery}
                                  highlightText={highlightText}
                                />
                              </Col>
                            ))}
                          </Row>
                        </Card.Body>
                      </Card>
                    );
                  })}
              </Tab>

              {/* Dynamic Custom Field Category Tabs */}
              {customFieldCategories.map((category) => (
                <Tab
                  key={category.id}
                  eventKey={`category-${category.id}`}
                  title={
                    <span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          backgroundColor: category.color || '#3498db',
                          borderRadius: '50%',
                          marginRight: '8px',
                          verticalAlign: 'middle',
                          border: '2px solid rgba(255,255,255,0.5)'
                        }}
                      />
                      {category.name}
                    </span>
                  }
                >
                  <div
                    className="mb-3"
                    style={{
                      borderLeft: `4px solid ${category.color || '#3498db'}`,
                      paddingLeft: '15px'
                    }}
                  >
                    {category.description && (
                      <Alert
                        variant="info"
                        style={{
                          borderLeft: `4px solid ${category.color || '#3498db'}`,
                          backgroundColor: `${category.color || '#3498db'}10`
                        }}
                      >
                        {category.description}
                      </Alert>
                    )}
                    {category.fields.length === 0 ? (
                      <Alert variant="warning">
                        Aucun champ défini pour cette catégorie
                      </Alert>
                    ) : (
                      <Row>
                        {category.fields.map(field => (
                          <Col key={field.definition_id} xs={12} md={6}>
                            <CustomFieldDisplay
                              fieldDefinition={field}
                              value={fieldValues[field.definition_id]}
                              searchQuery={searchQuery}
                              highlightText={highlightText}
                            />
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>
                </Tab>
              ))}

              {/* Visits Tab */}
              <Tab eventKey="visits" title={`${t('patients.visitsTab', 'Visits')} (${visits.length})`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('visits.visitHistory', 'Visit History')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {visits.length === 0 ? (
                      <p className="text-muted">{t('visits.noVisits', 'No visits recorded yet.')}</p>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="visits-table-desktop table-responsive">
                          <table className="table table-striped">
                            <thead>
                              <tr>
                                <th>{t('visits.date', 'Date')}</th>
                                <th>{t('visits.type', 'Type')}</th>
                                <th>{t('visits.notes', 'Notes')}</th>
                                <th>{t('visits.status', 'Status')}</th>
                                <th>{t('common.actions', 'Actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visits.map(visit => (
                                <tr
                                  key={visit.id}
                                  onClick={() => handleViewVisit(visit.id)}
                                  style={{ cursor: 'pointer' }}
                                  className="visit-row"
                                >
                                  <td>{formatDateTime(visit.visit_date)}</td>
                                  <td>{visit.visit_type || 'General'}</td>
                                  <td>{visit.notes || '-'}</td>
                                  <td>
                                    <Badge bg={visit.status === 'completed' ? 'success' : 'warning'}>
                                      {getStatusText(visit.status) || t('visits.scheduled')}
                                    </Badge>
                                  </td>
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <div className="action-buttons">
                                      {canEditVisits && (
                                        <ActionButton
                                          action="edit"
                                          onClick={() => handleEditVisit(visit.id)}
                                          title={t('visits.editVisit', 'Edit Visit')}
                                        />
                                      )}
                                      {canDeleteVisits && (
                                        <ActionButton
                                          action="delete"
                                          onClick={() => handleDeleteVisit(visit.id)}
                                          title={t('visits.deleteVisit', 'Delete Visit')}
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="visits-cards-mobile">
                          {visits.map(visit => (
                            <div
                              key={visit.id}
                              className="visit-card-mobile"
                              onClick={() => handleViewVisit(visit.id)}
                            >
                              <div className="visit-card-header">
                                <div className="visit-card-date">
                                  {formatDateTime(visit.visit_date)}
                                </div>
                                <div className="visit-card-status">
                                  <Badge bg={visit.status === 'completed' ? 'success' : 'warning'}>
                                    {getStatusText(visit.status) || t('visits.scheduled')}
                                  </Badge>
                                </div>
                              </div>

                              <div className="visit-card-body">
                                <div className="visit-card-row">
                                  <div className="visit-card-label">{t('visits.type', 'Type')}:</div>
                                  <div className="visit-card-value">{visit.visit_type || 'General'}</div>
                                </div>
                                {visit.notes && (
                                  <div className="visit-card-row">
                                    <div className="visit-card-label">{t('visits.notes', 'Notes')}:</div>
                                    <div className="visit-card-value">{visit.notes}</div>
                                  </div>
                                )}
                              </div>

                              <div
                                className="visit-card-actions action-buttons"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canEditVisits && (
                                  <ActionButton
                                    action="edit"
                                    onClick={() => handleEditVisit(visit.id)}
                                    title={t('common.edit', 'Edit')}
                                  />
                                )}
                                {canDeleteVisits && (
                                  <ActionButton
                                    action="delete"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    title={t('common.delete', 'Delete')}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Tab>

              {/* Raw Measurements Tab (Development Only) */}
              {import.meta.env.DEV && (
                <Tab eventKey="raw-measurements" title={`🔧 Raw Data`}>
                  <Card>
                    <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">💾 Raw Database Dump</h5>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Group className="mb-0 d-flex align-items-center gap-2">
                          <Form.Label className="mb-0 text-white">Show:</Form.Label>
                          <Form.Select
                            size="sm"
                            value={measuresDisplayLimit}
                            onChange={(e) => setMeasuresDisplayLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            style={{ width: 'auto' }}
                          >
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="all">All</option>
                          </Form.Select>
                        </Form.Group>
                        <Badge bg="light" text="dark">{patientMeasures.length} total records</Badge>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      {measuresLoading ? (
                        <div className="text-center py-5">
                          <Spinner animation="border" variant="primary" />
                          <div className="mt-2">Loading measures...</div>
                        </div>
                      ) : patientMeasures.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <h4>No data found</h4>
                          <p>No measures have been recorded for this patient yet.</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table-hover table-sm mb-0">
                            <thead className="table-secondary">
                              <tr>
                                <th>ID</th>
                                <th>Measure ID</th>
                                <th>Measure Name</th>
                                <th>Value</th>
                                <th>Numeric Value</th>
                                <th>Text Value</th>
                                <th>Boolean Value</th>
                                <th>Measured At</th>
                                <th>Visit ID</th>
                                <th>Recorded By</th>
                                <th>Notes</th>
                                <th>Created At</th>
                                <th>Updated At</th>
                                <th>Deleted At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(measuresDisplayLimit === 'all' ? patientMeasures : patientMeasures.slice(0, measuresDisplayLimit)).map((measure) => {
                                const getMeasureValue = (m) => {
                                  if (m.numeric_value !== null && m.numeric_value !== undefined) {
                                    return m.numeric_value;
                                  }
                                  if (m.text_value !== null && m.text_value !== undefined) {
                                    return m.text_value;
                                  }
                                  if (m.boolean_value !== null && m.boolean_value !== undefined) {
                                    return m.boolean_value ? 'Yes' : 'No';
                                  }
                                  return '—';
                                };

                                return (
                                  <tr key={measure.id}>
                                    <td><code style={{ fontSize: '0.8rem' }}>{measure.id}</code></td>
                                    <td><code style={{ fontSize: '0.8rem' }}>{measure.measure_definition_id}</code></td>
                                    <td>
                                      {measure.MeasureDefinition ? (
                                        <a href={`/settings/measures/${measure.measure_definition_id}/view`}>
                                          {measure.MeasureDefinition.display_name || measure.MeasureDefinition.internal_name}
                                        </a>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td><strong>{getMeasureValue(measure)}</strong></td>
                                    <td>{measure.numeric_value !== null ? measure.numeric_value : '—'}</td>
                                    <td>{measure.text_value || '—'}</td>
                                    <td>{measure.boolean_value !== null ? (measure.boolean_value ? '✅' : '❌') : '—'}</td>
                                    <td>{formatDateTime(measure.measured_at)}</td>
                                    <td>
                                      {measure.visit_id ? (
                                        <a href={`/visits/${measure.visit_id}`}>
                                          <code style={{ fontSize: '0.8rem' }}>{measure.visit_id}</code>
                                        </a>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td>{measure.RecordedBy?.username || '—'}</td>
                                    <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                                      {measure.notes || '—'}
                                    </td>
                                    <td>{formatDateTime(measure.created_at)}</td>
                                    <td>{formatDateTime(measure.updated_at)}</td>
                                    <td>{measure.deleted_at ? formatDateTime(measure.deleted_at) : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>
              )}

              {/* Administrative Tab */}
              {canEditPatient && (
                <Tab eventKey="admin" title={t('patients.administrativeTab', 'Administratif')}>
                  {/* Administrative Info Card */}
                  <Card className="mb-4">
                    <Card.Header>
                      <h5 className="mb-0">{t('patients.administrativeInfo', 'Informations administratives')}</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col xs={12} md={6}>
                          <Row>
                            <Col sm={5}><strong>{t('patients.assignedDietitian', 'Diététicien assigné')}:</strong></Col>
                            <Col sm={7}>
                              {patient.assigned_dietitian ? (
                                `${patient.assigned_dietitian.first_name} ${patient.assigned_dietitian.last_name}`
                              ) : t('patients.notAssigned', 'Non assigné')}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>{t('patients.createdLabel', 'Créé le')}:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.created_at)}</Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>{t('patients.lastUpdated', 'Mis à jour le')}:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.updated_at)}</Col>
                          </Row>
                        </Col>
                        <Col xs={12} md={6} className="mt-3 mt-md-0">
                          <Row>
                            <Col sm={4}><strong>{t('patients.notes', 'Notes')}:</strong></Col>
                            <Col sm={8}>
                              {patient.notes ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.notes}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Email Communication History */}
                  <EmailHistory patientId={id} />
                </Tab>
              )}

              {/* Documents Tab */}
              <Tab eventKey="documents" title={`📄 Documents (${documents.length})`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Patient Documents</h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => navigate(`/documents/upload?resourceType=patient&resourceId=${id}`)}
                  >
                    <i className="fas fa-upload me-1"></i>
                    Upload Document
                  </Button>
                </div>
                <DocumentListComponent
                  documents={documents}
                  onDocumentDeleted={fetchPatientDocuments}
                  showResourceColumn={false}
                />
              </Tab>

              {/* Invoices Tab */}
              <Tab eventKey="invoices" title={`💰 ${t('billing.invoices', 'Factures')} (${invoices.length})`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">{t('billing.patientInvoices', 'Factures du patient')}</h5>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={handleAddPayment}
                  >
                    ➕ {t('billing.createInvoice', 'Créer une facture')}
                  </Button>
                </div>
                {invoicesLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">{t('common.loading')}</span>
                    </Spinner>
                    <p className="mt-2">{t('billing.loadingInvoices', 'Chargement des factures...')}</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <Card className="text-center py-5">
                    <Card.Body>
                      <div className="mb-3">💰</div>
                      <h6>{t('billing.noInvoices', 'Aucune facture')}</h6>
                      <p className="text-muted">
                        {t('billing.noInvoicesForPatient', 'Aucune facture trouvée pour ce patient')}
                      </p>
                      <Button variant="outline-primary" onClick={handleAddPayment}>
                        ➕ {t('billing.createFirstInvoice', 'Créer la première facture')}
                      </Button>
                    </Card.Body>
                  </Card>
                ) : (
                  <InvoiceList
                    invoices={invoices}
                    loading={false}
                    filters={{}}
                    pagination={null}
                    onFilterChange={() => {}}
                    onPageChange={() => {}}
                    onView={handleViewInvoice}
                    onEdit={handleEditInvoice}
                    onRecordPayment={handleRecordPayment}
                    onDelete={handleDeleteInvoice}
                    canCreate={canEditPatient}
                    canUpdate={canEditPatient}
                    canDelete={canEditPatient}
                  />
                )}
              </Tab>

              {/* Measures Tab */}
              <Tab eventKey="measures" title={`📊 ${t('patients.measures', 'Measures')}`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('patients.measuresTab', 'Patient Measures')}</h5>
                    <p className="text-muted mb-0 small">
                      {t('patients.measuresDescription', 'View and track patient health measures over time')}
                    </p>
                  </Card.Header>
                  <Card.Body>
                    <MeasureHistory patientId={id} />
                  </Card.Body>
                </Card>
              </Tab>

              {/* Compare Measures Tab - Temporarily disabled, to be improved later
              <Tab eventKey="compare-measures" title="📈 Compare Measures">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('patients.compareMeasuresTab', 'Compare Multiple Measures')}</h5>
                    <p className="text-muted mb-0 small">
                      {t('patients.compareMeasuresDescription', 'Compare and analyze multiple health measures simultaneously')}
                    </p>
                  </Card.Header>
                  <Card.Body>
                    <MeasureComparison patientId={id} />
                  </Card.Body>
                </Card>
              </Tab>
              */}
            </ResponsiveTabs>
          </Card.Body>
        </Card>


        {/* Delete Permanently Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered scrollable>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title>⚠️ {t('gdpr.confirmDeleteTitle', 'Confirm Permanent Deletion')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger">
              <Alert.Heading>{t('gdpr.warningTitle', 'WARNING: This action cannot be undone!')}</Alert.Heading>
              <p>{t('gdpr.deleteWarning', 'Permanently deleting this patient will remove all associated data including:')}</p>
              <ul>
                <li>{t('gdpr.deleteItem1', 'Personal information')}</li>
                <li>{t('gdpr.deleteItem2', 'Visit history and measurements')}</li>
                <li>{t('gdpr.deleteItem3', 'Billing records and invoices')}</li>
                <li>{t('gdpr.deleteItem4', 'Uploaded documents')}</li>
                <li>{t('gdpr.deleteItem5', 'Audit logs (except deletion log)')}</li>
              </ul>
              <p className="mb-0">
                <strong>{t('gdpr.deleteConfirmMessage', 'This action is required only for RGPD "Right to be Forgotten" requests.')}</strong>
              </p>
            </Alert>
            <p>
              {t('gdpr.patientToDelete', 'Patient to delete')}:{' '}
              <strong>{patient?.first_name} {patient?.last_name}</strong>
              {patient?.email && ` (${patient.email})`}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePermanently}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('gdpr.deleting', 'Deleting...')}
                </>
              ) : (
                <>
                  🗑️ {t('gdpr.confirmDelete', 'Yes, Delete Permanently')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Visit Confirm Modal */}
        <ConfirmModal
          show={showDeleteVisitConfirm}
          onHide={() => {
            setShowDeleteVisitConfirm(false);
            setVisitToDelete(null);
          }}
          onConfirm={confirmDeleteVisit}
          title={t('common.confirmation', 'Confirmation')}
          message={t('visits.confirmDelete')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Delete Invoice Confirm Modal */}
        <ConfirmModal
          show={showDeleteInvoiceConfirm}
          onHide={() => {
            setShowDeleteInvoiceConfirm(false);
            setInvoiceToDelete(null);
          }}
          onConfirm={confirmDeleteInvoice}
          title={t('common.confirmation', 'Confirmation')}
          message={t('billing.confirmDeleteInvoice')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

      </Container>
    </Layout>
  );
};

export default PatientDetailPage;