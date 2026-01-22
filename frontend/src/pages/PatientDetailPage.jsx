/**
 * PatientDetailPage Component
 * Detailed patient view with tabbed interface
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentListComponent from '../components/DocumentListComponent';
import DocumentUploadModal from '../components/DocumentUploadModal';
import MeasurementCharts from '../components/MeasurementCharts';
import VisitModal from '../components/VisitModal';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import api from '../services/api';
import './PatientDetailPage.css';

const PatientDetailPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('complete');
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
      fetchPatientDocuments();
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

  const handleBack = () => {
    navigate('/patients');
  };

  const handleEditPatient = () => {
    navigate(`/patients/${id}/edit`);
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
    setShowVisitModal(true);
  };

  const handleAddPayment = () => {
    setShowInvoiceModal(true);
  };

  const handleVisitModalSave = async (visitData) => {
    try {
      // Pre-populate with current patient and dietitian
      const visitPayload = {
        ...visitData,
        patient_id: patient.id,
        dietitian_id: patient.assigned_dietitian?.id || user.id, // Use assigned dietitian or current user
        visit_date: visitData.visit_date || new Date().toISOString().split('T')[0], // Default to today
        visit_time: visitData.visit_time || new Date().toTimeString().slice(0, 5), // Default to current time
      };

      await api.post('/api/visits', visitPayload);
      setShowVisitModal(false);
      // Refresh patient details to show new visit
      fetchPatientDetails();
    } catch (err) {
      console.error('Error creating visit:', err);
      throw new Error('Failed to create visit: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleInvoiceModalSubmit = async (invoiceData) => {
    try {
      // Pre-populate with current patient
      const invoicePayload = {
        ...invoiceData,
        patient_id: patient.id,
      };

      await api.post('/api/billing', invoicePayload);
      setShowInvoiceModal(false);
      // Could refresh billing data if shown on this page
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw new Error('Failed to create invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
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
            <div className="mt-2">Loading patient details...</div>
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
            <Alert.Heading>Error Loading Patient</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              Back to Patients
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
            <Alert.Heading>Patient Not Found</Alert.Heading>
            <p>The requested patient could not be found.</p>
            <Button variant="outline-warning" onClick={handleBack}>
              Back to Patients
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
            </div>
          </div>
        </div>

        {/* Patient Details Tabs */}
        <Card>
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
              {/* Complete Profile Tab */}
              <Tab eventKey="complete" title="📋 Complete Profile">
                <Row className="patient-info-cards">
                  {/* Personal Information */}
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">👤 Personal Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Full Name:</strong></Col>
                          <Col sm={7}>{patient.first_name} {patient.last_name}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Email:</strong></Col>
                          <Col sm={7}>{patient.email || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Phone:</strong></Col>
                          <Col sm={7}>{patient.phone || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Date of Birth:</strong></Col>
                          <Col sm={7}>{formatDate(patient.date_of_birth)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Age:</strong></Col>
                          <Col sm={7}>
                            {patient.date_of_birth
                              ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
                              : '-'
                            } years
                          </Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Gender:</strong></Col>
                          <Col sm={7}>{patient.gender || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Status:</strong></Col>
                          <Col sm={7}>
                            <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                              {patient.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    {/* Contact & Address */}
                    <Card className="mb-3">
                      <Card.Header className="bg-info text-white">
                        <h6 className="mb-0">📍 Address & Contact</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Address:</strong></Col>
                          <Col sm={7}>{patient.address || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>City:</strong></Col>
                          <Col sm={7}>{patient.city || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>State:</strong></Col>
                          <Col sm={7}>{patient.state || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>ZIP Code:</strong></Col>
                          <Col sm={7}>{patient.zip_code || '-'}</Col>
                        </Row>
                        <hr />
                        <Row className="mb-2">
                          <Col sm={5}><strong>Emergency Contact:</strong></Col>
                          <Col sm={7}>{patient.emergency_contact_name || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Emergency Phone:</strong></Col>
                          <Col sm={7}>{patient.emergency_contact_phone || '-'}</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Medical & Dietary */}
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-danger text-white">
                        <h6 className="mb-0">🏥 Medical Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Allergies:</strong></Col>
                          <Col sm={7}>
                            {patient.allergies ? (
                              <div style={{ whiteSpace: 'pre-wrap' }}>{patient.allergies}</div>
                            ) : '-'}
                          </Col>
                        </Row>
                        <hr />
                        <Row className="mb-2">
                          <Col><strong>Medical Notes:</strong></Col>
                        </Row>
                        <Row>
                          <Col>
                            {patient.medical_notes ? (
                              <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                                {patient.medical_notes}
                              </div>
                            ) : (
                              <div className="text-muted fst-italic">No medical notes recorded</div>
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Card className="mb-3">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">🥗 Dietary Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col><strong>Dietary Preferences:</strong></Col>
                        </Row>
                        <Row className="mb-3">
                          <Col>
                            {patient.dietary_preferences ? (
                              <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                                {patient.dietary_preferences}
                              </div>
                            ) : (
                              <div className="text-muted fst-italic">No dietary preferences recorded</div>
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    <Card className="mb-3">
                      <Card.Header className="bg-warning">
                        <h6 className="mb-0">👨‍⚕️ Care Team</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Assigned Dietitian:</strong></Col>
                          <Col sm={7}>
                            {patient.assigned_dietitian
                              ? `${patient.assigned_dietitian.first_name} ${patient.assigned_dietitian.last_name}`
                              : 'Not assigned'
                            }
                          </Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Created:</strong></Col>
                          <Col sm={7}>{formatDateTime(patient.created_at)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Last Updated:</strong></Col>
                          <Col sm={7}>{formatDateTime(patient.updated_at)}</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Personal Information Tab */}
              <Tab eventKey="info" title="Personal Information">
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header>
                        <h5 className="mb-0">Basic Information</h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col sm={4}><strong>Name:</strong></Col>
                          <Col sm={8}>{patient.first_name} {patient.last_name}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Email:</strong></Col>
                          <Col sm={8}>{patient.email || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Phone:</strong></Col>
                          <Col sm={8}>{patient.phone || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Date of Birth:</strong></Col>
                          <Col sm={8}>{formatDate(patient.date_of_birth)}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Gender:</strong></Col>
                          <Col sm={8}>{patient.gender || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Blood Type:</strong></Col>
                          <Col sm={8}>{patient.blood_type || '-'}</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header>
                        <h5 className="mb-0">Address & Contact</h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col sm={4}><strong>Address:</strong></Col>
                          <Col sm={8}>{patient.address || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>City:</strong></Col>
                          <Col sm={8}>{patient.city || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>State:</strong></Col>
                          <Col sm={8}>{patient.state || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>ZIP Code:</strong></Col>
                          <Col sm={8}>{patient.zip_code || '-'}</Col>
                        </Row>
                        <Row className="mt-2">
                          <Col sm={4}><strong>Emergency Contact:</strong></Col>
                          <Col sm={8}>
                            {patient.emergency_contact_name || '-'}
                            {patient.emergency_contact_phone && (
                              <div className="small text-muted">{patient.emergency_contact_phone}</div>
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Medical Information Tab */}
              {canViewMedicalData && (
                <Tab eventKey="medical" title="Medical Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>
                          <h5 className="mb-0">Medical Details</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col sm={5}><strong>Medical Record #:</strong></Col>
                            <Col sm={7}>{patient.medical_record_number || '-'}</Col>
                          </Row>
                          <Row className="mt-2">
                            <Col sm={5}><strong>Height:</strong></Col>
                            <Col sm={7}>{patient.height_cm ? `${patient.height_cm} cm` : '-'}</Col>
                          </Row>
                          <Row className="mt-2">
                            <Col sm={5}><strong>Weight:</strong></Col>
                            <Col sm={7}>{patient.weight_kg ? `${patient.weight_kg} kg` : '-'}</Col>
                          </Row>
                          <Row className="mt-2">
                            <Col sm={5}><strong>Insurance:</strong></Col>
                            <Col sm={7}>
                              {patient.insurance_provider || '-'}
                              {patient.insurance_policy_number && (
                                <div className="small text-muted">Policy: {patient.insurance_policy_number}</div>
                              )}
                            </Col>
                          </Row>
                          <Row className="mt-2">
                            <Col sm={5}><strong>Primary Care Physician:</strong></Col>
                            <Col sm={7}>{patient.primary_care_physician || '-'}</Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>
                          <h5 className="mb-0">Medical History</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col sm={4}><strong>Allergies:</strong></Col>
                            <Col sm={8}>
                              {patient.allergies ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.allergies}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={4}><strong>Current Medications:</strong></Col>
                            <Col sm={8}>
                              {patient.current_medications ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.current_medications}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={4}><strong>Medical Conditions:</strong></Col>
                            <Col sm={8}>
                              {patient.medical_conditions ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.medical_conditions}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              )}

              {/* Dietary Information Tab */}
              {canViewMedicalData && (
                <Tab eventKey="dietary" title="Dietary Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>
                          <h5 className="mb-0">Dietary Preferences</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col sm={5}><strong>Dietary Restrictions:</strong></Col>
                            <Col sm={7}>
                              {patient.dietary_restrictions ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.dietary_restrictions}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Food Preferences:</strong></Col>
                            <Col sm={7}>
                              {patient.food_preferences ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.food_preferences}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Nutritional Goals:</strong></Col>
                            <Col sm={7}>
                              {patient.nutritional_goals ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.nutritional_goals}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>
                          <h5 className="mb-0">Lifestyle</h5>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col sm={5}><strong>Exercise Habits:</strong></Col>
                            <Col sm={7}>
                              {patient.exercise_habits ? (
                                <div style={{ whiteSpace: 'pre-wrap' }}>{patient.exercise_habits}</div>
                              ) : '-'}
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Smoking Status:</strong></Col>
                            <Col sm={7}>{patient.smoking_status || '-'}</Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Alcohol Consumption:</strong></Col>
                            <Col sm={7}>{patient.alcohol_consumption || '-'}</Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              )}

              {/* Visits Tab */}
              <Tab eventKey="visits" title={`Visits (${visits.length})`}>
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
                                      {visit.status || 'Scheduled'}
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
                                    {visit.status || 'Scheduled'}
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
              <Tab eventKey="measurements" title={`📊 Measurements`}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Measurement Trends</h5>
                    <p className="text-muted mb-0 small">
                      Track changes in patient measurements over time
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
                      <h5 className="mb-0">Raw Measurement Data (Development Only)</h5>
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
                                {allMeasurements.map((m, idx) => (
                                  <tr key={idx}>
                                    <td>{formatDateTime(m.visit_date)}</td>
                                    <td>{m.visit_type || 'General'}</td>
                                    <td>{m.weight_kg || '-'}</td>
                                    <td>{m.height_cm || '-'}</td>
                                    <td>{m.bmi ? m.bmi.toFixed(1) : '-'}</td>
                                    <td>{m.blood_pressure_systolic || '-'}</td>
                                    <td>{m.blood_pressure_diastolic || '-'}</td>
                                    <td>{m.heart_rate_bpm || '-'}</td>
                                    <td>{m.waist_circumference_cm || '-'}</td>
                                    <td>{m.hip_circumference_cm || '-'}</td>
                                    <td>{m.body_fat_percentage || '-'}</td>
                                    <td>{m.muscle_mass_kg || '-'}</td>
                                    <td>{m.notes || '-'}</td>
                                  </tr>
                                ))}
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
                            <Col sm={5}><strong>Created:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.created_at)}</Col>
                          </Row>
                          <Row className="mt-3">
                            <Col sm={5}><strong>Last Updated:</strong></Col>
                            <Col sm={7}>{formatDateTime(patient.updated_at)}</Col>
                          </Row>
                        </Col>
                        <Col md={6}>
                          <Row>
                            <Col sm={4}><strong>Notes:</strong></Col>
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
                    onClick={() => setShowDocumentUploadModal(true)}
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
            </Tabs>
          </Card.Body>
        </Card>

        {/* Document Upload Modal */}
        <DocumentUploadModal
          show={showDocumentUploadModal}
          onHide={() => setShowDocumentUploadModal(false)}
          onUploadSuccess={() => {
            setShowDocumentUploadModal(false);
            fetchPatientDocuments();
          }}
          selectedResource={{ resourceType: 'patients', resourceId: id }}
        />

        {/* Visit Modal */}
        <VisitModal
          show={showVisitModal}
          onHide={() => setShowVisitModal(false)}
          mode="create"
          onSave={handleVisitModalSave}
          preSelectedPatient={patient}
        />

        {/* Invoice Modal */}
        <CreateInvoiceModal
          show={showInvoiceModal}
          onHide={() => setShowInvoiceModal(false)}
          onSubmit={handleInvoiceModalSubmit}
          preSelectedPatient={patient}
        />
      </Container>
    </Layout>
  );
};

export default PatientDetailPage;