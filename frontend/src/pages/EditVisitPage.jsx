/**
 * EditVisitPage Component
 * Full page for editing existing visits with measurements
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import userService from '../services/userService';
import CustomFieldInput from '../components/CustomFieldInput';

const EditVisitPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [visit, setVisit] = useState(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    dietitian_id: '',
    visit_date: '',
    visit_type: '',
    duration_minutes: '',
    status: 'SCHEDULED',
    next_visit_date: ''
  });

  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [dietitians, setDietitians] = useState([]);

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      fetchVisitData();
      fetchCustomFields();
      fetchDietitians();
    }
  }, [id, i18n.resolvedLanguage]);

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

  const fetchVisitData = async () => {
    try {
      setLoading(true);
      const response = await visitService.getVisitById(id);
      const visitData = response.data.data || response.data;
      setVisit(visitData);

      // Pre-populate form with visit data
      const formattedVisitDate = visitData.visit_date
        ? new Date(visitData.visit_date).toISOString().slice(0, 16)
        : '';
      const formattedNextVisitDate = visitData.next_visit_date
        ? new Date(visitData.next_visit_date).toISOString().slice(0, 16)
        : '';

      setFormData({
        patient_id: visitData.patient_id || '',
        dietitian_id: visitData.dietitian_id || '',
        visit_date: formattedVisitDate,
        visit_type: visitData.visit_type || '',
        duration_minutes: visitData.duration_minutes || '',
        status: visitData.status || 'SCHEDULED',
        next_visit_date: formattedNextVisitDate
      });

      setError(null);
    } catch (err) {
      // setError('{t('visits.failedToLoadVisit')}: ' + (err.response?.data?.error || err.message));
      setError(t('visits.failedToLoadVisit') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching visit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleCustomFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [definitionId]: value
    }));
    // Clear any error for this field
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[definitionId];
      return newErrors;
    });
  };

  const handleBack = () => {
    navigate('/visits');
  };

  const validateForm = () => {
    if (!formData.patient_id || !formData.dietitian_id || !formData.visit_date) {
      setError('Patient, dietitian, and visit date are required');
      setActiveTab('visit');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      // Step 1: Update visit data
      const submitData = {
        ...formData,
        visit_date: new Date(formData.visit_date).toISOString(),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? new Date(formData.next_visit_date).toISOString()
          : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
      };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') submitData[key] = null;
      });

      await visitService.updateVisit(id, submitData);

      // Step 2: Save custom fields
      const customFieldsToSave = [];
      customFieldCategories.forEach(category => {
        category.fields.forEach(field => {
          if (fieldValues[field.definition_id] !== undefined && fieldValues[field.definition_id] !== null && fieldValues[field.definition_id] !== '') {
            customFieldsToSave.push({
              definition_id: field.definition_id,
              value: fieldValues[field.definition_id]
            });
          }
        });
      });

      if (customFieldsToSave.length > 0) {
        try {
          await visitCustomFieldService.updateVisitCustomFields(id, customFieldsToSave);
          console.log('✅ Custom fields saved successfully');
        } catch (customFieldError) {
          console.error('❌ Error saving custom fields:', customFieldError);
          // Don't throw error, just log it
        }
      }

      navigate('/visits');
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || 'Failed to update visit';
      setError(errorMsg);
      console.error('Error updating visit:', err);
    } finally {
      setSaving(false);
    }
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

  if (!canEditVisit) {
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

  if (error && !visit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>Error Loading Visit</Alert.Heading>
            <p>{error}</p>
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
            <h1 className="mb-0">
              {t('visits.editVisit')}
              {visit?.patient && ` - ${visit.patient.first_name} ${visit.patient.last_name}`}
            </h1>
            <p className="text-muted">
              {visit?.visit_date && new Date(visit.visit_date).toLocaleString()}
            </p>
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
                            <Form.Label>Patient</Form.Label>
                            <Form.Control
                              type="text"
                              value={visit?.patient
                                ? `${visit.patient.first_name} ${visit.patient.last_name}`
                                : ''
                              }
                              disabled
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Patient cannot be changed after visit creation
                            </Form.Text>
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
                              {dietitians.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.first_name && d.last_name
                                    ? `${d.first_name} ${d.last_name}`
                                    : d.username}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.visitDateTime')} *</Form.Label>
                            <div className="d-flex gap-2">
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
                            </div>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.visitType')}</Form.Label>
                            <Form.Select
                              name="visit_type"
                              value={formData.visit_type}
                              onChange={handleInputChange}
                            >
                              <option value="">Select type</option>
                              <option value="Initial Consultation">Initial Consultation</option>
                              <option value="Follow-up">Follow-up</option>
                              <option value="Final Assessment">Final Assessment</option>
                              <option value="Nutrition Counseling">Nutrition Counseling</option>
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
                          <h6 className="mb-0">Status & Schedule</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                              <option value="SCHEDULED">Scheduled</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="NO_SHOW">No Show</option>
                            </Form.Select>
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
                              {t('visits.scheduleFollowUp', 'Schedule a follow-up appointment')}
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
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
                              <CustomFieldInput
                                fieldDefinition={field}
                                value={fieldValues[field.definition_id]}
                                onChange={handleCustomFieldChange}
                                error={fieldErrors[field.definition_id]}
                              />
                            </Col>
                          ))}
                        </Row>
                      )}
                    </div>
                  </Tab>
                ))}
              </Tabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={handleBack} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? t('patients.updating') : t('visits.saveChanges')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default EditVisitPage;
