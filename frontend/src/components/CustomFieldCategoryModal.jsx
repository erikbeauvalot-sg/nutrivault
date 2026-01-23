/**
 * CustomFieldCategoryModal Component
 * Create/Edit modal for custom field categories
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';

// Validation schema
const categorySchema = (t) => yup.object().shape({
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
  color: yup.string()
    .matches(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex: #RRGGBB)')
    .required('Color is required')
});

const CustomFieldCategoryModal = ({ show, onHide, category, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [color, setColor] = useState('#3498db');

  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    resolver: yupResolver(categorySchema(t)),
    defaultValues: {
      name: '',
      description: '',
      display_order: 0,
      is_active: true,
      color: '#3498db'
    }
  });

  // Reset form when category changes or modal opens
  useEffect(() => {
    if (category) {
      const categoryColor = category.color || '#3498db';
      setColor(categoryColor);
      reset({
        name: category.name || '',
        description: category.description || '',
        display_order: category.display_order || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
        color: categoryColor
      });
    } else {
      setColor('#3498db');
      reset({
        name: '',
        description: '',
        display_order: 0,
        is_active: true,
        color: '#3498db'
      });
    }
  }, [category, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      console.log('Submitting category data:', data);

      if (isEditing) {
        await customFieldService.updateCategory(category.id, data);
      } else {
        await customFieldService.createCategory(data);
      }

      setSuccess(true);
      reset();

      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.response?.data?.error || t('errors.failedToSaveCategory'));
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
    handleColorChange('#3498db');
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? '✏️ Edit Category' : '➕ Create Category'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {/* Hidden input for color to register with react-hook-form */}
          <input type="hidden" {...register('color')} />

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              Category {isEditing ? 'updated' : 'created'} successfully!
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Name *</Form.Label>
            <Form.Control
              type="text"
              {...register('name')}
              isInvalid={!!errors.name}
              placeholder="Enter category name"
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('description')}
              isInvalid={!!errors.description}
              placeholder="Enter description (optional)"
            />
            <Form.Control.Feedback type="invalid">
              {errors.description?.message}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Max 500 characters
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Display Order</Form.Label>
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
              Lower numbers appear first
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Category Color</Form.Label>
            <Row className="align-items-center">
              <Col xs={12} md={6}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <HexColorPicker color={color} onChange={handleColorChange} />
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
                    placeholder="#3498db"
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
                    🔄 Reset to Default
                  </Button>
                </div>
              </Col>
            </Row>
            <Form.Text className="text-muted d-block mt-2">
              This color will be used for tabs and visual organization
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active"
              {...register('is_active')}
            />
            <Form.Text className="text-muted">
              Inactive categories are hidden from users
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
              isEditing ? 'Update Category' : 'Create Category'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CustomFieldCategoryModal;
