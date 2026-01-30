/**
 * VisitTypeModal Component
 * Create/Edit modal for visit types
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';
import visitTypeService from '../services/visitTypeService';

// Validation schema
const visitTypeSchema = (t) => yup.object().shape({
  name: yup.string()
    .required(t('forms.required'))
    .min(1, t('forms.minLength', { count: 1 }))
    .max(100, t('forms.maxLength', { count: 100 })),
  description: yup.string()
    .max(500, t('forms.maxLength', { count: 500 }))
    .nullable(),
  display_order: yup.number()
    .typeError(t('forms.mustBeNumber'))
    .integer(t('forms.mustBeInteger'))
    .min(0, t('forms.minValue', { value: 0 }))
    .nullable(),
  duration_minutes: yup.number()
    .typeError(t('forms.mustBeNumber'))
    .integer(t('forms.mustBeInteger'))
    .min(1, t('forms.minValue', { value: 1 }))
    .max(480, t('forms.maxValue', { value: 480 }))
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value),
  default_price: yup.number()
    .typeError(t('forms.mustBeNumber'))
    .min(0, t('forms.minValue', { value: 0 }))
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value),
  color: yup.string()
    .matches(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex: #RRGGBB)')
    .nullable()
});

const VisitTypeModal = ({ show, onHide, visitType, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [color, setColor] = useState('#2196F3');

  const isEditing = !!visitType;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    resolver: yupResolver(visitTypeSchema(t)),
    defaultValues: {
      name: '',
      description: '',
      display_order: 0,
      is_active: true,
      color: '#2196F3',
      duration_minutes: '',
      default_price: ''
    }
  });

  // Reset form when visitType changes or modal opens
  useEffect(() => {
    if (visitType) {
      const visitTypeColor = visitType.color || '#2196F3';
      setColor(visitTypeColor);
      reset({
        name: visitType.name || '',
        description: visitType.description || '',
        display_order: visitType.display_order || 0,
        is_active: visitType.is_active !== undefined ? visitType.is_active : true,
        color: visitTypeColor,
        duration_minutes: visitType.duration_minutes || '',
        default_price: visitType.default_price || ''
      });
    } else {
      setColor('#2196F3');
      reset({
        name: '',
        description: '',
        display_order: 0,
        is_active: true,
        color: '#2196F3',
        duration_minutes: '',
        default_price: ''
      });
    }
  }, [visitType, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (isEditing) {
        await visitTypeService.updateVisitType(visitType.id, data);
      } else {
        await visitTypeService.createVisitType(data);
      }

      setSuccess(true);
      reset();

      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving visit type:', err);
      setError(err.response?.data?.error || t('errors.failedToSaveVisitType', 'Failed to save visit type'));
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

  const handleColorChange = (newColor) => {
    setColor(newColor);
    setValue('color', newColor, { shouldValidate: true });
  };

  const resetToDefaultColor = () => {
    handleColorChange('#2196F3');
  };

  // Preset colors
  const presetColors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#f44336', // Red
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#795548', // Brown
    '#607D8B'  // Gray
  ];

  return (
    <Modal show={show} onHide={handleClose} size="lg" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing
            ? t('visitTypes.editVisitType', 'Edit Visit Type')
            : t('visitTypes.createVisitType', 'Create Visit Type')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {/* Hidden input for color */}
          <input type="hidden" {...register('color')} />

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              {t('visitTypes.savedSuccessfully', 'Visit type saved successfully!')}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>{t('visitTypes.name', 'Name')} *</Form.Label>
            <Form.Control
              type="text"
              {...register('name')}
              isInvalid={!!errors.name}
              placeholder={t('visitTypes.namePlaceholder', 'Enter visit type name')}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visitTypes.description', 'Description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('description')}
              isInvalid={!!errors.description}
              placeholder={t('visitTypes.descriptionPlaceholder', 'Enter description (optional)')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('forms.maxCharacters', 'Max 500 characters')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visitTypes.displayOrder', 'Display Order')}</Form.Label>
            <Form.Control
              type="number"
              {...register('display_order')}
              isInvalid={!!errors.display_order}
              placeholder="0"
              min="0"
            />
            <Form.Control.Feedback type="invalid">
              {errors.display_order?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {t('customFields.lowerNumbersFirst', 'Lower numbers appear first')}
            </Form.Text>
          </Form.Group>

          <Row>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('visitTypes.defaultDuration', 'Default Duration (minutes)')}</Form.Label>
                <Form.Control
                  type="number"
                  {...register('duration_minutes')}
                  isInvalid={!!errors.duration_minutes}
                  placeholder={t('visitTypes.durationPlaceholder', 'e.g., 60')}
                  min="1"
                  max="480"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.duration_minutes?.message}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {t('visitTypes.durationHelp', 'Pre-filled when creating a visit')}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('visitTypes.defaultPrice', 'Default Price')} (€)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  {...register('default_price')}
                  isInvalid={!!errors.default_price}
                  placeholder={t('visitTypes.pricePlaceholder', 'e.g., 80.00')}
                  min="0"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.default_price?.message}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {t('visitTypes.priceHelp', 'Used when creating an invoice')}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>{t('visitTypes.color', 'Color')}</Form.Label>
            <Row className="align-items-start">
              <Col xs={12} md={6}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <HexColorPicker color={color} onChange={handleColorChange} />
                </div>
                {/* Preset Colors */}
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {presetColors.map((presetColor) => (
                    <div
                      key={presetColor}
                      onClick={() => handleColorChange(presetColor)}
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: presetColor,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: color === presetColor ? '2px solid #000' : '1px solid #ccc'
                      }}
                      title={presetColor}
                    />
                  ))}
                </div>
              </Col>
              <Col xs={12} md={6} className="mt-3 mt-md-0">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <Badge
                      bg=""
                      style={{
                        backgroundColor: color,
                        color: '#fff',
                        padding: '10px 20px',
                        fontSize: '14px'
                      }}
                    >
                      {color}
                    </Badge>
                  </div>
                  <Form.Control
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    isInvalid={!!errors.color}
                    placeholder="#2196F3"
                    maxLength={7}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.color?.message}
                  </Form.Control.Feedback>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={resetToDefaultColor}
                  >
                    {t('common.resetToDefault', 'Reset to Default')}
                  </Button>
                </div>
              </Col>
            </Row>
            <Form.Text className="text-muted d-block mt-2">
              {t('visitTypes.colorHelp', 'This color will be used for visual identification in the UI')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label={t('common.active', 'Active')}
              {...register('is_active')}
            />
            <Form.Text className="text-muted">
              {t('visitTypes.activeHelp', 'Inactive visit types are hidden from selection')}
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
              isEditing
                ? t('common.update', 'Update')
                : t('common.create', 'Create')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default VisitTypeModal;
