/**
 * EditVisitPage Component
 * Full page for editing existing visits with measurements
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import ResponsiveTabs, { Tab } from '../components/ResponsiveTabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import visitCustomFieldService from '../services/visitCustomFieldService';
import userService from '../services/userService';
import { getMeasureDefinitions, getMeasuresByVisit, logPatientMeasure, updatePatientMeasure, getAllMeasureTranslations } from '../services/measureService';
import { fetchMeasureTranslations } from '../utils/measureTranslations';
import CustomFieldInput from '../components/CustomFieldInput';
import ConfirmModal from '../components/ConfirmModal';

const EditVisitPage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [visit, setVisit] = useState(null);

  // Track original values for change detection
  const [originalFieldValues, setOriginalFieldValues] = useState({});
  const [originalMeasureValues, setOriginalMeasureValues] = useState({});

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

  // Measures state
  const [measureDefinitions, setMeasureDefinitions] = useState([]);
  const [measureTranslations, setMeasureTranslations] = useState({});
  const [measureValues, setMeasureValues] = useState({});
  const [existingMeasureIds, setExistingMeasureIds] = useState({});

  // Finish visit confirm modal
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  useEffect(() => {
    if (i18n.resolvedLanguage) {
      fetchVisitData();
      fetchCustomFields();
      fetchDietitians();
      fetchMeasureDefinitions();
      fetchExistingMeasures();
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
      // Convert UTC dates to local time for display
      const formatDateForLocalDisplay = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Convert to local time and format as YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      const formattedVisitDate = visitData.visit_date
        ? formatDateForLocalDisplay(visitData.visit_date)
        : '';
      const formattedNextVisitDate = visitData.next_visit_date
        ? formatDateForLocalDisplay(visitData.next_visit_date)
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
      setOriginalFieldValues({ ...values }); // Store original values for change detection
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

  const fetchExistingMeasures = async () => {
    try {
      const measures = await getMeasuresByVisit(id);
      console.log('[EditVisit] Fetched measures for visit:', measures);
      // Build a map of definition_id -> value and track existing measure IDs
      const values = {};
      const existingIds = {};
      (measures || []).forEach(m => {
        // Backend returns measure_definition.id, not measure_definition_id
        const defId = m.measure_definition?.id || m.measure_definition_id;
        if (!defId) {
          console.warn('[EditVisit] Measure missing definition ID:', m);
          return;
        }
        // Backend returns 'value' which is already extracted based on type
        if (m.value !== null && m.value !== undefined) {
          values[defId] = m.value;
        }
        existingIds[defId] = m.id;
      });
      console.log('[EditVisit] Parsed measure values:', values);
      console.log('[EditVisit] Existing measure IDs:', existingIds);
      setMeasureValues(values);
      setOriginalMeasureValues({ ...values }); // Store original values for change detection
      setExistingMeasureIds(existingIds);
    } catch (err) {
      console.error('Error fetching existing measures:', err);
    }
  };

  const handleMeasureChange = (definitionId, value) => {
    setMeasureValues(prev => ({
      ...prev,
      [definitionId]: value
    }));
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

  /**
   * Generate a summary of all changes made during this visit
   */
  const generateChangeSummary = () => {
    const changes = [];
    const timestamp = new Date().toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');

    changes.push(`=== ${t('visits.visitSummaryTitle', 'Visit Summary')} ===`);
    changes.push(`${t('visits.completedAt', 'Completed at')}: ${timestamp}`);
    changes.push(`${t('visits.completedBy', 'Completed by')}: ${user?.username || 'Unknown'}`);
    changes.push('');

    // Check custom field changes
    const fieldChanges = [];
    customFieldCategories.forEach(category => {
      category.fields.forEach(field => {
        const originalValue = originalFieldValues[field.definition_id];
        const currentValue = fieldValues[field.definition_id];

        // Check if value changed (handle null/undefined/empty string as equivalent)
        const originalNormalized = originalValue ?? '';
        const currentNormalized = currentValue ?? '';

        if (String(originalNormalized) !== String(currentNormalized)) {
          const fieldLabel = field.field_label || field.field_name || field.definition_id;
          if (originalNormalized === '' && currentNormalized !== '') {
            fieldChanges.push(`  + ${fieldLabel}: ${currentNormalized}`);
          } else if (originalNormalized !== '' && currentNormalized === '') {
            fieldChanges.push(`  - ${fieldLabel}: (${t('visits.removed', 'removed')})`);
          } else {
            fieldChanges.push(`  ~ ${fieldLabel}: ${originalNormalized} → ${currentNormalized}`);
          }
        }
      });
    });

    if (fieldChanges.length > 0) {
      changes.push(`📋 ${t('visits.customFieldChanges', 'Custom Field Changes')}:`);
      changes.push(...fieldChanges);
      changes.push('');
    }

    // Check measure changes
    const measureChanges = [];
    Object.entries(measureValues).forEach(([defId, currentValue]) => {
      const originalValue = originalMeasureValues[defId];
      const definition = measureDefinitions.find(d => d.id === defId);
      const measureName = definition ? getTranslatedMeasureName(definition) : defId;
      const unit = definition ? getTranslatedMeasureUnit(definition) : '';

      const originalNormalized = originalValue ?? '';
      const currentNormalized = currentValue ?? '';

      if (String(originalNormalized) !== String(currentNormalized)) {
        const unitStr = unit ? ` ${unit}` : '';
        if (originalNormalized === '' && currentNormalized !== '') {
          measureChanges.push(`  + ${measureName}: ${currentNormalized}${unitStr}`);
        } else if (originalNormalized !== '' && currentNormalized === '') {
          measureChanges.push(`  - ${measureName}: (${t('visits.removed', 'removed')})`);
        } else {
          measureChanges.push(`  ~ ${measureName}: ${originalNormalized}${unitStr} → ${currentNormalized}${unitStr}`);
        }
      }
    });

    if (measureChanges.length > 0) {
      changes.push(`📏 ${t('visits.measureChanges', 'Measure Changes')}:`);
      changes.push(...measureChanges);
      changes.push('');
    }

    // If no changes detected, add a note
    if (fieldChanges.length === 0 && measureChanges.length === 0) {
      changes.push(`ℹ️ ${t('visits.noChangesRecorded', 'No changes recorded during this visit')}`);
    }

    return changes.join('\n');
  };

  /**
   * Handle finish visit action - shows confirmation modal
   */
  const handleFinishVisit = () => {
    if (!validateForm()) return;
    setShowFinishConfirm(true);
  };

  /**
   * Confirm finish visit - saves all changes, sets status to COMPLETED, and generates summary
   */
  const confirmFinishVisit = async () => {
    setFinishing(true);
    setError(null);

    try {
      // Generate the change summary
      const visitSummary = generateChangeSummary();

      // Create ISO string that preserves local time as intended
      const createLocalISOString = (dateTimeStr) => {
        if (!dateTimeStr) return null;
        // Add seconds and milliseconds if not present, treat as local time
        return dateTimeStr.length === 16 ? dateTimeStr + ':00.000Z' : dateTimeStr + '.000Z';
      };

      // Step 1: Update visit data with COMPLETED status and summary
      const submitData = {
        ...formData,
        status: 'COMPLETED',
        visit_summary: visitSummary,
        visit_date: createLocalISOString(formData.visit_date),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? createLocalISOString(formData.next_visit_date)
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
        } catch (customFieldError) {
          console.error('Error saving custom fields:', customFieldError);
        }
      }

      // Step 3: Save measures (same logic as handleSubmit - update existing, create new)
      if (visit?.patient_id && Object.keys(measureValues).length > 0) {
        const measuresToSave = Object.entries(measureValues)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '');

        for (const [definitionId, value] of measuresToSave) {
          const definition = measureDefinitions.find(d => d.id === definitionId);
          if (!definition) continue;

          const existingMeasureId = existingMeasureIds[definitionId];

          // Build payload based on measure type
          const payload = {};
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

          try {
            if (existingMeasureId) {
              // UPDATE existing measure
              await updatePatientMeasure(existingMeasureId, payload);
            } else {
              // CREATE new measure
              const createPayload = {
                measure_definition_id: definitionId,
                visit_id: id,
                measured_at: new Date().toISOString(),
                ...payload
              };
              await logPatientMeasure(visit.patient_id, createPayload);
            }
          } catch (measureError) {
            console.error('Error saving measure:', measureError);
          }
        }
      }

      navigate(`/visits/${id}`);
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || t('visits.failedToFinishVisit', 'Failed to finish visit');
      setError(errorMsg);
      console.error('Error finishing visit:', err);
    } finally {
      setFinishing(false);
    }
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
        visit_date: createLocalISOString(formData.visit_date),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? createLocalISOString(formData.next_visit_date)
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

      // Step 3: Save measures (only values that have been set)
      if (visit?.patient_id && Object.keys(measureValues).length > 0) {
        const measuresToSave = Object.entries(measureValues)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '');

        console.log('[EditVisit] Measures to save:', measuresToSave);
        console.log('[EditVisit] Existing measure IDs:', existingMeasureIds);

        for (const [definitionId, value] of measuresToSave) {
          const definition = measureDefinitions.find(d => d.id === definitionId);
          if (!definition) continue;

          const existingMeasureId = existingMeasureIds[definitionId];

          // Build payload based on measure type
          const payload = {};
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

          try {
            if (existingMeasureId) {
              // UPDATE existing measure
              console.log(`[EditVisit] Updating existing measure ${existingMeasureId}`);
              await updatePatientMeasure(existingMeasureId, payload);
            } else {
              // CREATE new measure
              console.log(`[EditVisit] Creating new measure for definition ${definitionId}`);
              const createPayload = {
                measure_definition_id: definitionId,
                visit_id: id,
                measured_at: new Date().toISOString(),
                ...payload
              };
              await logPatientMeasure(visit.patient_id, createPayload);
            }
          } catch (measureError) {
            console.error('❌ Error saving measure:', measureError);
            // Don't throw, continue with other measures
          }
        }
      }

      navigate(`/visits/${id}`);
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
              <ResponsiveTabs activeKey={activeTab} onSelect={setActiveTab} id="edit-visit-tabs">
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
                            <div className="d-flex gap-2 flex-wrap">
                              <Form.Control
                                type="date"
                                value={extractDateTimeParts(formData.visit_date).date}
                                onChange={(e) => handleDateTimeChange('visit_date', 'date', e.target.value)}
                                required
                                className="flex-grow-1"
                                style={{ minWidth: '140px' }}
                              />
                              <div className="d-flex gap-2">
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
                      )}
                    </div>
                  </Tab>
                ))}

                {/* Measures Tab */}
                {measureDefinitions.length > 0 && (
                  <Tab eventKey="measures" title={`📏 ${t('measures.healthMeasures', 'Measures')}`}>
                    <Alert variant="info" className="mb-3">
                      {t('measures.editVisitMeasuresInfo', 'Record or update health measurements for this visit.')}
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
                                    {existingMeasureIds[definition.id] && (
                                      <Badge bg="success" className="ms-1" title={t('measures.alreadyRecorded', 'Already recorded')}>✓</Badge>
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
              </ResponsiveTabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
                <Button variant="outline-secondary" onClick={handleBack} disabled={saving || finishing}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button variant="primary" type="submit" disabled={saving || finishing}>
                    {saving ? t('patients.updating') : t('visits.saveChanges')}
                  </Button>
                  {formData.status === 'SCHEDULED' && (
                    <Button
                      variant="success"
                      onClick={handleFinishVisit}
                      disabled={saving || finishing}
                    >
                      {finishing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {t('visits.finishing', 'Finishing...')}
                        </>
                      ) : (
                        <>
                          ✅ {t('visits.finishVisit', 'Finish Visit')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Form>

        {/* Finish Visit Confirm Modal */}
        <ConfirmModal
          show={showFinishConfirm}
          onHide={() => setShowFinishConfirm(false)}
          onConfirm={confirmFinishVisit}
          title={t('common.confirmation', 'Confirmation')}
          message={t('visits.confirmFinishVisit', 'Are you sure you want to finish this visit? This will mark it as completed and generate a summary.')}
          confirmLabel={t('visits.finishVisit', 'Finish Visit')}
          variant="success"
        />
      </Container>
    </Layout>
  );
};

export default EditVisitPage;
