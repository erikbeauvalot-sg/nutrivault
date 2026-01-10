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
import api from '../services/api';

const PatientDetailPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
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
      setError('Failed to load patient details: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/patients');
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
        <Row className="mb-4">
          <Col>
            <Button variant="outline-secondary" onClick={handleBack} className="mb-3">
              ← Back to Patients
            </Button>
            <h1 className="mb-0">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="d-flex align-items-center gap-2 mt-2">
              <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                {patient.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {patient.medical_record_number && (
                <small className="text-muted">
                  MRN: {patient.medical_record_number}
                </small>
              )}
            </div>
          </Col>
          <Col xs="auto">
            {canEditPatient && (
              <Button
                variant="primary"
                onClick={() => navigate(`/patients/${id}/edit`)}
              >
                Edit Patient
              </Button>
            )}
          </Col>
        </Row>

        {/* Patient Details Tabs */}
        <Card>
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
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
                    <h5 className="mb-0">Visit History</h5>
                  </Card.Header>
                  <Card.Body>
                    {visits.length === 0 ? (
                      <p className="text-muted">No visits recorded yet.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Type</th>
                              <th>Notes</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visits.map(visit => (
                              <tr key={visit.id}>
                                <td>{formatDateTime(visit.visit_date)}</td>
                                <td>{visit.visit_type || 'General'}</td>
                                <td>{visit.notes || '-'}</td>
                                <td>
                                  <Badge bg={visit.status === 'completed' ? 'success' : 'warning'}>
                                    {visit.status || 'Scheduled'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab>

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
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default PatientDetailPage;