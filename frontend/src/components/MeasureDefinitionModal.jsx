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
import { createMeasureDefinition, updateMeasureDefinition } from '../services/measureService';
import FormulaValidator from './FormulaValidator';
import FormulaPreviewModal from './FormulaPreviewModal';
import FormulaTemplatesModal from './FormulaTemplatesModal';

const MEASURE_TYPES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'calculated', label: 'Calculated' }
];

const CATEGORIES = [
  { value: 'vitals', label: 'Vitals' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'symptoms', label: 'Symptoms' },
  { value: 'anthropometric', label: 'Anthropometric' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' }
];

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
  formula: yup.string()
    .when('measure_type', {
      is: 'calculated',
      then: (schema) => schema.required('Formula is required for calculated measures'),
      otherwise: (schema) => schema.nullable()
    })
});

const MeasureDefinitionModal = ({ show, onHide, definition, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedMeasureType, setSelectedMeasureType] = useState('numeric');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dependencies, setDependencies] = useState([]);

  const isEditing = !!definition;

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
        is_active: true,
        formula: ''
      });
      setSelectedMeasureType('numeric');
    }
  }, [definition, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Build the payload
      const payload = {
        name: data.name,
        display_name: data.display_name,
        description: data.description || null,
        category: data.category,
        measure_type: data.measure_type,
        is_active: data.is_active
      };

      // Add unit for numeric/calculated types
      if (data.measure_type === 'numeric' || data.measure_type === 'calculated') {
        payload.unit = data.unit || null;
        payload.decimal_places = data.decimal_places !== null ? parseInt(data.decimal_places) : 2;
      }

      // Add min/max values for numeric type
      if (data.measure_type === 'numeric') {
        payload.min_value = data.min_value !== null && data.min_value !== '' ? parseFloat(data.min_value) : null;
        payload.max_value = data.max_value !== null && data.max_value !== '' ? parseFloat(data.max_value) : null;
      }

      // Add formula for calculated type
      if (data.measure_type === 'calculated') {
        payload.formula = data.formula || null;
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
    <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? 'Edit Measure Definition' : 'Create Measure Definition'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              Measure definition {isEditing ? 'updated' : 'created'} successfully!
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  {...register('category')}
                  isInvalid={!!errors.category}
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
                <Form.Label>Measure Type *</Form.Label>
                <Form.Select
                  {...register('measure_type')}
                  isInvalid={!!errors.measure_type}
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
            <Form.Label>Name * <small className="text-muted">(Internal ID)</small></Form.Label>
            <Form.Control
              type="text"
              {...register('name')}
              isInvalid={!!errors.name}
              placeholder="e.g., blood_pressure_systolic"
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Lowercase letters, numbers, and underscores only
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Display Name *</Form.Label>
            <Form.Control
              type="text"
              {...register('display_name')}
              isInvalid={!!errors.display_name}
              placeholder="e.g., Blood Pressure (Systolic)"
            />
            <Form.Control.Feedback type="invalid">
              {errors.display_name?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register('description')}
              isInvalid={!!errors.description}
              placeholder="Optional description of this measure"
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Conditional fields based on measure type */}
          {(selectedMeasureType === 'numeric' || selectedMeasureType === 'calculated') && (
            <Card className="mb-3">
              <Card.Header>Numeric Configuration</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Unit</Form.Label>
                      <Form.Control
                        type="text"
                        {...register('unit')}
                        isInvalid={!!errors.unit}
                        placeholder="e.g., mmHg, kg, cm"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.unit?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Decimal Places</Form.Label>
                      <Form.Select
                        {...register('decimal_places')}
                        isInvalid={!!errors.decimal_places}
                      >
                        <option value="0">0 (Integer)</option>
                        <option value="1">1</option>
                        <option value="2">2 (Default)</option>
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
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Minimum Value</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          {...register('min_value')}
                          isInvalid={!!errors.min_value}
                          placeholder="Optional minimum"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.min_value?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Maximum Value</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          {...register('max_value')}
                          isInvalid={!!errors.max_value}
                          placeholder="Optional maximum"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.max_value?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          )}

          {selectedMeasureType === 'calculated' && (
            <Card className="mb-3">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Formula Configuration</span>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setShowTemplates(true)}
                  >
                    📋 Templates
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Formula *</Form.Label>
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
                    Use {'{measure_name}'} to reference measures.
                    Time-series: {'{current:name}'}, {'{previous:name}'}, {'{delta:name}'}, {'{avg30:name}'}
                    <br />
                    Operators: +, -, *, /, ^. Functions: sqrt, abs, min, max, round
                  </Form.Text>
                </Form.Group>

                {/* Real-time validation */}
                {watchFormula && <FormulaValidator formula={watchFormula} />}

                {/* Dependencies display */}
                {dependencies.length > 0 && (
                  <Alert variant="info" className="mt-2 small mb-0">
                    <strong>Dependencies:</strong>{' '}
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
                    🔍 Preview Calculation
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}

          {selectedMeasureType === 'text' && (
            <Alert variant="info">
              <small>
                <strong>Note:</strong> Text measures can store free-form text values.
              </small>
            </Alert>
          )}

          {selectedMeasureType === 'boolean' && (
            <Alert variant="info">
              <small>
                <strong>Note:</strong> Boolean measures store Yes/No values.
              </small>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active"
              {...register('is_active')}
            />
            <Form.Text className="text-muted">
              Inactive measures will not be available for logging
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              isEditing ? 'Update Measure' : 'Create Measure'
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
