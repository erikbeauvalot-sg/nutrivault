/**
 * VisitDetailPage Component
 * Detailed visit view with complete information
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Badge, Alert, Spinner, Modal, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { formatDate as utilFormatDate } from '../utils/dateUtils';
import { applyTranslationsToMeasures, fetchMeasureTranslations } from '../utils/measureTranslations';
import visitService from '../services/visitService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import CustomFieldDisplay from '../components/CustomFieldDisplay';
import LogMeasureModal from '../components/LogMeasureModal';
import SendReminderButton from '../components/SendReminderButton';
import { getMeasuresByVisit, formatMeasureValue, getAllMeasureTranslations } from '../services/measureService';

const VisitDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishingVisit, setFinishingVisit] = useState(false);
  const [finishSuccess, setFinishSuccess] = useState(null);
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});

  // Measures state
  const [measures, setMeasures] = useState([]);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [loadingMeasures, setLoadingMeasures] = useState(false);
  const [showLogMeasureModal, setShowLogMeasureModal] = useState(false);

  useEffect(() => {
    if (id && i18n.resolvedLanguage) {
      fetchVisitDetails();
      fetchCustomFields();
      fetchVisitMeasures();
    }
  }, [id, i18n.resolvedLanguage]);

  // Re-apply measure translations when language changes (without refetching)
  useEffect(() => {
    if (measures.length > 0 && Object.keys(measureTranslations).length > 0) {
      const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
      const translatedMeasures = applyTranslationsToMeasures(
        measures,
        measureTranslations,
        currentLanguage
      );
      setMeasures(translatedMeasures);
    }
  }, [i18n.language]);

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

  const fetchCustomFields = async () => {
    try {
      let language = i18n.resolvedLanguage || i18n.language;
      if (!language) {
        language = localStorage.getItem('i18nextLng') || 'fr';
      }
      const data = await visitCustomFieldService.getVisitCustomFields(id, language);
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
      console.error('Error fetching visit custom fields:', err);
      // Don't set error for custom fields failure
    }
  };

  const fetchVisitMeasures = async () => {
    try {
      setLoadingMeasures(true);
      const data = await getMeasuresByVisit(id);
      const measuresArray = data || [];

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
          getAllMeasureTranslations
        );
        setMeasureTranslations(translations);

        // Apply translations based on current language
        const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
        const translatedMeasures = applyTranslationsToMeasures(
          measuresArray,
          translations,
          currentLanguage
        );
        setMeasures(translatedMeasures);
      } else {
        setMeasures(measuresArray);
      }
    } catch (err) {
      console.error('Error fetching visit measures:', err);
      // Don't set error for measures failure
    } finally {
      setLoadingMeasures(false);
    }
  };

  const handleBack = () => {
    navigate('/visits');
  };

  const handleEdit = () => {
    navigate(`/visits/${id}/edit`);
  };

  const handleFinishAndInvoice = async () => {
    try {
      setFinishingVisit(true);
      setError(null);

      const response = await visitService.finishAndInvoice(id);
      const result = response.data.data || response.data;

      // Show success message
      setFinishSuccess({
        message: result.message,
        emailSent: result.emailSent,
        invoice: result.invoice
      });

      // Refresh visit details
      await fetchVisitDetails();

      // Close modal
      setShowFinishModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('visits.finishAndInvoiceError'));
      console.error('Error finishing visit and generating invoice:', err);
      setShowFinishModal(false);
    } finally {
      setFinishingVisit(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleString(locale);
  };

  const formatDate = (dateString) => {
    return utilFormatDate(dateString, i18n.language);
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
  const canFinishVisit = canEditVisit && visit?.status === 'SCHEDULED';

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
          <Col xs="auto" className="d-flex gap-2">
            <SendReminderButton
              visit={visit}
              onReminderSent={fetchVisitDetails}
            />
            {canFinishVisit && (
              <Button
                variant="success"
                onClick={() => setShowFinishModal(true)}
                disabled={finishingVisit}
              >
                ✅ {t('visits.finishAndInvoice')}
              </Button>
            )}
            {canEditVisit && (
              <Button variant="primary" onClick={handleEdit}>
                {t('visits.editVisit')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Success Alert */}
        {finishSuccess && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setFinishSuccess(null)}
            className="mb-4"
          >
            <Alert.Heading>✅ {t('visits.visitCompleted')}</Alert.Heading>
            <p>{finishSuccess.message}</p>
            {finishSuccess.emailSent && (
              <p className="mb-0">
                📧 {t('visits.invoiceEmailSent')}
              </p>
            )}
            {!finishSuccess.emailSent && finishSuccess.invoice && (
              <p className="mb-0 text-warning">
                ⚠️ {t('visits.invoiceCreatedNoEmail')}
              </p>
            )}
          </Alert>
        )}

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
                            {visit.patient ? (
                              <Link
                                to={`/patients/${visit.patient.id}`}
                                className="text-primary text-decoration-none"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                              >
                                {visit.patient.first_name} {visit.patient.last_name}
                              </Link>
                            ) : '-'}
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

              {/* Health Measures Tab - New Measures System */}
              <Tab eventKey="health-measures" title={`📊 ${t('measures.healthMeasures', 'Health Measures')} (${measures.length})`}>
                <Row className="mb-3">
                  <Col>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5>{t('measures.measuresForVisit', 'Measures for this visit')}</h5>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowLogMeasureModal(true)}
                      >
                        + {t('measures.logMeasure', 'Log Measure')}
                      </Button>
                    </div>
                  </Col>
                </Row>

                {loadingMeasures ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 text-muted">{t('common.loading')}</p>
                  </div>
                ) : measures.length === 0 ? (
                  <Alert variant="info">
                    <strong>{t('measures.noMeasuresForVisit', 'No measures logged for this visit yet')}</strong>
                    <p className="mb-0 mt-2">
                      {t('measures.clickLogMeasureToStart', 'Click "Log Measure" to add health measurements for this visit.')}
                    </p>
                  </Alert>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>{t('measures.measure', 'Measure')}</th>
                        <th>{t('measures.value', 'Value')}</th>
                        <th>{t('measures.recordedAt', 'Recorded At')}</th>
                        <th>{t('measures.recordedBy', 'Recorded By')}</th>
                        <th>{t('measures.notes', 'Notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measures.map(measure => (
                        <tr key={measure.id}>
                          <td>
                            <strong>{measure.measureDefinition?.display_name || '-'}</strong>
                            {measure.measureDefinition?.category && (
                              <div className="mt-1">
                                <Badge bg="light" text="dark" style={{ fontSize: '0.75rem' }}>
                                  {measure.measureDefinition.category}
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>
                              {formatMeasureValue(measure, measure.measureDefinition)}
                            </strong>
                          </td>
                          <td>{formatDateTime(measure.measured_at)}</td>
                          <td>{measure.recorder?.username || '-'}</td>
                          <td style={{ maxWidth: '200px', whiteSpace: 'pre-wrap' }}>
                            {measure.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Tab>

              {/* Custom Fields Tabs - Only visible if there are categories for visits */}
              {customFieldCategories.length > 0 && customFieldCategories.map((category) => (
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
                        No fields defined for this category
                      </Alert>
                    ) : (
                      <Row>
                        {category.fields.map(field => (
                          <Col key={field.definition_id} md={6}>
                            <CustomFieldDisplay
                              fieldDefinition={field}
                              value={fieldValues[field.definition_id]}
                            />
                          </Col>
                        ))}
                      </Row>
                    )}
                  </div>
                </Tab>
              ))}

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

        {/* Finish & Invoice Confirmation Modal */}
        <Modal
          show={showFinishModal}
          onHide={() => setShowFinishModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              ✅ {t('visits.finishAndInvoice')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="mb-3">
              <strong>{t('visits.finishAndInvoiceConfirmTitle')}</strong>
            </Alert>
            <p>{t('visits.finishAndInvoiceConfirmMessage')}</p>
            <ul>
              <li>{t('visits.finishAndInvoiceStep1')}</li>
              <li>{t('visits.finishAndInvoiceStep2')}</li>
              {visit?.patient?.email && (
                <li>{t('visits.finishAndInvoiceStep3')}</li>
              )}
              {!visit?.patient?.email && (
                <li className="text-warning">
                  ⚠️ {t('visits.finishAndInvoiceNoEmail')}
                </li>
              )}
            </ul>
            <p className="mb-0">
              <strong>{t('visits.finishAndInvoiceContinue')}</strong>
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowFinishModal(false)}
              disabled={finishingVisit}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="success"
              onClick={handleFinishAndInvoice}
              disabled={finishingVisit}
            >
              {finishingVisit ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('visits.finishing')}
                </>
              ) : (
                <>
                  ✅ {t('visits.finishAndInvoice')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Log Measure Modal */}
        {visit?.patient && (
          <LogMeasureModal
            show={showLogMeasureModal}
            onHide={() => setShowLogMeasureModal(false)}
            patientId={visit.patient.id}
            visitId={id}
            onSuccess={() => {
              fetchVisitMeasures();
              setShowLogMeasureModal(false);
            }}
          />
        )}
      </Container>
    </Layout>
  );
};

export default VisitDetailPage;
