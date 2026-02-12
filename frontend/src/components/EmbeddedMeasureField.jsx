/**
 * EmbeddedMeasureField Component
 * Inline editing of a patient measure directly within a custom field category.
 * Loads the latest value and allows direct inline editing with save-on-blur.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  getMeasureDefinitions,
  getPatientMeasures,
  logPatientMeasure,
  updatePatientMeasure
} from '../services/measureService';
import { formatDateTimeShort } from '../utils/dateUtils';

const EmbeddedMeasureField = ({ patientId, measureName, fieldLabel, visitId, readOnly = false }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measureDefinition, setMeasureDefinition] = useState(null);
  const [latestMeasure, setLatestMeasure] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const saveTimeoutRef = useRef(null);

  const loadMeasureData = useCallback(async () => {
    if (!patientId || !measureName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      const measures = await getPatientMeasures(patientId, {
        measure_definition_id: definition.id,
        limit: 1
      });

      if (measures && measures.length > 0) {
        setLatestMeasure(measures[0]);
        initEditValue(measures[0], definition);
      } else {
        setLatestMeasure(null);
        setEditValue('');
      }
    } catch (err) {
      console.error('Error loading embedded measure:', err);
      setError(err.message || t('errors.failedToLoadMeasure', 'Failed to load measure'));
    } finally {
      setLoading(false);
    }
  }, [patientId, measureName, t]);

  const initEditValue = (measure, definition) => {
    if (!measure || !definition) {
      setEditValue('');
      return;
    }
    switch (definition.measure_type) {
      case 'numeric':
      case 'calculated':
        setEditValue(measure.numeric_value !== null && measure.numeric_value !== undefined
          ? String(measure.numeric_value)
          : '');
        break;
      case 'text':
        setEditValue(measure.text_value || '');
        break;
      case 'boolean':
        setEditValue(measure.boolean_value === true);
        break;
      default:
        setEditValue(measure.numeric_value !== null && measure.numeric_value !== undefined
          ? String(measure.numeric_value)
          : '');
    }
  };

  useEffect(() => {
    loadMeasureData();
  }, [loadMeasureData]);

  // Clear save status after a delay
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

  const saveValue = async (value) => {
    // For non-boolean: skip save if value is empty and no existing measure
    if (measureDefinition.measure_type !== 'boolean') {
      if ((value === '' || value === null || value === undefined) && !latestMeasure) {
        return;
      }
    }

    // Check if value actually changed
    if (latestMeasure) {
      const currentVal = measureDefinition.measure_type === 'boolean'
        ? latestMeasure.boolean_value
        : measureDefinition.measure_type === 'text'
          ? latestMeasure.text_value
          : latestMeasure.numeric_value;

      if (measureDefinition.measure_type === 'boolean') {
        if (value === currentVal) return;
      } else if (measureDefinition.measure_type === 'text') {
        if (value === (currentVal || '')) return;
      } else {
        if (value === '' && (currentVal === null || currentVal === undefined)) return;
        if (value !== '' && parseFloat(value) === parseFloat(currentVal)) return;
      }
    }

    // Don't save empty numeric values as new measures
    if (measureDefinition.measure_type !== 'boolean' && measureDefinition.measure_type !== 'text') {
      if (value === '' || isNaN(parseFloat(value))) return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const payload = buildPayload(value);

      if (latestMeasure) {
        await updatePatientMeasure(latestMeasure.id, payload);
        setLatestMeasure(prev => ({ ...prev, ...payload }));
      } else {
        const createPayload = {
          measure_definition_id: measureDefinition.id,
          measured_at: new Date().toISOString(),
          ...(visitId && { visit_id: visitId }),
          ...payload
        };
        const newMeasure = await logPatientMeasure(patientId, createPayload);
        setLatestMeasure(newMeasure);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving embedded measure:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => {
    saveValue(editValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setEditValue(checked);
    saveValue(checked);
  };

  const formatMeasureDate = (dateString) => {
    return formatDateTimeShort(dateString, i18n.language);
  };

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
    if (!latestMeasure || !measureDefinition) return '—';
    switch (measureDefinition.measure_type) {
      case 'numeric':
      case 'calculated': {
        const val = latestMeasure.numeric_value;
        if (val === null || val === undefined) return '—';
        const decimals = measureDefinition.decimal_places ?? 2;
        const formatted = parseFloat(val).toFixed(decimals);
        return measureDefinition.unit ? `${formatted} ${measureDefinition.unit}` : formatted;
      }
      case 'text':
        return latestMeasure.text_value || '—';
      case 'boolean':
        return latestMeasure.boolean_value ? t('common.yes', 'Yes') : t('common.no', 'No');
      default:
        return '—';
    }
  };

  // Read-only display mode
  if (readOnly) {
    return (
      <div>
        <span
          className="fw-medium"
          style={{ fontSize: '1.1rem', color: latestMeasure ? 'inherit' : '#6c757d' }}
        >
          {formatDisplayValue()}
        </span>
        {latestMeasure?.measured_at && (
          <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
            {t('measures.lastRecorded', 'Last')}: {formatMeasureDate(latestMeasure.measured_at)}
          </small>
        )}
      </div>
    );
  }

  const renderSaveIndicator = () => {
    if (saving) {
      return <Spinner animation="border" size="sm" className="ms-2 text-muted" />;
    }
    if (saveStatus === 'saved') {
      return <span className="ms-2 text-success" style={{ fontSize: '0.85rem' }}>✓</span>;
    }
    if (saveStatus === 'error') {
      return <span className="ms-2 text-danger" style={{ fontSize: '0.85rem' }}>✗</span>;
    }
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

    // Numeric (default)
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
      {latestMeasure?.measured_at && (
        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
          {t('measures.lastRecorded', 'Last')}: {formatMeasureDate(latestMeasure.measured_at)}
        </small>
      )}
    </div>
  );
};

export default EmbeddedMeasureField;
