/**
 * PatientDetailPage Component
 * Detailed patient view with tabbed interface
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Badge, Alert, Spinner, Dropdown, Modal, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentListComponent from '../components/DocumentListComponent';
import MeasurementCharts from '../components/MeasurementCharts';
import InvoiceList from '../components/InvoiceList';
import CustomFieldInput from '../components/CustomFieldInput';
import CustomFieldDisplay from '../components/CustomFieldDisplay';
import customFieldService from '../services/customFieldService';
import { formatDate as utilFormatDate } from '../utils/dateUtils';
import { getBMICategory, calculateBMI } from '../utils/bmiUtils';
import * as gdprService from '../services/gdprService';
import * as billingService from '../services/billingService';
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

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
      fetchPatientDocuments();
      fetchPatientInvoices();
      fetchCustomFields();
    }
  }, [id]);

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

  const fetchCustomFields = async () => {
    try {
      const data = await customFieldService.getPatientCustomFields(id);
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

  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm(t('visits.confirmDelete') || 'Are you sure you want to delete this visit?')) {
      return;
    }

    try {
      await api.delete(`/api/visits/${visitId}`);
      // Refresh patient details to update visit list
      fetchPatientDetails();
    } catch (err) {
      console.error('Error deleting visit:', err);
      setError(t('errors.failedToDeleteVisit', { error: err.response?.data?.error || err.message }));
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

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm(t('billing.confirmDeleteInvoice') || 'Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await billingService.deleteInvoice(invoiceId);
      // Refresh invoices list
      fetchPatientInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(t('errors.failedToDeleteInvoice', { error: err.response?.data?.error || err.message }));
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

            <div className="patient-detail-actions d-flex gap-2">
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

        {/* Patient Details Tabs */}
        <Card>
          <Card.Body>
            {/* Search Bar for Custom Fields */}
            <Row className="mb-3">
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search in custom fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
                {searchQuery && (
                  <Form.Text className="text-muted">
                    {searchResults.hasResults ? (
                      <>
                        {searchResults.matchingFields.length} field{searchResults.matchingFields.length !== 1 ? 's' : ''} found
                        {searchResults.matchingCategory && ' - switched to matching tab'}
                      </>
                    ) : (
                      'No fields found matching your search'
                    )}
                  </Form.Text>
                )}
              </Col>
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
              {/* Basic Info Tab */}
              <Tab eventKey="basic-info" title="📋 Basic Information">
                {/* Essential Patient Info */}
                <Card className="mb-3">
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">Patient Basic Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Row className="mb-2">
                          <Col sm={5}><strong>First Name:</strong></Col>
                          <Col sm={7}>{patient.first_name}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Last Name:</strong></Col>
                          <Col sm={7}>{patient.last_name}</Col>
                        </Row>
                      </Col>
                      <Col md={6}>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Email:</strong></Col>
                          <Col sm={7}>{patient.email || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Phone:</strong></Col>
                          <Col sm={7}>{patient.phone || '-'}</Col>
                        </Row>
                      </Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col>
                        <strong>Status:</strong>{' '}
                        <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                          {patient.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Col>
                      {patient.assigned_dietitian && (
                        <Col>
                          <strong>Assigned Dietitian:</strong> {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
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
                              <Col md={6} key={field.definition_id}>
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
                          <Col key={field.definition_id} md={6}>
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
                                    <div className="d-flex gap-1">
                                      {canEditVisits && (
                                        <Button
                                          variant="outline-secondary"
                                          size="sm"
                                          onClick={() => handleEditVisit(visit.id)}
                                          title={t('visits.editVisit', 'Edit Visit')}
                                        >
                                          ✏️
                                        </Button>
                                      )}
                                      {canDeleteVisits && (
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => handleDeleteVisit(visit.id)}
                                          title={t('visits.deleteVisit', 'Delete Visit')}
                                        >
                                          🗑️
                                        </Button>
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
                                className="visit-card-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleViewVisit(visit.id)}
                                >
                                  {t('common.view', 'View')}
                                </Button>
                                {canEditVisits && (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleEditVisit(visit.id)}
                                  >
                                    {t('common.edit', 'Edit')}
                                  </Button>
                                )}
                                {canDeleteVisits && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                  >
                                    {t('common.delete', 'Delete')}
                                  </Button>
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

              {/* Measurements Tab */}
              <Tab eventKey="measurements" title={`📊 ${t('patients.measurementsTab')}`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('patients.measurementTrends')}</h5>
                    <p className="text-muted mb-0 small">
                      {t('patients.measurementTrendsDescription')}
                    </p>
                  </Card.Header>
                  <Card.Body>
                    <MeasurementCharts visits={visits} />
                  </Card.Body>
                </Card>
              </Tab>

              {/* Raw Measurements Tab (Development Only) */}
              {import.meta.env.DEV && (
                <Tab eventKey="raw-measurements" title={`🔧 Raw Data`}>
                  <Card>
                    <Card.Header className="bg-dark text-white">
                      <h5 className="mb-0">{t('patients.rawMeasurementData', 'Raw Measurement Data (Development Only)')}</h5>
                      <p className="text-muted mb-0 small">
                        All measurements from completed visits
                      </p>
                    </Card.Header>
                    <Card.Body>
                      {(() => {
                        // Filter completed visits and extract measurements
                        const completedVisits = visits.filter(v => v.status === 'COMPLETED');
                        const allMeasurements = [];

                        completedVisits.forEach(visit => {
                          if (visit.measurements && Array.isArray(visit.measurements)) {
                            visit.measurements.forEach(measurement => {
                              allMeasurements.push({
                                ...measurement,
                                visit_date: visit.visit_date,
                                visit_type: visit.visit_type,
                                visit_id: visit.id
                              });
                            });
                          }
                        });

                        if (allMeasurements.length === 0) {
                          return (
                            <Alert variant="info">
                              No measurements found in completed visits.
                            </Alert>
                          );
                        }

                        return (
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered">
                              <thead className="table-dark">
                                <tr>
                                  <th>Visit Date</th>
                                  <th>Visit Type</th>
                                  <th>Weight (kg)</th>
                                  <th>Height (cm)</th>
                                  <th>BMI</th>
                                  <th>BP Systolic</th>
                                  <th>BP Diastolic</th>
                                  <th>Heart Rate</th>
                                  <th>Waist (cm)</th>
                                  <th>Hip (cm)</th>
                                  <th>Body Fat %</th>
                                  <th>Muscle Mass (kg)</th>
                                  <th>Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allMeasurements.map((m, idx) => {
                                  const bmiCategory = m.bmi ? getBMICategory(m.bmi, t) : null;
                                  return (
                                  <tr key={idx}>
                                    <td>{formatDateTime(m.visit_date)}</td>
                                    <td>{m.visit_type || 'General'}</td>
                                    <td>{m.weight_kg || '-'}</td>
                                    <td>{m.height_cm || '-'}</td>
                                    <td>
                                      {m.bmi ? (
                                        <div>
                                          <strong>{m.bmi.toFixed(1)}</strong>
                                          {bmiCategory && (
                                            <div>
                                              <Badge
                                                bg={bmiCategory.variant}
                                                className="mt-1"
                                                style={bmiCategory.customBg ? { backgroundColor: bmiCategory.customBg } : {}}
                                              >
                                                {bmiCategory.category}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      ) : '-'}
                                    </td>
                                    <td>{m.blood_pressure_systolic || '-'}</td>
                                    <td>{m.blood_pressure_diastolic || '-'}</td>
                                    <td>{m.heart_rate_bpm || '-'}</td>
                                    <td>{m.waist_circumference_cm || '-'}</td>
                                    <td>{m.hip_circumference_cm || '-'}</td>
                                    <td>{m.body_fat_percentage || '-'}</td>
                                    <td>{m.muscle_mass_kg || '-'}</td>
                                    <td>{m.notes || '-'}</td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="mt-3">
                              <strong>Total Measurements:</strong> {allMeasurements.length} records from {completedVisits.length} completed visits
                            </div>
                          </div>
                        );
                      })()}
                    </Card.Body>
                  </Card>
                </Tab>
              )}

              {/* Administrative Tab */}
              {canEditPatient && (
                <Tab eventKey="admin" title="Administrative">
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Administrative Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Row>
                            <Col sm={5}><strong>Assigned Dietitian:</strong></Col>
                            <Col sm={7}>
                              {patient.assigned_dietitian ? (
                                `${patient.assigned_dietitian.first_name} ${patient.assigned_dietitian.last_name}`
                              ) : 'Not assigned'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>{t('patients.createdLabel', 'Created:')}</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.created_at)}</Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Last Updated:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.updated_at)}</Col>
                          </Row>
                        </Col>
                        <Col md={6}>
                          <Row>
                            <Col sm={4}><strong>{t('patients.notes', 'Notes:')}</strong></Col>
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
            </Tabs>
          </Card.Body>
        </Card>


        {/* Delete Permanently Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
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

      </Container>
    </Layout>
  );
};

export default PatientDetailPage;