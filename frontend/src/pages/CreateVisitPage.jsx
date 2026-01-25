/**
 * CreateVisitPage Component
 * Full page for creating new visits with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import userService from '../services/userService';

const CreateVisitPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [completeImmediately, setCompleteImmediately] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    dietitian_id: '',
    visit_date: '',
    visit_type: '',
    duration_minutes: '',
    status: 'SCHEDULED',
    next_visit_date: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchDietitians();

    // Handle pre-selected patient from navigation
    if (location.state?.selectedPatient) {
      const patient = location.state.selectedPatient;
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id,
        dietitian_id: patient.assigned_dietitian?.id || ''
      }));
    }
  }, [location.state]);

  // Set default duration when visit type changes
  useEffect(() => {
    if (formData.visit_type) {
      const durationMap = {
        'Initial Consultation': 60,
        'Follow-up': 30,
        'Final Assessment': 30,
        'Nutrition Counseling': 45,
        'Other': 60
      };
      const defaultDuration = durationMap[formData.visit_type];
      if (defaultDuration && !formData.duration_minutes) {
        setFormData(prev => ({ ...prev, duration_minutes: defaultDuration }));
      }
    }
  }, [formData.visit_type]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients({ limit: 1000 });
      const data = response.data?.data || response.data || response;
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchDietitians = async () => {
    try {
      const response = await userService.getDietitians();
      const data = response.data?.data || response.data || [];
      setDietitians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching dietitians:', err);
      setDietitians([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };

  // Helper to extract date and time parts from datetime string
  const extractDateTimeParts = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '', hour: '09', minute: '00' };
    const [datePart, timePart] = dateTimeStr.split('T');
    const [hour, minute] = (timePart || '09:00').split(':');
    return { date: datePart || '', hour: hour || '09', minute: minute || '00' };
  };

  // Helper to combine date and time parts into datetime string
  const combineDateTimeParts = (date, hour, minute) => {
    if (!date) return '';
    return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  };

  // Handle date/time component changes
  const handleDateTimeChange = (field, component, value) => {
    const current = extractDateTimeParts(formData[field]);
    let newDateTime;

    if (component === 'date') {
      newDateTime = combineDateTimeParts(value, current.hour, current.minute);
    } else if (component === 'hour') {
      newDateTime = combineDateTimeParts(current.date, value, current.minute);
    } else if (component === 'minute') {
      newDateTime = combineDateTimeParts(current.date, current.hour, value);
    }

    setFormData(prev => ({ ...prev, [field]: newDateTime }));
    setError(null);
  };

  const handleBack = () => {
    navigate('/visits');
  };

  const setToNow = () => {
    // Get current time in Paris timezone (Europe/Paris)
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

    const year = parisTime.getFullYear();
    const month = String(parisTime.getMonth() + 1).padStart(2, '0');
    const day = String(parisTime.getDate()).padStart(2, '0');
    const hour = String(parisTime.getHours()).padStart(2, '0');

    // Round minutes to nearest 15-minute interval
    const minutes = parisTime.getMinutes();
    const roundedMinutes = String(Math.round(minutes / 15) * 15 % 60).padStart(2, '0');

    const formattedNow = `${year}-${month}-${day}T${hour}:${roundedMinutes}`;

    setFormData(prev => ({ ...prev, visit_date: formattedNow }));
  };

  const validateForm = () => {
    if (!formData.patient_id || !formData.dietitian_id || !formData.visit_date) {
      setError(t('visits.requiredFieldsError'));
      setActiveTab('visit');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        visit_date: new Date(formData.visit_date).toISOString(),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? new Date(formData.next_visit_date).toISOString()
          : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        status: completeImmediately ? 'COMPLETED' : formData.status
      };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') submitData[key] = null;
      });

      const response = await visitService.createVisit(submitData);
      const savedVisit = response.data;

      // If completed immediately, navigate to billing page
      if (completeImmediately && savedVisit) {
        if (savedVisit.created_invoice) {
          navigate(`/billing/${savedVisit.created_invoice.id}`);
        } else {
          navigate('/billing', { state: { refreshFromVisit: true, visitId: savedVisit.id } });
        }
      } else {
        navigate('/visits');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || t('errors.failedToCreateVisit');
      setError(errorMsg);
      console.error('Error creating visit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  const canCreateVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';

  if (!canCreateVisit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.accessDenied')}</Alert.Heading>
            <p>{t('visits.noPermissionEdit')}</p>
            <Button variant="outline-danger" onClick={handleBack}>
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
            <h1 className="mb-0">{t('visits.scheduleNewVisit')}</h1>
            <p className="text-muted">{t('visits.enterVisitDetails')}</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form Tabs */}
        <Form onSubmit={handleSubmit}>
          <Card>
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                {/* Visit Information Tab */}
                <Tab eventKey="visit" title={`📅 ${t('visits.visitInformationTab')}`}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-primary text-white">
                          <h6 className="mb-0">{t('visits.basicDetails')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.patient')} *</Form.Label>
                            <Form.Select
                              name="patient_id"
                              value={formData.patient_id}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">{t('visits.selectPatient')}</option>
                              {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.first_name} {patient.last_name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.dietitian')} *</Form.Label>
                            <Form.Select
                              name="dietitian_id"
                              value={formData.dietitian_id}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">{t('visits.selectDietitian')}</option>
                              {dietitians.map(dietitian => {
                                const displayName = dietitian.first_name || dietitian.last_name
                                  ? `${dietitian.first_name || ''} ${dietitian.last_name || ''}`.trim()
                                  : dietitian.username;
                                return (
                                  <option key={dietitian.id} value={dietitian.id}>
                                    {displayName}
                                  </option>
                                );
                              })}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.visitDateTime')} *</Form.Label>
                            <div className="d-flex gap-2 align-items-center">
                              <Form.Control
                                type="date"
                                value={extractDateTimeParts(formData.visit_date).date}
                                onChange={(e) => handleDateTimeChange('visit_date', 'date', e.target.value)}
                                required
                                style={{ flex: 2 }}
                              />
                              <Form.Select
                                value={extractDateTimeParts(formData.visit_date).hour}
                                onChange={(e) => handleDateTimeChange('visit_date', 'hour', e.target.value)}
                                required
                                style={{ flex: 1 }}
                              >
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, '0')}>
                                    {String(i).padStart(2, '0')}h
                                  </option>
                                ))}
                              </Form.Select>
                              <Form.Select
                                value={extractDateTimeParts(formData.visit_date).minute}
                                onChange={(e) => handleDateTimeChange('visit_date', 'minute', e.target.value)}
                                required
                                style={{ flex: 1 }}
                              >
                                <option value="00">00</option>
                                <option value="15">15</option>
                                <option value="30">30</option>
                                <option value="45">45</option>
                              </Form.Select>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={setToNow}
                                title={t('visits.setToNow', 'Set to current time (Paris)')}
                              >
                                🕐
                              </Button>
                            </div>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.visitType')}</Form.Label>
                            <Form.Select
                              name="visit_type"
                              value={formData.visit_type}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('visits.selectType')}</option>
                              <option value="Initial Consultation">{t('visits.initialConsultation')}</option>
                              <option value="Follow-up">{t('visits.followUp')}</option>
                              <option value="Final Assessment">{t('visits.finalAssessment')}</option>
                              <option value="Nutrition Counseling">{t('visits.nutritionCounseling')}</option>
                              <option value="Other">Other</option>
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.duration')}</Form.Label>
                            <Form.Control
                              type="number"
                              name="duration_minutes"
                              value={formData.duration_minutes}
                              onChange={handleInputChange}
                              placeholder="e.g., 60"
                              min="1"
                              max="480"
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">{t('visits.options')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              name="completeImmediately"
                              label={t('visits.completeImmediately')}
                              checked={completeImmediately}
                              onChange={(e) => setCompleteImmediately(e.target.checked)}
                            />
                            <Form.Text className="text-muted">
                              {t('visits.completeImmediatelyHelp')}
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.nextVisitDate')}</Form.Label>
                            <div className="d-flex gap-2">
                              <Form.Control
                                type="date"
                                value={extractDateTimeParts(formData.next_visit_date).date}
                                onChange={(e) => handleDateTimeChange('next_visit_date', 'date', e.target.value)}
                                style={{ flex: 2 }}
                              />
                              <Form.Select
                                value={extractDateTimeParts(formData.next_visit_date).hour}
                                onChange={(e) => handleDateTimeChange('next_visit_date', 'hour', e.target.value)}
                                style={{ flex: 1 }}
                                disabled={!extractDateTimeParts(formData.next_visit_date).date}
                              >
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, '0')}>
                                    {String(i).padStart(2, '0')}h
                                  </option>
                                ))}
                              </Form.Select>
                              <Form.Select
                                value={extractDateTimeParts(formData.next_visit_date).minute}
                                onChange={(e) => handleDateTimeChange('next_visit_date', 'minute', e.target.value)}
                                style={{ flex: 1 }}
                                disabled={!extractDateTimeParts(formData.next_visit_date).date}
                              >
                                <option value="00">00</option>
                                <option value="15">15</option>
                                <option value="30">30</option>
                                <option value="45">45</option>
                              </Form.Select>
                            </div>
                            <Form.Text className="text-muted">
                              {t('visits.scheduleFollowUp')}
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

              </Tabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={handleBack} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? t('visits.creatingVisit') : t('visits.createVisit')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default CreateVisitPage;
