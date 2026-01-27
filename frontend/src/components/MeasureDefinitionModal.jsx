/**
 * MeasureDefinitionModal Component
 * Create/Edit modal for measure definitions
 * Handles dynamic form based on measure_type selection
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Card, Row, Col, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { createMeasureDefinition, updateMeasureDefinition } from '../services/measureService';
import FormulaValidator from './FormulaValidator';
import FormulaPreviewModal from './FormulaPreviewModal';
import FormulaTemplatesModal from './FormulaTemplatesModal';

// Validation schema
const measureSchema = yup.object().shape({
  name: yup.string()
    .required('Name is required')
    .matches(/^[a-z0-9_]+$/, 'Name can only contain lowercase letters, numbers, and underscores')
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be at most 100 characters'),
  display_name: yup.string()
    .required('Display name is required')
    .min(1, 'Display name must be at least 1 character')
    .max(200, 'Display name must be at most 200 characters'),
  description: yup.string()
    .max(500, 'Description must be at most 500 characters')
    .nullable(),
  category: yup.string()
    .required('Category is required')
    .oneOf(['vitals', 'lab_results', 'symptoms', 'anthropometric', 'lifestyle', 'other']),
  measure_type: yup.string()
    .required('Measure type is required')
    .oneOf(['numeric', 'text', 'boolean', 'calculated']),
  unit: yup.string()
    .max(50, 'Unit must be at most 50 characters')
    .nullable(),
  min_value: yup.number()
    .typeError('Minimum value must be a number')
    .nullable(),
  max_value: yup.number()
    .typeError('Maximum value must be a number')
    .nullable()
    .test('is-greater', 'Maximum value must be greater than minimum value', function(value) {
      const { min_value } = this.parent;
      if (value === null || value === undefined || min_value === null || min_value === undefined) {
        return true;
      }
      return value > min_value;
    }),
  decimal_places: yup.number()
    .typeError('Decimal places must be a number')
    .integer('Decimal places must be an integer')
    .min(0, 'Decimal places must be between 0 and 4')
    .max(4, 'Decimal places must be between 0 and 4')
    .nullable(),
  normal_range_min: yup.number()
    .typeError('Normal range minimum must be a number')
    .nullable(),
  normal_range_max: yup.number()
    .typeError('Normal range maximum must be a number')
    .nullable()
    .test('is-greater-than-min', 'Normal range maximum must be greater than minimum', function(value) {
      const { normal_range_min } = this.parent;
      if (value === null || value === undefined || normal_range_min === null || normal_range_min === undefined) {
        return true;
      }
      return value > normal_range_min;
    }),
  alert_threshold_min: yup.number()
    .typeError('Alert threshold minimum must be a number')
    .nullable(),
  alert_threshold_max: yup.number()
    .typeError('Alert threshold maximum must be a number')
    .nullable(),
  enable_alerts: yup.boolean(),
  trend_preference: yup.string().oneOf(['increase', 'decrease', 'neutral']).default('increase'),
  formula: yup.string()
    .when('measure_type', {
      is: 'calculated',
      then: (schema) => schema.required('Formula is required for calculated measures'),
      otherwise: (schema) => schema.nullable()
    })
});

const MeasureDefinitionModal = ({ show, onHide, definition, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedMeasureType, setSelectedMeasureType] = useState('numeric');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dependencies, setDependencies] = useState([]);

  const isEditing = !!definition;

  // Translated measure types
  const MEASURE_TYPES = [
    { value: 'numeric', label: t('measures.types.numeric', 'Numeric') },
    { value: 'text', label: t('measures.types.text', 'Text') },
    { value: 'boolean', label: t('measures.types.boolean', 'Boolean (Yes/No)') },
    { value: 'calculated', label: t('measures.types.calculated', 'Calculated') }
  ];

  // Translated categories
  const CATEGORIES = [
    { value: 'vitals', label: t('measures.categories.vitals', 'Vitals') },
    { value: 'lab_results', label: t('measures.categories.labResults', 'Lab Results') },
    { value: 'symptoms', label: t('measures.categories.symptoms', 'Symptoms') },
    { value: 'anthropometric', label: t('measures.categories.anthropometric', 'Anthropometric') },
    { value: 'lifestyle', label: t('measures.categories.lifestyle', 'Lifestyle') },
    { value: 'other', label: t('measures.categories.other', 'Other') }
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(measureSchema),
    defaultValues: {
      name: '',
      display_name: '',
      description: '',
      category: 'vitals',
      measure_type: 'numeric',
      unit: '',
      min_value: null,
      max_value: null,
      decimal_places: 2,
      normal_range_min: null,
      normal_range_max: null,
      alert_threshold_min: null,
      alert_threshold_max: null,
      enable_alerts: false,
      trend_preference: 'increase',
      is_active: true,
      formula: ''
    }
  });

  const watchMeasureType = watch('measure_type');
  const watchFormula = watch('formula');

  // Update selected measure type when form changes
  useEffect(() => {
    if (watchMeasureType) {
      setSelectedMeasureType(watchMeasureType);
    }
  }, [watchMeasureType]);

  // Extract dependencies when formula changes
  useEffect(() => {
    if (watchFormula && selectedMeasureType === 'calculated') {
      const regex = /\{([a-zA-Z_][a-zA-Z0-9_:]*)\}/g;
      const matches = [];
      let match;
      while ((match = regex.exec(watchFormula)) !== null) {
        if (!matches.includes(match[1])) {
          matches.push(match[1]);
        }
      }
      setDependencies(matches);
    } else {
      setDependencies([]);
    }
  }, [watchFormula, selectedMeasureType]);

  // Reset form when definition changes or modal opens
  useEffect(() => {
    if (show) {
      if (definition) {
        reset({
          name: definition.name || '',
          display_name: definition.display_name || '',
          description: definition.description || '',
          category: definition.category || 'vitals',
          measure_type: definition.measure_type || 'numeric',
          unit: definition.unit || '',
          min_value: definition.min_value ?? null,
          max_value: definition.max_value ?? null,
          decimal_places: definition.decimal_places ?? 2,
          normal_range_min: definition.normal_range_min ?? null,
          normal_range_max: definition.normal_range_max ?? null,
          alert_threshold_min: definition.alert_threshold_min ?? null,
          alert_threshold_max: definition.alert_threshold_max ?? null,
          enable_alerts: definition.enable_alerts ?? false,
          trend_preference: definition.trend_preference || 'increase',
          is_active: definition.is_active !== undefined ? definition.is_active : true,
          formula: definition.formula || ''
        });
        setSelectedMeasureType(definition.measure_type || 'numeric');
      } else {
        reset({
          name: '',
          display_name: '',
          description: '',
          category: 'vitals',
          measure_type: 'numeric',
          unit: '',
          min_value: null,
          max_value: null,
          decimal_places: 2,
          normal_range_min: null,
          normal_range_max: null,
          alert_threshold_min: null,
          alert_threshold_max: null,
          enable_alerts: false,
          trend_preference: 'increase',
          is_active: true,
          formula: ''
        });
        setSelectedMeasureType('numeric');
      }
    }
  }, [show, definition, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Check if this is a system measure being edited
      const isSystemMeasure = isEditing && definition?.is_system;

      // Build the payload
      const payload = {};

      // For system measures, only include allowed fields
      if (isSystemMeasure) {
        // System measures can only update these fields
        payload.display_name = data.display_name;
        payload.description = data.description || null;
        payload.is_active = data.is_active;

        // Range fields (both validation and alert ranges) are allowed for system measures
        if (data.measure_type === 'numeric') {
          payload.min_value = data.min_value !== null && data.min_value !== '' ? parseFloat(data.min_value) : null;
          payload.max_value = data.max_value !== null && data.max_value !== '' ? parseFloat(data.max_value) : null;
          payload.normal_range_min = data.normal_range_min !== null && data.normal_range_min !== '' ? parseFloat(data.normal_range_min) : null;
          payload.normal_range_max = data.normal_range_max !== null && data.normal_range_max !== '' ? parseFloat(data.normal_range_max) : null;
          payload.alert_threshold_min = data.alert_threshold_min !== null && data.alert_threshold_min !== '' ? parseFloat(data.alert_threshold_min) : null;
          payload.alert_threshold_max = data.alert_threshold_max !== null && data.alert_threshold_max !== '' ? parseFloat(data.alert_threshold_max) : null;
          payload.enable_alerts = data.enable_alerts ?? false;
          payload.trend_preference = data.trend_preference || 'increase';
        }
      } else {
        // For non-system measures or new measures, include all fields
        payload.name = data.name;
        payload.display_name = data.display_name;
        payload.description = data.description || null;
        payload.category = data.category;
        payload.measure_type = data.measure_type;
        payload.is_active = data.is_active;

        // Add unit for numeric/calculated types
        if (data.measure_type === 'numeric' || data.measure_type === 'calculated') {
          payload.unit = data.unit || null;
          payload.decimal_places = data.decimal_places !== null ? parseInt(data.decimal_places) : 2;
        }

        // Add min/max values for numeric type
        if (data.measure_type === 'numeric') {
          payload.min_value = data.min_value !== null && data.min_value !== '' ? parseFloat(data.min_value) : null;
          payload.max_value = data.max_value !== null && data.max_value !== '' ? parseFloat(data.max_value) : null;

          // Add range fields for alerts
          payload.normal_range_min = data.normal_range_min !== null && data.normal_range_min !== '' ? parseFloat(data.normal_range_min) : null;
          payload.normal_range_max = data.normal_range_max !== null && data.normal_range_max !== '' ? parseFloat(data.normal_range_max) : null;
          payload.alert_threshold_min = data.alert_threshold_min !== null && data.alert_threshold_min !== '' ? parseFloat(data.alert_threshold_min) : null;
          payload.alert_threshold_max = data.alert_threshold_max !== null && data.alert_threshold_max !== '' ? parseFloat(data.alert_threshold_max) : null;
          payload.enable_alerts = data.enable_alerts ?? false;
          payload.trend_preference = data.trend_preference || 'increase';
        }

        // Add formula for calculated type
        if (data.measure_type === 'calculated') {
          payload.formula = data.formula || null;
        }
      }

      if (isEditing) {
        await updateMeasureDefinition(definition.id, payload);
      } else {
        await createMeasureDefinition(payload);
      }

      setSuccess(true);
      reset();

      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving measure definition:', err);
      setError(err.response?.data?.error || 'Failed to save measure definition');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(false);
    onHide();
  };

  const handleApplyTemplate = (template) => {
    if (template) {
      setValue('formula', template.formula);
      if (template.unit) setValue('unit', template.unit);
      if (template.display_name && !watch('display_name')) {
        setValue('display_name', template.name);
      }
    }
  };

  return (
    <>
    <Modal show={show} onHide={handleClose} size="lg" fullscreen="md-down" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? t('measures.modal.editTitle', 'Edit Measure Definition') : t('measures.modal.createTitle', 'Create Measure Definition')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              {isEditing ? t('measures.modal.updateSuccess', 'Measure definition updated successfully!') : t('measures.modal.createSuccess', 'Measure definition created successfully!')}
            </Alert>
          )}

          {isEditing && definition?.is_system && (
            <Alert variant="info">
              <strong>{t('measures.modal.systemMeasure', 'System Measure')}:</strong> {t('measures.modal.systemMeasureInfo', 'This is a system-defined measure. Only display name, description, active status, validation ranges (min/max), and alert ranges can be modified.')}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('measures.category', 'Category')} *</Form.Label>
                <Form.Select
                  {...register('category')}
                  isInvalid={!!errors.category}
                  disabled={isEditing && definition?.is_system}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.category?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('measures.measureType', 'Measure Type')} *</Form.Label>
                <Form.Select
                  {...register('measure_type')}
                  isInvalid={!!errors.measure_type}
                  disabled={isEditing && definition?.is_system}
                >
                  {MEASURE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.measure_type?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>{t('measures.name', 'Name')} * <small className="text-muted">({t('measures.modal.internalId', 'Internal ID')})</small></Form.Label>
            <Form.Control
              type="text"
              {...register('name')}
              isInvalid={!!errors.name}
              placeholder={t('measures.modal.namePlaceholder', 'e.g., blood_pressure_systolic')}
              autoFocus
              disabled={isEditing && definition?.is_system}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('measures.modal.nameHelp', 'Lowercase letters, numbers, and underscores only')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('measures.displayName', 'Display Name')} *</Form.Label>
            <Form.Control
              type="text"
              {...register('display_name')}
              isInvalid={!!errors.display_name}
              placeholder={t('measures.modal.displayNamePlaceholder', 'e.g., Blood Pressure (Systolic)')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.display_name?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('measures.description', 'Description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register('description')}
              isInvalid={!!errors.description}
              placeholder={t('measures.modal.descriptionPlaceholder', 'Optional description of this measure')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Conditional fields based on measure type */}
          {(selectedMeasureType === 'numeric' || selectedMeasureType === 'calculated') && (
            <Card className="mb-3">
              <Card.Header>{t('measures.modal.numericConfig', 'Numeric Configuration')}</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('measures.unit', 'Unit')}</Form.Label>
                      <Form.Control
                        type="text"
                        {...register('unit')}
                        isInvalid={!!errors.unit}
                        placeholder={t('measures.modal.unitPlaceholder', 'e.g., mmHg, kg, cm')}
                        disabled={isEditing && definition?.is_system}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.unit?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('measures.decimalPlaces', 'Decimal Places')}</Form.Label>
                      <Form.Select
                        {...register('decimal_places')}
                        isInvalid={!!errors.decimal_places}
                        disabled={isEditing && definition?.is_system}
                      >
                        <option value="0">0 ({t('measures.modal.integer', 'Integer')})</option>
                        <option value="1">1</option>
                        <option value="2">2 ({t('measures.modal.default', 'Default')})</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.decimal_places?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {selectedMeasureType === 'numeric' && (
                  <>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label>{t('measures.minValue', 'Minimum Value')} <small className="text-muted">({t('measures.modal.validation', 'Validation')})</small></Form.Label>
                          <Form.Control
                            type="number"
                            step="any"
                            {...register('min_value')}
                            isInvalid={!!errors.min_value}
                            placeholder={t('measures.modal.optionalMin', 'Optional minimum')}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.min_value?.message}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-2">
                          <Form.Label>{t('measures.maxValue', 'Maximum Value')} <small className="text-muted">({t('measures.modal.validation', 'Validation')})</small></Form.Label>
                          <Form.Control
                            type="number"
                            step="any"
                            {...register('max_value')}
                            isInvalid={!!errors.max_value}
                            placeholder={t('measures.modal.optionalMax', 'Optional maximum')}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.max_value?.message}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <hr className="my-3" />

                    {/* Trend Preference Section */}
                    <div className="mb-3">
                      <h6>{t('measures.modal.trendPreference', 'Trend Preference')}</h6>
                      <Form.Text className="text-muted d-block mb-2">
                        {t('measures.modal.trendPreferenceHelp', 'Determines how the trend indicator is displayed in charts (green for positive, red for negative).')}
                      </Form.Text>
                      <Form.Select
                        {...register('trend_preference')}
                        className="mb-2"
                      >
                        <option value="increase">{t('measures.modal.trendIncrease', 'Increase is positive')} (↗️ {t('measures.modal.trendIncreaseExample', 'e.g., muscle mass')})</option>
                        <option value="decrease">{t('measures.modal.trendDecrease', 'Decrease is positive')} (↘️ {t('measures.modal.trendDecreaseExample', 'e.g., weight, body fat')})</option>
                        <option value="neutral">{t('measures.modal.trendNeutral', 'Neutral')} ({t('measures.modal.trendNeutralExample', 'no preference')})</option>
                      </Form.Select>
                    </div>

                    <hr className="my-3" />

                    {/* Normal Ranges & Alerts Section */}
                    <div className="mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">{t('measures.modal.normalRangesAlerts', 'Normal Ranges & Alerts')}</h6>
                        <Form.Check
                          type="switch"
                          label={t('measures.modal.enableAlerts', 'Enable Alerts')}
                          {...register('enable_alerts')}
                        />
                      </div>
                      <Form.Text className="text-muted d-block mb-3">
                        {t('measures.modal.rangesHelp', 'Define healthy ranges and critical thresholds to generate automatic alerts for out-of-range values.')}
                      </Form.Text>
                    </div>

                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <Badge bg="success" className="mb-2">{t('measures.modal.normalRange', 'Normal/Healthy Range')}</Badge>
                          <Form.Group className="mb-2">
                            <Form.Label>{t('measures.modal.normalMin', 'Normal Min')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="any"
                              {...register('normal_range_min')}
                              isInvalid={!!errors.normal_range_min}
                              placeholder="e.g., 18.5"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.normal_range_min?.message}
                            </Form.Control.Feedback>
                          </Form.Group>
                          <Form.Group className="mb-2">
                            <Form.Label>{t('measures.modal.normalMax', 'Normal Max')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="any"
                              {...register('normal_range_max')}
                              isInvalid={!!errors.normal_range_max}
                              placeholder="e.g., 24.9"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.normal_range_max?.message}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <Badge bg="danger" className="mb-2">{t('measures.modal.criticalThresholds', 'Critical Alert Thresholds')}</Badge>
                          <Form.Group className="mb-2">
                            <Form.Label>{t('measures.modal.criticalMin', 'Critical Min')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="any"
                              {...register('alert_threshold_min')}
                              isInvalid={!!errors.alert_threshold_min}
                              placeholder="e.g., 16"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.alert_threshold_min?.message}
                            </Form.Control.Feedback>
                          </Form.Group>
                          <Form.Group className="mb-2">
                            <Form.Label>{t('measures.modal.criticalMax', 'Critical Max')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="any"
                              {...register('alert_threshold_max')}
                              isInvalid={!!errors.alert_threshold_max}
                              placeholder="e.g., 30"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.alert_threshold_max?.message}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                    </Row>

                    {/* Range Preview Visual */}
                    {(watch('normal_range_min') || watch('normal_range_max')) && (
                      <Alert variant="info" className="mb-0">
                        <strong>{t('measures.modal.rangePreview', 'Range Preview')}:</strong>
                        <div className="d-flex gap-2 mt-2 flex-wrap">
                          {watch('alert_threshold_min') && (
                            <Badge bg="danger">{t('measures.modal.criticalLow', 'Critical Low')} (&lt; {watch('alert_threshold_min')})</Badge>
                          )}
                          <Badge bg="warning" text="dark">{t('measures.modal.warningLow', 'Warning Low')}</Badge>
                          <Badge bg="success">
                            {t('measures.modal.normal', 'Normal')} ({watch('normal_range_min') || '?'} - {watch('normal_range_max') || '?'})
                          </Badge>
                          <Badge bg="warning" text="dark">{t('measures.modal.warningHigh', 'Warning High')}</Badge>
                          {watch('alert_threshold_max') && (
                            <Badge bg="danger">{t('measures.modal.criticalHigh', 'Critical High')} (&gt; {watch('alert_threshold_max')})</Badge>
                          )}
                        </div>
                      </Alert>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          )}

          {selectedMeasureType === 'calculated' && (
            <Card className="mb-3">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>{t('measures.modal.formulaConfig', 'Formula Configuration')}</span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setShowTemplates(true)}
                  >
                    📋 {t('measures.modal.templates', 'Templates')}
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>{t('measures.modal.formula', 'Formula')} *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    {...register('formula')}
                    isInvalid={!!errors.formula}
                    placeholder="{weight} / ({height} * {height})"
                    className="font-monospace"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.formula?.message}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    {t('measures.modal.formulaHelp', "Use {measure_name} to reference measures. Time-series: {current:name}, {previous:name}, {delta:name}, {avg30:name}")}
                    <br />
                    {t('measures.modal.formulaOperators', 'Operators: +, -, *, /, ^. Functions: sqrt, abs, min, max, round')}
                  </Form.Text>
                </Form.Group>

                {/* Real-time validation */}
                {watchFormula && <FormulaValidator formula={watchFormula} />}

                {/* Dependencies display */}
                {dependencies.length > 0 && (
                  <Alert variant="info" className="mt-2 small mb-0">
                    <strong>{t('measures.modal.dependencies', 'Dependencies')}:</strong>{' '}
                    {dependencies.map(dep => (
                      <Badge key={dep} bg="secondary" className="me-1">{dep}</Badge>
                    ))}
                  </Alert>
                )}

                {/* Preview button */}
                {dependencies.length > 0 && (
                  <Button
                    size="sm"
                    variant="link"
                    className="mt-2 p-0"
                    onClick={() => setShowPreview(true)}
                  >
                    🔍 {t('measures.modal.previewCalculation', 'Preview Calculation')}
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}

          {selectedMeasureType === 'text' && (
            <Alert variant="info">
              <small>
                <strong>{t('common.note', 'Note')}:</strong> {t('measures.modal.textNote', 'Text measures can store free-form text values.')}
              </small>
            </Alert>
          )}

          {selectedMeasureType === 'boolean' && (
            <Alert variant="info">
              <small>
                <strong>{t('common.note', 'Note')}:</strong> {t('measures.modal.booleanNote', 'Boolean measures store Yes/No values.')}
              </small>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label={t('measures.isActive', 'Active')}
              {...register('is_active')}
            />
            <Form.Text className="text-muted">
              {t('measures.modal.activeHelp', 'Inactive measures will not be available for logging')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              isEditing ? t('measures.updateMeasure', 'Update Measure') : t('measures.createMeasure', 'Create Measure')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>

    {/* Formula Preview Modal */}
    <FormulaPreviewModal
      show={showPreview}
      onHide={() => setShowPreview(false)}
      formula={watchFormula}
      dependencies={dependencies}
    />

    {/* Formula Templates Modal */}
    <FormulaTemplatesModal
      show={showTemplates}
      onHide={() => setShowTemplates(false)}
      onApply={handleApplyTemplate}
    />
    </>
  );
};

export default MeasureDefinitionModal;
