/**
 * VisitDetailPage Component
 * Detailed visit view with complete information
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';

const VisitDetailPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchVisitDetails();
    }
  }, [id]);

  const fetchVisitDetails = async () => {
    try {
      setLoading(true);
      const response = await visitService.getVisitById(id);
      const visitData = response.data.data || response.data;
      setVisit(visitData);
      setError(null);
    } catch (err) {
      setError('Failed to load visit: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching visit details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/visits');
  };

  const handleEdit = () => {
    navigate(`/visits/${id}/edit`);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  // Check permissions
  const canEditVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">Loading visit details...</div>
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
            <Alert.Heading>Error Loading Visit</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              Back to Visits
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!visit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="warning">
            <Alert.Heading>Visit Not Found</Alert.Heading>
            <p>The requested visit could not be found.</p>
            <Button variant="outline-warning" onClick={handleBack}>
              Back to Visits
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
              ← Back to Visits
            </Button>
            <h1 className="mb-0">
              Visit Details
            </h1>
            <div className="d-flex align-items-center gap-2 mt-2">
              {getStatusBadge(visit.status)}
              <span className="text-muted">
                {formatDateTime(visit.visit_date)}
              </span>
            </div>
          </Col>
          <Col xs="auto">
            {canEditVisit && (
              <Button variant="primary" onClick={handleEdit}>
                Edit Visit
              </Button>
            )}
          </Col>
        </Row>

        {/* Visit Details Tabs */}
        <Card>
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
              {/* Overview Tab */}
              <Tab eventKey="overview" title="📋 Overview">
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">👤 Patient & Dietitian</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Patient:</strong></Col>
                          <Col sm={7}>
                            {visit.patient
                              ? `${visit.patient.first_name} ${visit.patient.last_name}`
                              : '-'
                            }
                          </Col>
                        </Row>
                        {visit.patient?.email && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>Email:</strong></Col>
                            <Col sm={7}>{visit.patient.email}</Col>
                          </Row>
                        )}
                        {visit.patient?.phone && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>Phone:</strong></Col>
                            <Col sm={7}>{visit.patient.phone}</Col>
                          </Row>
                        )}
                        <hr />
                        <Row className="mb-2">
                          <Col sm={5}><strong>Dietitian:</strong></Col>
                          <Col sm={7}>
                            {visit.dietitian
                              ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim() || visit.dietitian.username
                              : '-'
                            }
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-info text-white">
                        <h6 className="mb-0">📅 Visit Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Date & Time:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.visit_date)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Type:</strong></Col>
                          <Col sm={7}>{visit.visit_type || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Duration:</strong></Col>
                          <Col sm={7}>
                            {visit.duration_minutes ? `${visit.duration_minutes} minutes` : '-'}
                          </Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Status:</strong></Col>
                          <Col sm={7}>{getStatusBadge(visit.status)}</Col>
                        </Row>
                        {visit.next_visit_date && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>Next Visit:</strong></Col>
                            <Col sm={7}>{formatDateTime(visit.next_visit_date)}</Col>
                          </Row>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Clinical Information Tab */}
              <Tab eventKey="clinical" title="🏥 Clinical Information">
                <Row>
                  <Col md={12}>
                    <Card className="mb-3">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">Clinical Details</h6>
                      </Card.Header>
                      <Card.Body>
                        {visit.chief_complaint && (
                          <div className="mb-3">
                            <strong>Chief Complaint:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.chief_complaint}
                            </div>
                          </div>
                        )}

                        {visit.assessment && (
                          <div className="mb-3">
                            <strong>Assessment:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.assessment}
                            </div>
                          </div>
                        )}

                        {visit.recommendations && (
                          <div className="mb-3">
                            <strong>Recommendations:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.recommendations}
                            </div>
                          </div>
                        )}

                        {visit.notes && (
                          <div className="mb-3">
                            <strong>Additional Notes:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.notes}
                            </div>
                          </div>
                        )}

                        {!visit.chief_complaint && !visit.assessment && !visit.recommendations && !visit.notes && (
                          <div className="text-muted fst-italic">No clinical information recorded</div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Measurements Tab */}
              <Tab eventKey="measurements" title={`📏 Measurements (${visit.measurements?.length || 0})`}>
                <Row>
                  <Col md={12}>
                    {visit.measurements && visit.measurements.length > 0 ? (
                      <div>
                        <h6 className="mb-3">Measurement History</h6>
                        {visit.measurements
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((measurement, index) => (
                            <Card key={measurement.id} className="mb-3">
                              <Card.Header className={index === 0 ? 'bg-primary text-white' : 'bg-secondary text-white'}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span>
                                    {index === 0 && '🔵 Latest - '}
                                    {formatDateTime(measurement.created_at)}
                                  </span>
                                </div>
                              </Card.Header>
                              <Card.Body>
                                <Row>
                                  {measurement.weight_kg && (
                                    <Col md={3} className="mb-2">
                                      <strong>Weight:</strong> {measurement.weight_kg} kg
                                    </Col>
                                  )}
                                  {measurement.height_cm && (
                                    <Col md={3} className="mb-2">
                                      <strong>Height:</strong> {measurement.height_cm} cm
                                    </Col>
                                  )}
                                  {measurement.bmi && (
                                    <Col md={3} className="mb-2">
                                      <strong>BMI:</strong> {measurement.bmi}
                                    </Col>
                                  )}
                                  {measurement.blood_pressure_systolic && measurement.blood_pressure_diastolic && (
                                    <Col md={3} className="mb-2">
                                      <strong>Blood Pressure:</strong> {measurement.blood_pressure_systolic}/{measurement.blood_pressure_diastolic} mmHg
                                    </Col>
                                  )}
                                  {measurement.waist_circumference_cm && (
                                    <Col md={4} className="mb-2">
                                      <strong>Waist Circumference:</strong> {measurement.waist_circumference_cm} cm
                                    </Col>
                                  )}
                                  {measurement.body_fat_percentage && (
                                    <Col md={4} className="mb-2">
                                      <strong>Body Fat:</strong> {measurement.body_fat_percentage}%
                                    </Col>
                                  )}
                                  {measurement.muscle_mass_percentage && (
                                    <Col md={4} className="mb-2">
                                      <strong>Muscle Mass:</strong> {measurement.muscle_mass_percentage}%
                                    </Col>
                                  )}
                                </Row>
                                {measurement.notes && (
                                  <div className="mt-2">
                                    <strong>Notes:</strong>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{measurement.notes}</div>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <h5 className="text-muted">No measurements recorded</h5>
                        <p className="text-muted">Measurements can be added when editing the visit</p>
                        {canEditVisit && (
                          <Button variant="primary" onClick={handleEdit}>
                            Edit Visit to Add Measurements
                          </Button>
                        )}
                      </div>
                    )}
                  </Col>
                </Row>
              </Tab>

              {/* Administrative Tab */}
              <Tab eventKey="admin" title="⚙️ Administrative">
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-warning">
                        <h6 className="mb-0">Timestamps</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Created:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.created_at)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Last Updated:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.updated_at)}</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-warning">
                        <h6 className="mb-0">Visit ID</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>Visit ID:</strong></Col>
                          <Col sm={7}>
                            <code>{visit.id}</code>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default VisitDetailPage;
