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
      setError(t('errors.failedToLoadVisit', { error: err.response?.data?.error || err.message }));
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
    const statusText = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return <Badge bg={variants[status] || 'secondary'}>{statusText[status] || status}</Badge>;
  };

  // Check permissions
  const canEditVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">{t('visits.loadingDetails')}</div>
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
            <Alert.Heading>{t('visits.errorLoadingVisit')}</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              {t('visits.backToVisits')}
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
            <Alert.Heading>{t('visits.visitNotFound')}</Alert.Heading>
            <p>{t('visits.visitNotFoundMessage')}</p>
            <Button variant="outline-warning" onClick={handleBack}>
              {t('visits.backToVisits')}
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
              ← {t('visits.backToVisits')}
            </Button>
            <h1 className="mb-0">
              {t('visits.visitDetails')}
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
                {t('visits.editVisit')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Visit Details Tabs */}
        <Card>
          <Card.Body>
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
              {/* Overview Tab */}
              <Tab eventKey="overview" title={`📋 ${t('visits.overviewTab')}`}>
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">👤 {t('visits.patientDietitian')}</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.patient')}:</strong></Col>
                          <Col sm={7}>
                            {visit.patient
                              ? `${visit.patient.first_name} ${visit.patient.last_name}`
                              : '-'
                            }
                          </Col>
                        </Row>
                        {visit.patient?.email && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>{t('patients.email')}:</strong></Col>
                            <Col sm={7}>{visit.patient.email}</Col>
                          </Row>
                        )}
                        {visit.patient?.phone && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>{t('patients.phone')}:</strong></Col>
                            <Col sm={7}>{visit.patient.phone}</Col>
                          </Row>
                        )}
                        <hr />
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.dietitian')}:</strong></Col>
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
                        <h6 className="mb-0">📅 {t('visits.visitInfo')}</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.dateAndTime')}:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.visit_date)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.type')}:</strong></Col>
                          <Col sm={7}>{visit.visit_type || '-'}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.duration')}:</strong></Col>
                          <Col sm={7}>
                            {visit.duration_minutes ? `${visit.duration_minutes} ${t('visits.min')}` : '-'}
                          </Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.status')}:</strong></Col>
                          <Col sm={7}>{getStatusBadge(visit.status)}</Col>
                        </Row>
                        {visit.next_visit_date && (
                          <Row className="mb-2">
                            <Col sm={5}><strong>{t('visits.nextVisitDate')}:</strong></Col>
                            <Col sm={7}>{formatDateTime(visit.next_visit_date)}</Col>
                          </Row>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Clinical Information Tab */}
              <Tab eventKey="clinical" title={`🏥 ${t('visits.clinicalInformationTab')}`}>
                <Row>
                  <Col md={12}>
                    <Card className="mb-3">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">{t('visits.clinicalDetails')}</h6>
                      </Card.Header>
                      <Card.Body>
                        {visit.chief_complaint && (
                          <div className="mb-3">
                            <strong>{t('visits.chiefComplaint')}:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.chief_complaint}
                            </div>
                          </div>
                        )}

                        {visit.assessment && (
                          <div className="mb-3">
                            <strong>{t('visits.assessment')}:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.assessment}
                            </div>
                          </div>
                        )}

                        {visit.recommendations && (
                          <div className="mb-3">
                            <strong>{t('visits.recommendations')}:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.recommendations}
                            </div>
                          </div>
                        )}

                        {visit.notes && (
                          <div className="mb-3">
                            <strong>{t('visits.notes')}:</strong>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                              {visit.notes}
                            </div>
                          </div>
                        )}

                        {!visit.chief_complaint && !visit.assessment && !visit.recommendations && !visit.notes && (
                          <div className="text-muted fst-italic">{t('visits.noClinicalInfo')}</div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              {/* Measurements Tab */}
              <Tab eventKey="measurements" title={`📏 ${t('visits.measurementsTab')} (${visit.measurements?.length || 0})`}>
                <Row>
                  <Col md={12}>
                    {visit.measurements && visit.measurements.length > 0 ? (
                      <div>
                        <h6 className="mb-3">{t('visits.measurementsHistory')}</h6>
                        {visit.measurements
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((measurement, index) => (
                            <Card key={measurement.id} className="mb-3">
                              <Card.Header className={index === 0 ? 'bg-primary text-white' : 'bg-secondary text-white'}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span>
                                    {index === 0 && `🔵 ${t('visits.latestMeasurement')} - `}
                                    {formatDateTime(measurement.created_at)}
                                  </span>
                                </div>
                              </Card.Header>
                              <Card.Body>
                                <Row>
                                  {measurement.weight_kg && (
                                    <Col md={3} className="mb-2">
                                      <strong>{t('visits.weight')}:</strong> {measurement.weight_kg} kg
                                    </Col>
                                  )}
                                  {measurement.height_cm && (
                                    <Col md={3} className="mb-2">
                                      <strong>{t('visits.height')}:</strong> {measurement.height_cm} cm
                                    </Col>
                                  )}
                                  {measurement.bmi && (
                                    <Col md={3} className="mb-2">
                                      <strong>BMI:</strong> {measurement.bmi}
                                    </Col>
                                  )}
                                  {measurement.blood_pressure_systolic && measurement.blood_pressure_diastolic && (
                                    <Col md={3} className="mb-2">
                                      <strong>{t('visits.bloodPressure')}:</strong> {measurement.blood_pressure_systolic}/{measurement.blood_pressure_diastolic} mmHg
                                    </Col>
                                  )}
                                  {measurement.waist_circumference_cm && (
                                    <Col md={4} className="mb-2">
                                      <strong>{t('visits.waistCircumference')}:</strong> {measurement.waist_circumference_cm} cm
                                    </Col>
                                  )}
                                  {measurement.body_fat_percentage && (
                                    <Col md={4} className="mb-2">
                                      <strong>{t('visits.bodyFat')}:</strong> {measurement.body_fat_percentage}%
                                    </Col>
                                  )}
                                  {measurement.muscle_mass_percentage && (
                                    <Col md={4} className="mb-2">
                                      <strong>{t('visits.muscleMass')}:</strong> {measurement.muscle_mass_percentage}%
                                    </Col>
                                  )}
                                </Row>
                                {measurement.notes && (
                                  <div className="mt-2">
                                    <strong>{t('visits.notes')}:</strong>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{measurement.notes}</div>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <h5 className="text-muted">{t('visits.noMeasurementsRecorded')}</h5>
                        <p className="text-muted">{t('visits.measurementsCanBeAdded')}</p>
                        {canEditVisit && (
                          <Button variant="primary" onClick={handleEdit}>
                            {t('visits.editVisitToAddMeasurements')}
                          </Button>
                        )}
                      </div>
                    )}
                  </Col>
                </Row>
              </Tab>

              {/* Administrative Tab */}
              <Tab eventKey="admin" title={`⚙️ ${t('visits.administrativeTab')}`}>
                <Row>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-warning">
                        <h6 className="mb-0">{t('visits.timestamps')}</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.created')}:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.created_at)}</Col>
                        </Row>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.lastUpdated')}:</strong></Col>
                          <Col sm={7}>{formatDateTime(visit.updated_at)}</Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mb-3">
                      <Card.Header className="bg-warning">
                        <h6 className="mb-0">{t('visits.visitId')}</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="mb-2">
                          <Col sm={5}><strong>{t('visits.visitId')}:</strong></Col>
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
