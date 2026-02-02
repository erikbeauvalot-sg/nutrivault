/**
 * Ingredient Category Modal Component
 * Modal for creating/editing ingredient categories
 */

import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as ingredientCategoryService from '../services/ingredientCategoryService';

const EMOJI_OPTIONS = [
  '🥩', '🍗', '🐟', '🥚', '🌾', '🍞', '🥬', '🥕', '🍎', '🍇', '🧀', '🥛',
  '🫒', '🧈', '🥜', '🌰', '🫘', '🌿', '🧂', '🍯', '🥤', '☕', '📦', '🥗'
];

const COLOR_OPTIONS = [
  '#e74c3c', '#f39c12', '#27ae60', '#e91e63', '#ffc107', '#8bc34a',
  '#795548', '#9c27b0', '#4caf50', '#607d8b', '#00bcd4', '#9e9e9e',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9'
];

const IngredientCategoryModal = ({ show, onHide, category, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🥬',
    color: '#27ae60'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || '🥬',
        color: category.color || '#27ae60'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '🥬',
        color: '#27ae60'
      });
    }
    setErrors({});
  }, [category, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('validation.required', 'This field is required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (category) {
        await ingredientCategoryService.updateCategory(category.id, formData);
        toast.success(t('ingredients.categories.updated', 'Category updated successfully'));
      } else {
        await ingredientCategoryService.createCategory(formData);
        toast.success(t('ingredients.categories.created', 'Category created successfully'));
      }
      onSuccess && onSuccess();
      onHide();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {category
              ? t('ingredients.categories.edit', 'Edit Ingredient Category')
              : t('ingredients.categories.create', 'Create Ingredient Category')
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('ingredients.categories.name', 'Name')} *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              isInvalid={!!errors.name}
              placeholder={t('ingredients.categories.namePlaceholder', 'e.g., Vegetables')}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('ingredients.categories.description', 'Description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('ingredients.categories.descriptionPlaceholder', 'Brief description of the category')}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('ingredients.categories.icon', 'Icon')}</Form.Label>
                <div className="d-flex flex-wrap gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant={formData.icon === emoji ? 'primary' : 'outline-secondary'}
                      size="sm"
                      className="p-1"
                      style={{ width: '36px', height: '36px', fontSize: '1.2rem' }}
                      onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                      type="button"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('ingredients.categories.color', 'Color')}</Form.Label>
                <div className="d-flex flex-wrap gap-1">
                  {COLOR_OPTIONS.map((color) => (
                    <Button
                      key={color}
                      variant="outline-secondary"
                      size="sm"
                      className="p-0"
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: color,
                        border: formData.color === color ? '3px solid #333' : '1px solid #ccc'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      type="button"
                    />
                  ))}
                </div>
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-3 p-3 rounded" style={{ backgroundColor: formData.color }}>
            <span style={{ fontSize: '1.5rem' }}>{formData.icon}</span>
            <span className="ms-2 fw-bold" style={{ color: '#fff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {formData.name || t('ingredients.categories.preview', 'Preview')}
            </span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default IngredientCategoryModal;
