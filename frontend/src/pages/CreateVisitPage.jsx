/**
 * CreateVisitPage Component
 * Full page for creating new visits with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import { getPatients } from '../services/patientService';
import { getCategories } from '../services/customFieldService';
import { getMeasureDefinitions, logPatientMeasure, getAllMeasureTranslations } from '../services/measureService';
import { fetchMeasureTranslations } from '../utils/measureTranslations';
import userService from '../services/userService';
import CustomFieldInput from '../components/CustomFieldInput';

const CreateVisitPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [completeImmediately, setCompleteImmediately] = useState(false);

  // Custom fields state
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Measures state
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [measureValues, setMeasureValues] = useState({});

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
    fetchVisitCustomFieldCategories();
    fetchMeasureDefinitions();

    // Handle pre-selected patient from navigation
    if (location.state?.selectedPatient) {
      const patient = location.state.selectedPatient;
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id,
        dietitian_id: patient.assigned_dietitian?.id || ''
      }));
    }
  }, [location.state, i18n.resolvedLanguage]);

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

  const fetchVisitCustomFieldCategories = async () => {
    try {
      let language = i18n.resolvedLanguage || i18n.language;
      if (!language) {
        language = localStorage.getItem('i18nextLng') || 'fr';
      }

      // Fetch all categories with their field definitions
      const categories = await getCategories({ is_active: true, language });

      // Filter to only include categories that apply to visits
      const visitCategories = (categories || []).filter(category => {
        let entityTypes = category.entity_types || ['patient'];
        // Parse if it's a string (shouldn't happen but just in case)
        if (typeof entityTypes === 'string') {
          try {
            entityTypes = JSON.parse(entityTypes);
          } catch (e) {
            entityTypes = ['patient'];
          }
        }
        return Array.isArray(entityTypes) && entityTypes.includes('visit');
      });


      // Transform field_definitions to fields format (matching EditVisitPage structure)
      const transformedCategories = visitCategories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        display_order: category.display_order,
        color: category.color || '#3498db',
        fields: (category.field_definitions || []).map(def => {
          // Safely parse JSON fields
          let validationRules = def.validation_rules;
          let selectOptions = def.select_options;

          // Parse validation_rules if it's a string
          if (typeof validationRules === 'string' && validationRules) {
            try {
              validationRules = JSON.parse(validationRules);
            } catch (e) {
              validationRules = {};
            }
          }

          // Parse select_options if it's a string
          if (typeof selectOptions === 'string' && selectOptions) {
            try {
              selectOptions = JSON.parse(selectOptions);
            } catch (e) {
              selectOptions = [];
            }
          }

          // Ensure select_options is an array
          if (!Array.isArray(selectOptions)) {
            selectOptions = selectOptions ? [selectOptions] : [];
          }

          return {
            definition_id: def.id,
            field_name: def.field_name,
            field_label: def.field_label,
            field_type: def.field_type,
            is_required: def.is_required,
            validation_rules: validationRules || {},
            select_options: selectOptions,
            help_text: def.help_text,
            display_order: def.display_order,
            value: null
          };
        })
      }));

      setCustomFieldCategories(transformedCategories);
    } catch (err) {
      console.error('Error fetching visit custom field categories:', err);
      // Don't set error for custom fields failure - form should still be usable
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

  const fetchMeasureDefinitions = async () => {
    try {
      const data = await getMeasureDefinitions({ is_active: true });
      setMeasureDefinitions(data || []);

      // Fetch translations for all measure definitions
      if (data && data.length > 0) {
        const measureIds = data.map(m => m.id);
        const translations = await fetchMeasureTranslations(measureIds, getAllMeasureTranslations);
        setMeasureTranslations(translations);
      }
    } catch (err) {
      console.error('Error fetching measure definitions:', err);
    }
  };

  const handleMeasureChange = (definitionId, value) => {
    setMeasureValues(prev => ({
      ...prev,
      [definitionId]: value
    }));
  };

  // Get translated display name for a measure
  const getTranslatedMeasureName = (definition) => {
    const currentLang = i18n.language || 'fr';
    const translations = measureTranslations[definition.id]?.[currentLang];
    return translations?.display_name || definition.display_name || definition.name;
  };

  // Get translated unit for a measure
  const getTranslatedMeasureUnit = (definition) => {
    const currentLang = i18n.language || 'fr';
    const translations = measureTranslations[definition.id]?.[currentLang];
    return translations?.unit || definition.unit;
  };

  // Group measure definitions by category
  const groupedMeasures = measureDefinitions.reduce((acc, def) => {
    const category = def.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(def);
    return acc;
  }, {});

  const measureCategoryLabels = {
    vitals: t('measures.categories.vitals', 'Vitals'),
    anthropometric: t('measures.categories.anthropometric', 'Anthropometric'),
    lab_results: t('measures.categories.labResults', 'Lab Results'),
    symptoms: t('measures.categories.symptoms', 'Symptoms'),
    lifestyle: t('measures.categories.lifestyle', 'Lifestyle'),
    other: t('measures.categories.other', 'Other')
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
    const missingFields = [];

    if (!formData.patient_id) {
      missingFields.push(t('visits.patient', 'Patient'));
    }
    if (!formData.dietitian_id) {
      missingFields.push(t('visits.dietitian', 'Dietitian'));
    }
    if (!formData.visit_date) {
      missingFields.push(t('visits.visitDateTime', 'Visit date/time'));
    }

    if (missingFields.length > 0) {
      const errorMessage = t('visits.requiredFieldsMissing', 'Please fill in the required fields: {{fields}}', {
        fields: missingFields.join(', ')
      });
      setError(errorMessage);
      setActiveTab('visit');

      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });

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
      const savedVisit = response.data?.data || response.data;

      console.log('[CreateVisit] Visit created:', savedVisit);
      console.log('[CreateVisit] Field values to save:', fieldValues);
      console.log('[CreateVisit] Measure values to save:', measureValues);

      // Save custom field values if any were filled
      if (savedVisit && savedVisit.id && Object.keys(fieldValues).length > 0) {
        try {
          const fieldsToSave = Object.entries(fieldValues)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([definitionId, value]) => ({
              definition_id: definitionId,
              value
            }));

          console.log('[CreateVisit] Fields to save:', fieldsToSave);

          if (fieldsToSave.length > 0) {
            const cfResult = await visitCustomFieldService.updateVisitCustomFields(savedVisit.id, fieldsToSave);
            console.log('[CreateVisit] Custom fields saved:', cfResult);
          }
        } catch (cfErr) {
          console.error('[CreateVisit] Error saving custom fields:', cfErr);
          // Don't block navigation, custom fields are not critical
        }
      }

      // Save measure values if any were filled
      if (savedVisit && savedVisit.id && formData.patient_id && Object.keys(measureValues).length > 0) {
        try {
          const measuresToSave = Object.entries(measureValues)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '');

          console.log('[CreateVisit] Measures to save:', measuresToSave);

          for (const [definitionId, value] of measuresToSave) {
            const definition = measureDefinitions.find(d => d.id === definitionId);
            if (!definition) continue;

            const payload = {
              measure_definition_id: definitionId,
              visit_id: savedVisit.id,
              measured_at: new Date().toISOString()
            };

            // Set the appropriate value field based on measure type
            switch (definition.measure_type) {
              case 'numeric':
              case 'calculated':
                payload.numeric_value = parseFloat(value);
                break;
              case 'text':
                payload.text_value = value;
                break;
              case 'boolean':
                payload.boolean_value = value;
                break;
              default:
                payload.numeric_value = parseFloat(value);
            }

            const measureResult = await logPatientMeasure(formData.patient_id, payload);
            console.log('[CreateVisit] Measure saved:', measureResult);
          }
        } catch (measureErr) {
          console.error('[CreateVisit] Error saving measures:', measureErr);
          // Don't block navigation, measures are not critical
        }
      }

      // If completed immediately, navigate to billing page
      if (completeImmediately && savedVisit) {
        if (savedVisit.created_invoice) {
          navigate(`/billing/${savedVisit.created_invoice.id}`);
        } else {
          navigate('/billing', { state: { refreshFromVisit: true, visitId: savedVisit.id } });
        }
      } else if (savedVisit?.id) {
        navigate(`/visits/${savedVisit.id}`);
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
                    <Col xs={12} md={6}>
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
                            <div className="d-flex gap-2 align-items-center flex-wrap">
                              <Form.Control
                                type="date"
                                value={extractDateTimeParts(formData.visit_date).date}
                                onChange={(e) => handleDateTimeChange('visit_date', 'date', e.target.value)}
                                required
                                className="flex-grow-1"
                                style={{ minWidth: '140px' }}
                              />
                              <div className="d-flex gap-2 align-items-center">
                                <Form.Select
                                  value={extractDateTimeParts(formData.visit_date).hour}
                                  onChange={(e) => handleDateTimeChange('visit_date', 'hour', e.target.value)}
                                  required
                                  style={{ width: '75px' }}
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
                                  style={{ width: '65px' }}
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
                              <option value="Other">{t('visits.other', 'Other')}</option>
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

                    <Col xs={12} md={6}>
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
                            <div className="d-flex gap-2 flex-wrap">
                              <Form.Control
                                type="date"
                                value={extractDateTimeParts(formData.next_visit_date).date}
                                onChange={(e) => handleDateTimeChange('next_visit_date', 'date', e.target.value)}
                                className="flex-grow-1"
                                style={{ minWidth: '140px' }}
                              />
                              <div className="d-flex gap-2">
                                <Form.Select
                                  value={extractDateTimeParts(formData.next_visit_date).hour}
                                  onChange={(e) => handleDateTimeChange('next_visit_date', 'hour', e.target.value)}
                                  style={{ width: '75px' }}
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
                                  style={{ width: '65px' }}
                                  disabled={!extractDateTimeParts(formData.next_visit_date).date}
                                >
                                  <option value="00">00</option>
                                  <option value="15">15</option>
                                  <option value="30">30</option>
                                  <option value="45">45</option>
                                </Form.Select>
                              </div>
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

                {/* Custom Field Category Tabs */}
                {customFieldCategories.length > 0 && customFieldCategories.map((category) => (
                  <Tab
                    key={category.id}
                    eventKey={`category-${category.id}`}
                    title={
                      <span>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: category.color || '#3498db',
                            marginRight: '6px'
                          }}
                        />
                        {category.name}
                      </span>
                    }
                  >
                    {category.fields && category.fields.length > 0 ? (
                      <Row>
                        {category.fields.map(field => (
                          <Col key={field.definition_id} xs={12} md={6}>
                            <CustomFieldInput
                              fieldDefinition={field}
                              value={fieldValues[field.definition_id]}
                              onChange={handleCustomFieldChange}
                              error={fieldErrors[field.definition_id]}
                            />
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <p className="text-muted">{t('customFields.noFieldsInCategory', 'No fields defined in this category.')}</p>
                    )}
                  </Tab>
                ))}

                {/* Measures Tab */}
                {measureDefinitions.length > 0 && (
                  <Tab eventKey="measures" title={`📏 ${t('measures.healthMeasures', 'Measures')}`}>
                    <Alert variant="info" className="mb-3">
                      {t('measures.createVisitMeasuresInfo', 'You can optionally record health measurements for this visit. Leave empty if not needed.')}
                    </Alert>
                    {Object.keys(groupedMeasures).map(category => (
                      <Card key={category} className="mb-3">
                        <Card.Header className="bg-light">
                          <strong>{measureCategoryLabels[category] || category}</strong>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            {groupedMeasures[category].map(definition => (
                              <Col key={definition.id} xs={12} sm={6} lg={4}>
                                <Form.Group className="mb-3">
                                  <Form.Label>
                                    {getTranslatedMeasureName(definition)}
                                    {(getTranslatedMeasureUnit(definition)) && (
                                      <Badge bg="secondary" className="ms-2">{getTranslatedMeasureUnit(definition)}</Badge>
                                    )}
                                  </Form.Label>
                                  {definition.measure_type === 'boolean' ? (
                                    <Form.Check
                                      type="checkbox"
                                      checked={measureValues[definition.id] || false}
                                      onChange={(e) => handleMeasureChange(definition.id, e.target.checked)}
                                      label={t('measures.yesNo', 'Yes / No')}
                                    />
                                  ) : definition.measure_type === 'text' ? (
                                    <Form.Control
                                      type="text"
                                      value={measureValues[definition.id] || ''}
                                      onChange={(e) => handleMeasureChange(definition.id, e.target.value)}
                                      placeholder={definition.description || t('measures.enterValue', 'Enter value')}
                                    />
                                  ) : (
                                    <Form.Control
                                      type="number"
                                      step="any"
                                      value={measureValues[definition.id] || ''}
                                      onChange={(e) => handleMeasureChange(definition.id, e.target.value)}
                                      placeholder={definition.description || t('measures.enterValue', 'Enter value')}
                                      min={definition.min_value !== null ? definition.min_value : undefined}
                                      max={definition.max_value !== null ? definition.max_value : undefined}
                                    />
                                  )}
                                  {(definition.min_value !== null || definition.max_value !== null) && (
                                    <Form.Text className="text-muted">
                                      {definition.min_value !== null && definition.max_value !== null
                                        ? `${t('measures.range', 'Range')}: ${definition.min_value} - ${definition.max_value}`
                                        : definition.min_value !== null
                                        ? `${t('measures.minimum', 'Min')}: ${definition.min_value}`
                                        : `${t('measures.maximum', 'Max')}: ${definition.max_value}`
                                      }
                                    </Form.Text>
                                  )}
                                </Form.Group>
                              </Col>
                            ))}
                          </Row>
                        </Card.Body>
                      </Card>
                    ))}
                  </Tab>
                )}

              </Tabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
                <Button variant="outline-secondary" onClick={handleBack} disabled={loading}>
                  {t('common.cancel', 'Cancel')}
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
