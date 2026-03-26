/**
 * EmbeddedMeasureField Component
 * Inline editing of a patient measure within a consultation note.
 *
 * When used inside a consultation note (noteId + templateItemId props provided):
 * - Loads the measure linked to THIS note via ConsultationNoteEntry
 * - If no linked measure yet (new note), starts empty
 * - On save: creates a new PatientMeasure then links it to the note
 *
 * When used standalone (no noteId): original behaviour — loads latest measure.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  getMeasureDefinitions,
  getPatientMeasures,
  getPatientMeasureById,
  logPatientMeasure,
  updatePatientMeasure
} from '../services/measureService';
import { linkMeasureToNote } from '../services/consultationNoteService';
import { formatDateTimeShort } from '../utils/dateUtils';

const EmbeddedMeasureField = ({
  patientId,
  measureName,
  fieldLabel,
  visitId,
  readOnly = false,
  // Note-aware props
  noteId = null,
  templateItemId = null,
  existingMeasureId = null,   // reference_id from ConsultationNoteEntry
  onMeasureLinked = null      // callback(templateItemId, measureId) after first save
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measureDefinition, setMeasureDefinition] = useState(null);
  const [currentMeasure, setCurrentMeasure] = useState(null); // measure linked to this note
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimeoutRef = useRef(null);

  const loadMeasureData = useCallback(async () => {
    if (!patientId || !measureName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Find measure definition
      const definitions = await getMeasureDefinitions({ is_active: true });
      const definition = definitions.find(
        d => d.name?.toLowerCase() === measureName.toLowerCase() ||
             d.display_name?.toLowerCase() === measureName.toLowerCase()
      );

      if (!definition) {
        setError(t('measures.definitionNotFound', `Measure "${measureName}" not found`));
        setLoading(false);
        return;
      }

      setMeasureDefinition(definition);

      if (noteId) {
        // NOTE-AWARE MODE: load only the measure linked to this note
        if (existingMeasureId) {
          const measure = await getPatientMeasureById(existingMeasureId);
          setCurrentMeasure(measure);
          initEditValue(measure, definition);
        } else {
          // New note — start empty, no pre-population
          setCurrentMeasure(null);
          setEditValue('');
        }
      } else {
        // STANDALONE MODE: load latest measure (original behaviour)
        const measures = await getPatientMeasures(patientId, {
          measure_definition_id: definition.id,
          limit: 1
        });
        if (measures && measures.length > 0) {
          setCurrentMeasure(measures[0]);
          initEditValue(measures[0], definition);
        } else {
          setCurrentMeasure(null);
          setEditValue('');
        }
      }
    } catch (err) {
      console.error('Error loading embedded measure:', err);
      setError(err.message || t('errors.failedToLoadMeasure', 'Failed to load measure'));
    } finally {
      setLoading(false);
    }
  }, [patientId, measureName, noteId, existingMeasureId, t]);

  const initEditValue = (measure, definition) => {
    if (!measure || !definition) { setEditValue(''); return; }
    switch (definition.measure_type) {
      case 'numeric':
      case 'calculated':
        setEditValue(measure.numeric_value !== null && measure.numeric_value !== undefined
          ? String(measure.numeric_value) : '');
        break;
      case 'text':
        setEditValue(measure.text_value || '');
        break;
      case 'boolean':
        setEditValue(measure.boolean_value === true);
        break;
      default:
        setEditValue(measure.numeric_value !== null && measure.numeric_value !== undefined
          ? String(measure.numeric_value) : '');
    }
  };

  useEffect(() => {
    loadMeasureData();
  }, [loadMeasureData]);

  useEffect(() => {
    if (saveStatus) {
      saveTimeoutRef.current = setTimeout(() => setSaveStatus(null), 2000);
      return () => clearTimeout(saveTimeoutRef.current);
    }
  }, [saveStatus]);

  const buildPayload = (value) => {
    const payload = {};
    switch (measureDefinition.measure_type) {
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
    return payload;
  };

  const hasValueChanged = (value) => {
    if (!currentMeasure) return true;
    const { measure_type } = measureDefinition;
    if (measure_type === 'boolean') return value !== currentMeasure.boolean_value;
    if (measure_type === 'text') return value !== (currentMeasure.text_value || '');
    if (value === '' && (currentMeasure.numeric_value === null || currentMeasure.numeric_value === undefined)) return false;
    if (value !== '' && parseFloat(value) === parseFloat(currentMeasure.numeric_value)) return false;
    return true;
  };

  const saveValue = async (value) => {
    if (!measureDefinition) return;

    // Skip empty numeric saves with no existing measure
    if (measureDefinition.measure_type !== 'boolean' && measureDefinition.measure_type !== 'text') {
      if ((value === '' || isNaN(parseFloat(value))) && !currentMeasure) return;
    }
    if (measureDefinition.measure_type !== 'boolean' && !value && value !== false && !currentMeasure) return;

    // Skip if value unchanged
    if (currentMeasure && !hasValueChanged(value)) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      const payload = buildPayload(value);

      if (currentMeasure) {
        // Update the measure already linked to this note (or latest in standalone mode)
        await updatePatientMeasure(currentMeasure.id, payload);
        setCurrentMeasure(prev => ({ ...prev, ...payload }));
      } else {
        // Create a new measure
        const createPayload = {
          measure_definition_id: measureDefinition.id,
          measured_at: new Date().toISOString(),
          ...(visitId && { visit_id: visitId }),
          ...payload
        };
        const newMeasure = await logPatientMeasure(patientId, createPayload);
        setCurrentMeasure(newMeasure);

        // If in note context, link this measure to the note
        if (noteId && templateItemId) {
          await linkMeasureToNote(noteId, newMeasure.id, templateItemId);
          if (onMeasureLinked) {
            onMeasureLinked(templateItemId, newMeasure.id);
          }
        }
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving embedded measure:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => saveValue(editValue);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setEditValue(checked);
    saveValue(checked);
  };

  const formatMeasureDate = (dateString) => formatDateTimeShort(dateString, i18n.language);

  if (loading) {
    return (
      <div className="d-flex align-items-center text-muted">
        <Spinner animation="border" size="sm" className="me-2" />
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="py-2 mb-0">
        <small>{error}</small>
      </Alert>
    );
  }

  if (!measureDefinition) {
    return (
      <Alert variant="secondary" className="py-2 mb-0">
        <small>{t('measures.configureFirst', 'Measure not configured')}</small>
      </Alert>
    );
  }

  const formatDisplayValue = () => {
    if (!currentMeasure) return '—';
    switch (measureDefinition.measure_type) {
      case 'numeric':
      case 'calculated': {
        const val = currentMeasure.numeric_value;
        if (val === null || val === undefined) return '—';
        const decimals = measureDefinition.decimal_places ?? 2;
        const formatted = parseFloat(val).toFixed(decimals);
        return measureDefinition.unit ? `${formatted} ${measureDefinition.unit}` : formatted;
      }
      case 'text':
        return currentMeasure.text_value || '—';
      case 'boolean':
        return currentMeasure.boolean_value ? t('common.yes', 'Yes') : t('common.no', 'No');
      default:
        return '—';
    }
  };

  if (readOnly) {
    return (
      <div>
        <span className="fw-medium" style={{ fontSize: '1.1rem', color: currentMeasure ? 'inherit' : '#6c757d' }}>
          {formatDisplayValue()}
        </span>
        {currentMeasure?.measured_at && (
          <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
            {t('measures.lastRecorded', 'Last')}: {formatMeasureDate(currentMeasure.measured_at)}
          </small>
        )}
      </div>
    );
  }

  const renderSaveIndicator = () => {
    if (saving) return <Spinner animation="border" size="sm" className="ms-2 text-muted" />;
    if (saveStatus === 'saved') return <span className="ms-2 text-success" style={{ fontSize: '0.85rem' }}>✓</span>;
    if (saveStatus === 'error') return <span className="ms-2 text-danger" style={{ fontSize: '0.85rem' }}>✗</span>;
    return null;
  };

  const renderInput = () => {
    if (measureDefinition.measure_type === 'boolean') {
      return (
        <div className="d-flex align-items-center">
          <Form.Check
            type="checkbox"
            checked={editValue === true}
            onChange={handleCheckboxChange}
            label={editValue ? t('common.yes', 'Yes') : t('common.no', 'No')}
          />
          {renderSaveIndicator()}
        </div>
      );
    }

    if (measureDefinition.measure_type === 'text') {
      return (
        <div className="d-flex align-items-center">
          <Form.Control
            type="text"
            size="sm"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={measureDefinition.description || t('measures.enterValue', 'Enter value')}
          />
          {renderSaveIndicator()}
        </div>
      );
    }

    const unit = measureDefinition.unit;
    return (
      <div className="d-flex align-items-center">
        <InputGroup size="sm" style={{ maxWidth: '200px' }}>
          <Form.Control
            type="number"
            step="any"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={measureDefinition.description || t('measures.enterValue', 'Enter value')}
            min={measureDefinition.min_value !== null ? measureDefinition.min_value : undefined}
            max={measureDefinition.max_value !== null ? measureDefinition.max_value : undefined}
          />
          {unit && <InputGroup.Text>{unit}</InputGroup.Text>}
        </InputGroup>
        {renderSaveIndicator()}
      </div>
    );
  };

  return (
    <div>
      {renderInput()}
      {currentMeasure?.measured_at && (
        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
          {t('measures.lastRecorded', 'Last')}: {formatMeasureDate(currentMeasure.measured_at)}
        </small>
      )}
    </div>
  );
};

export default EmbeddedMeasureField;
