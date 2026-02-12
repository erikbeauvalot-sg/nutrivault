/**
 * Patient Detail Modal Component
 * Displays comprehensive patient information with graphical measurement charts
 */

import { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { getPatientDetails } from '../services/patientService';
import { formatDate } from '../utils/dateUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PatientDetailModal = ({ patientId, show, onHide, onScheduleVisit }) => {
  const { t, i18n } = useTranslation();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStatusText = (status) => {
    const statusMap = {
      SCHEDULED: t('visits.scheduled'),
      COMPLETED: t('visits.completed'),
      CANCELLED: t('visits.cancelled'),
      NO_SHOW: t('visits.noShow')
    };
    return statusMap[status] || status;
  };

  useEffect(() => {
    if (show && patientId) {
      fetchPatientDetails();
    }
  }, [show, patientId]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPatientDetails(patientId);
      const patientData = response.data?.data || response.data || response;
      setPatient(patientData);
    } catch (err) {
      setError(t('patients.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (measurements, field) => {
    if (!measurements || measurements.length === 0) return null;

    const validMeasurements = measurements
      .filter(m => m[field] !== null && m[field] !== undefined)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (validMeasurements.length === 0) return null;

    return {
      labels: validMeasurements.map(m => formatDate(m.created_at, i18n.language)),
      datasets: [{
        label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        data: validMeasurements.map(m => parseFloat(m[field])),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  };

  const chartOptions = (title, yAxisLabel) => ({
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel
        }
      }
    }
  });

  if (loading) {
    return (
      <Modal show={show} onHide={onHide} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{t('patients.loadingDetails')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
          <p className="mt-3">{t('patients.loadingInfo')}</p>
        </Modal.Body>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{t('patients.error')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>{t('patients.error')}:</strong> {error}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={onHide}>
            {t('common.close')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }

  if (!patient) return null;

  // Flatten all measurements from all visits
  const allMeasurements = patient.visits?.flatMap(visit =>
    visit.measurements?.map(measurement => ({
      ...measurement,
      visit_date: visit.visit_date,
      visit_type: visit.visit_type
    })) || []
  ) || [];

  return (
    <Modal show={show} onHide={onHide} size="xl" className="patient-detail-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          👤 {patient.first_name} {patient.last_name}
          <Badge bg={patient.is_active ? 'success' : 'secondary'} className="ms-2">
            {patient.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Tabs defaultActiveKey="overview" className="mb-4">
          {/* Overview Tab */}
          <Tab eventKey="overview" title={`📋 ${t('patients.overview')}`}>
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">👤 {t('patients.patientInfo')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col sm={6}>
                        <strong>{t('patients.name')}:</strong><br />
                        {patient.first_name} {patient.last_name}
                      </Col>
                      <Col sm={6}>
                        <strong>{t('patients.status')}:</strong><br />
                        <Badge bg={patient.is_active ? 'success' : 'secondary'}>
                          {patient.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </Col>
                    </Row>
                    {patient.email && (
                      <Row className="mt-2">
                        <Col>
                          <strong>📧 {t('patients.email')}:</strong> {patient.email}
                        </Col>
                      </Row>
                    )}
                    {patient.phone && (
                      <Row className="mt-2">
                        <Col>
                          <strong>📱 {t('patients.phone')}:</strong> {patient.phone}
                        </Col>
                      </Row>
                    )}
                    {patient.gender && (
                      <Row className="mt-2">
                        <Col>
                          <strong>{t('patients.gender')}:</strong> {patient.gender}
                        </Col>
                      </Row>
                    )}
                    {patient.address && (
                      <Row className="mt-2">
                        <Col>
                          <strong>📍 {t('patients.address')}:</strong> {patient.address}
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">🏥 {t('patients.medicalInfo')}</h5>
                  </Card.Header>
                  <Card.Body>
                    {patient.allergies && (
                      <Row className="mb-2">
                        <Col>
                          <strong>⚠️ {t('patients.allergies')}:</strong> {patient.allergies}
                        </Col>
                      </Row>
                    )}
                    {patient.dietary_preferences && (
                      <Row className="mb-2">
                        <Col>
                          <strong>🥗 {t('patients.dietaryPreferences')}:</strong> {patient.dietary_preferences}
                        </Col>
                      </Row>
                    )}
                    {patient.medical_notes && (
                      <Row className="mb-2">
                        <Col>
                          <strong>📋 {t('patients.medicalNotes')}:</strong> {patient.medical_notes}
                        </Col>
                      </Row>
                    )}
                    {patient.assigned_dietitian && (
                      <Row className="mb-2">
                        <Col>
                          <strong>👨‍⚕️ {t('patients.assignedDietitian')}:</strong><br />
                          {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header>
                    <h5 className="mb-0">📊 {t('patients.visitSummary')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col sm={6}>
                        <strong>{t('patients.totalVisits')}:</strong><br />
                        {patient.visits?.length || 0}
                      </Col>
                      <Col sm={6}>
                        <strong>{t('patients.completedVisits')}:</strong><br />
                        {patient.visits?.filter(v => v.status === 'COMPLETED').length || 0}
                      </Col>
                    </Row>
                    <Row className="mt-2">
                      <Col sm={6}>
                        <strong>{t('patients.measurements')}:</strong><br />
                        {allMeasurements.length}
                      </Col>
                      <Col sm={6}>
                        <strong>{t('patients.lastVisit')}:</strong><br />
                        {patient.visits?.length > 0
                          ? formatDate(new Date(Math.max(...patient.visits.map(v => new Date(v.visit_date)))), i18n.language)
                          : t('patients.none')
                        }
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          {/* Measurements Tab */}
          <Tab eventKey="measurements" title={`📈 ${t('patients.measurementsTab')}`}>
            <div className="measurements-charts">
              <Row>
                <Col md={6} className="mb-4">
                  <Card>
                    <Card.Header>
                      <h6>⚖️ {t('patients.weightTracking')}</h6>
                    </Card.Header>
                    <Card.Body>
                      {prepareChartData(allMeasurements, 'weight_kg') ? (
                        <Line
                          data={prepareChartData(allMeasurements, 'weight_kg')}
                          options={chartOptions(t('patients.weightTracking'), t('visits.weight'))}
                        />
                      ) : (
                        <div className="text-center text-muted py-4">
                          {t('patients.noWeightData')}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6} className="mb-4">
                  <Card>
                    <Card.Header>
                      <h6>📏 {t('patients.bmiTracking')}</h6>
                    </Card.Header>
                    <Card.Body>
                      {prepareChartData(allMeasurements, 'bmi') ? (
                        <Line
                          data={prepareChartData(allMeasurements, 'bmi')}
                          options={chartOptions(t('patients.bmiTracking'), 'BMI')}
                        />
                      ) : (
                        <div className="text-center text-muted py-4">
                          {t('patients.noBmiData')}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col md={6} className="mb-4">
                  <Card>
                    <Card.Header>
                      <h6>🩸 {t('patients.bloodPressure')}</h6>
                    </Card.Header>
                    <Card.Body>
                      {prepareChartData(allMeasurements, 'blood_pressure_systolic') ? (
                        <Line
                          data={{
                            labels: allMeasurements
                              .filter(m => m.blood_pressure_systolic)
                              .map(m => formatDate(m.created_at, i18n.language)),
                            datasets: [
                              {
                                label: t('patients.systolic'),
                                data: allMeasurements
                                  .filter(m => m.blood_pressure_systolic)
                                  .map(m => m.blood_pressure_systolic),
                                borderColor: 'rgb(255, 99, 132)',
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                              },
                              {
                                label: t('patients.diastolic'),
                                data: allMeasurements
                                  .filter(m => m.blood_pressure_diastolic)
                                  .map(m => m.blood_pressure_diastolic),
                                borderColor: 'rgb(54, 162, 235)',
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                              }
                            ]
                          }}
                          options={chartOptions(t('patients.bloodPressure'), 'Pressure (mmHg)')}
                        />
                      ) : (
                        <div className="text-center text-muted py-4">
                          {t('patients.noBloodPressureData')}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6} className="mb-4">
                  <Card>
                    <Card.Header>
                      <h6>📏 {t('patients.bodyComposition')}</h6>
                    </Card.Header>
                    <Card.Body>
                      {prepareChartData(allMeasurements, 'body_fat_percentage') ? (
                        <Bar
                          data={{
                            labels: allMeasurements
                              .filter(m => m.body_fat_percentage)
                              .map(m => formatDate(m.created_at, i18n.language)),
                            datasets: [
                              {
                                label: t('patients.bodyFatPercentage'),
                                data: allMeasurements
                                  .filter(m => m.body_fat_percentage)
                                  .map(m => m.body_fat_percentage),
                                backgroundColor: 'rgba(255, 206, 86, 0.6)',
                                borderColor: 'rgba(255, 206, 86, 1)',
                                borderWidth: 1,
                              },
                              {
                                label: t('patients.muscleMassPercentage'),
                                data: allMeasurements
                                  .filter(m => m.muscle_mass_percentage)
                                  .map(m => m.muscle_mass_percentage),
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1,
                              }
                            ]
                          }}
                          options={chartOptions(t('patients.bodyComposition'), 'Percentage (%)')}
                        />
                      ) : (
                        <div className="text-center text-muted py-4">
                          {t('patients.noBodyCompositionData')}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </Tab>

          {/* Visits Tab */}
          <Tab eventKey="visits" title={`🏥 ${t('patients.visitHistory')}`}>
            <div className="visits-history">
              {patient.visits && patient.visits.length > 0 ? (
                patient.visits.map(visit => (
                  <Card key={visit.id} className="mb-3">
                    <Card.Header>
                      <Row>
                        <Col>
                          <h6 className="mb-0">
                            📅 {formatDate(visit.visit_date, i18n.language)} - {visit.visit_type || t('visits.visit')}
                          </h6>
                        </Col>
                        <Col xs="auto">
                          <Badge bg={
                            visit.status === 'COMPLETED' ? 'success' :
                            visit.status === 'SCHEDULED' ? 'warning' :
                            visit.status === 'CANCELLED' ? 'danger' : 'secondary'
                          }>
                            {getStatusText(visit.status)}
                          </Badge>
                        </Col>
                      </Row>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          {visit.chief_complaint && (
                            <div className="mb-2">
                              <strong>{t('patients.chiefComplaint')}:</strong> {visit.chief_complaint}
                            </div>
                          )}
                          {visit.assessment && (
                            <div className="mb-2">
                              <strong>{t('patients.assessment')}:</strong> {visit.assessment}
                            </div>
                          )}
                          {visit.recommendations && (
                            <div className="mb-2">
                              <strong>{t('patients.recommendations')}:</strong> {visit.recommendations}
                            </div>
                          )}
                        </Col>
                        <Col md={6}>
                          {visit.measurements && visit.measurements.length > 0 && (
                            <div>
                              <strong>📊 {t('patients.measurements')}:</strong>
                              <ul className="list-unstyled mt-2">
                                {visit.measurements.map(measurement => (
                                  <li key={measurement.id} className="small">
                                    {measurement.weight_kg && `${t('visits.weight')}: ${measurement.weight_kg}kg `}
                                    {measurement.bmi && `BMI: ${measurement.bmi} `}
                                    {measurement.blood_pressure_systolic && `${t('visits.bloodPressure')}: ${measurement.blood_pressure_systolic}/${measurement.blood_pressure_diastolic} `}
                                    <span className="text-muted">
                                      ({formatDate(measurement.created_at, i18n.language)})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Alert variant="info">
                  <strong>{t('patients.noVisitsYet')}</strong> - {t('patients.noVisitsMessage')}
                </Alert>
              )}
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        {onScheduleVisit && patient && (
          <button
            className="btn btn-success me-2"
            onClick={() => onScheduleVisit(patient)}
          >
            📅 {t('patients.scheduleVisit')}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onHide}>
          {t('common.close')}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default PatientDetailModal;