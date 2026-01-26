/**
 * LogMeasureModal Component
 * Modal form for quickly logging a single patient measure
 * Sprint 3: US-5.3.2 - Log Measure Values
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getMeasureDefinitions, logPatientMeasure, updatePatientMeasure, getMeasureValue } from '../services/measureService';

const LogMeasureModal = ({ show, onHide, patientId, visitId, measure, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingDefinitions, setLoadingDefinitions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const [selectedDefinition, setSelectedDefinition] = useState(null);

  const [formData, setFormData] = useState({
    measure_definition_id: '',
    value: '',
    measured_at: '',
    notes: ''
  });

  const loadDefinitions = useCallback(async () => {
    try {
      setLoadingDefinitions(true);
      const data = await getMeasureDefinitions({ is_active: true });
      setDefinitions(data);
    } catch (err) {
      console.error('Error loading measure definitions:', err);
      setError(t('measures.failedToLoadDefinitions', 'Failed to load measure definitions'));
    } finally {
      setLoadingDefinitions(false);
    }
  }, [t]);

  // Determine if we're in edit mode
  const isEditMode = Boolean(measure);

  // Load measure definitions on mount and populate form if editing
  useEffect(() => {
    if (show) {
      loadDefinitions();

      if (isEditMode && measure) {
        // Edit mode: populate form with existing measure data
        const measureDef = measure.measureDefinition || measure.MeasureDefinition;
        const value = getMeasureValue(measure, measureDef?.measure_type);

        // Format measured_at to datetime-local format
        const measuredAt = new Date(measure.measured_at);
        const year = measuredAt.getFullYear();
        const month = String(measuredAt.getMonth() + 1).padStart(2, '0');
        const day = String(measuredAt.getDate()).padStart(2, '0');
        const hours = String(measuredAt.getHours()).padStart(2, '0');
        const minutes = String(measuredAt.getMinutes()).padStart(2, '0');
        const formattedMeasuredAt = `${year}-${month}-${day}T${hours}:${minutes}`;

        setFormData({
          measure_definition_id: measure.measure_definition_id,
          value: value !== null && value !== undefined ? value : '',
          measured_at: formattedMeasuredAt,
          notes: measure.notes || ''
        });
        setSelectedDefinition(measureDef);
      } else {
        // Create mode: set default timestamp
        setDefaultMeasuredAt();
      }
    }
  }, [show, loadDefinitions, isEditMode, measure]);

  const setDefaultMeasuredAt = () => {
    // Set default measured_at to current date/time in datetime-local format (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`;

    setFormData(prev => ({ ...prev, measured_at: formattedNow }));
  };

  const handleDefinitionChange = (e) => {
    const definitionId = e.target.value;
    const definition = definitions.find(d => d.id === definitionId);

    setSelectedDefinition(definition);
    setFormData(prev => ({
      ...prev,
      measure_definition_id: definitionId,
      value: '' // Reset value when definition changes
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateValue = () => {
    if (!selectedDefinition) return true;

    const { measure_type, min_value, max_value } = selectedDefinition;

    // For numeric and calculated types, validate min/max
    if (measure_type === 'numeric' || measure_type === 'calculated') {
      const numValue = parseFloat(formData.value);

      if (isNaN(numValue)) {
        setError(t('measures.invalidNumericValue', 'Please enter a valid number'));
        return false;
      }

      if (min_value !== null && min_value !== undefined && numValue < min_value) {
        setError(t('measures.valueTooLow', `Value must be at least ${min_value}`));
        return false;
      }

      if (max_value !== null && max_value !== undefined && numValue > max_value) {
        setError(t('measures.valueTooHigh', `Value must be at most ${max_value}`));
        return false;
      }
    }

    // For text type, check if value is provided
    if (measure_type === 'text' && !formData.value.trim()) {
      setError(t('measures.textValueRequired', 'Please enter a text value'));
      return false;
    }

    return true;
  };

  const validateForm = () => {
    if (!formData.measure_definition_id) {
      setError(t('measures.definitionRequired', 'Please select a measure'));
      return false;
    }

    if (!formData.measured_at) {
      setError(t('measures.measuredAtRequired', 'Please select date and time'));
      return false;
    }

    // Boolean type doesn't need value validation (checkbox)
    if (selectedDefinition?.measure_type !== 'boolean' && !formData.value && formData.value !== false) {
      setError(t('measures.valueRequired', 'Please enter a value'));
      return false;
    }

    return validateValue();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Build payload based on measure type
      const payload = {
        measure_definition_id: formData.measure_definition_id,
        measured_at: formData.measured_at,
        notes: formData.notes.trim() || null
      };

      // Add visit_id if provided
      if (visitId) {
        payload.visit_id = visitId;
      }

      // Set the appropriate value field based on measure type
      switch (selectedDefinition.measure_type) {
        case 'numeric':
        case 'calculated':
          payload.numeric_value = parseFloat(formData.value);
          break;
        case 'text':
          payload.text_value = formData.value.trim();
          break;
        case 'boolean':
          payload.boolean_value = formData.value;
          break;
        default:
          throw new Error('Unsupported measure type');
      }

      if (isEditMode) {
        // Update existing measure
        await updatePatientMeasure(measure.id, payload);
      } else {
        // Create new measure
        await logPatientMeasure(patientId, payload);
      }

      setSuccess(true);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }

      // Reset and close after short delay
      window.setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Error logging measure:', err);
      setError(err.response?.data?.error || err.message || t('measures.logError', 'Failed to log measure'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      measure_definition_id: '',
      value: '',
      measured_at: '',
      notes: ''
    });
    setSelectedDefinition(null);
    setError(null);
    setSuccess(false);
    onHide();
  };

  // Group definitions by category
  const groupedDefinitions = definitions.reduce((acc, def) => {
    const category = def.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(def);
    return acc;
  }, {});

  // Category display names
  const categoryLabels = {
    vitals: t('measures.categories.vitals', 'Vitals'),
    anthropometric: t('measures.categories.anthropometric', 'Anthropometric'),
    lab_results: t('measures.categories.labResults', 'Lab Results'),
    symptoms: t('measures.categories.symptoms', 'Symptoms'),
    lifestyle: t('measures.categories.lifestyle', 'Lifestyle'),
    other: t('measures.categories.other', 'Other')
  };

  // Render the appropriate value input based on measure type
  const renderValueInput = () => {
    if (!selectedDefinition) {
      return (
        <Form.Control
          type="text"
          disabled
          placeholder={t('measures.selectMeasureFirst', 'Select a measure first')}
        />
      );
    }

    const { measure_type, unit, min_value, max_value } = selectedDefinition;

    switch (measure_type) {
      case 'numeric':
      case 'calculated':
        return (
          <div className="d-flex align-items-center">
            <Form.Control
              type="number"
              step="any"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder={t('measures.enterValue', 'Enter value')}
              min={min_value !== null ? min_value : undefined}
              max={max_value !== null ? max_value : undefined}
              required
            />
            {unit && (
              <Badge bg="secondary" className="ms-2" style={{ minWidth: '50px' }}>
                {unit}
              </Badge>
            )}
          </div>
        );

      case 'text':
        return (
          <Form.Control
            type="text"
            name="value"
            value={formData.value}
            onChange={handleChange}
            placeholder={t('measures.enterText', 'Enter text value')}
            required
          />
        );

      case 'boolean':
        return (
          <Form.Check
            type="checkbox"
            name="value"
            checked={formData.value}
            onChange={handleChange}
            label={t('measures.yesNo', 'Yes / No')}
          />
        );

      default:
        return (
          <Form.Control
            type="text"
            disabled
            placeholder={t('measures.unsupportedType', 'Unsupported measure type')}
          />
        );
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered scrollable size="lg" fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditMode ? (
            <>✏️ {t('measures.editMeasure', 'Edit Measure')}</>
          ) : (
            <>📊 {t('measures.logMeasure', 'Log Measure')}</>
          )}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              {isEditMode
                ? t('measures.updateSuccess', 'Measure updated successfully!')
                : t('measures.logSuccess', 'Measure logged successfully!')}
            </Alert>
          )}

          {loadingDefinitions ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="text-muted mt-2">{t('common.loading', 'Loading...')}</p>
            </div>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>
                  {t('measures.measure', 'Measure')} <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="measure_definition_id"
                  value={formData.measure_definition_id}
                  onChange={handleDefinitionChange}
                  required
                  autoFocus
                >
                  <option value="">{t('measures.selectMeasure', 'Select a measure...')}</option>
                  {Object.keys(groupedDefinitions).map(category => (
                    <optgroup key={category} label={categoryLabels[category] || category}>
                      {groupedDefinitions[category].map(def => (
                        <option key={def.id} value={def.id}>
                          {def.display_name}
                          {def.unit && ` (${def.unit})`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Form.Select>
                {selectedDefinition?.description && (
                  <Form.Text className="text-muted">
                    {selectedDefinition.description}
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  {t('measures.value', 'Value')} <span className="text-danger">*</span>
                </Form.Label>
                {renderValueInput()}
                {selectedDefinition && (selectedDefinition.min_value !== null || selectedDefinition.max_value !== null) && (
                  <Form.Text className="text-muted">
                    {selectedDefinition.min_value !== null && selectedDefinition.max_value !== null && (
                      <>{t('measures.range', 'Range')}: {selectedDefinition.min_value} - {selectedDefinition.max_value}</>
                    )}
                    {selectedDefinition.min_value !== null && selectedDefinition.max_value === null && (
                      <>{t('measures.minimum', 'Minimum')}: {selectedDefinition.min_value}</>
                    )}
                    {selectedDefinition.min_value === null && selectedDefinition.max_value !== null && (
                      <>{t('measures.maximum', 'Maximum')}: {selectedDefinition.max_value}</>
                    )}
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  {t('measures.measuredAt', 'Date & Time')} <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="measured_at"
                  value={formData.measured_at}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('measures.notes', 'Notes')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder={t('measures.notesPlaceholder', 'Optional notes about this measurement...')}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success || loadingDefinitions}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.saving', 'Saving...')}
              </>
            ) : isEditMode ? (
              t('measures.updateMeasure', 'Update Measure')
            ) : (
              t('measures.logMeasure', 'Log Measure')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default LogMeasureModal;
