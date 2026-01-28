/**
 * AnnotationModal Component
 * Modal for creating/editing measure annotations
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const AnnotationModal = ({ show, onHide, patientId, annotation, measureDefinitionId, onSave }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    event_date: '',
    event_type: 'other',
    title: '',
    description: '',
    color: '#FF5733',
    measure_definition_id: measureDefinitionId || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Event type options
  const eventTypes = [
    { value: 'medication', label: '💊 Medication', color: '#3498db' },
    { value: 'lifestyle', label: '🏃 Lifestyle', color: '#2ecc71' },
    { value: 'medical', label: '⚕️ Medical', color: '#e74c3c' },
    { value: 'other', label: '📌 Other', color: '#95a5a6' }
  ];

  // Preset colors
  const presetColors = [
    '#FF5733', '#E74C3C', '#E67E22', '#F39C12', '#F1C40F',
    '#2ECC71', '#1ABC9C', '#3498DB', '#9B59B6', '#34495E'
  ];

  // Initialize form when annotation prop changes
  useEffect(() => {
    if (annotation) {
      setFormData({
        event_date: annotation.event_date,
        event_type: annotation.event_type || 'other',
        title: annotation.title || '',
        description: annotation.description || '',
        color: annotation.color || '#FF5733',
        measure_definition_id: annotation.measure_definition_id || measureDefinitionId || ''
      });
    } else {
      // Reset for new annotation
      setFormData({
        event_date: new Date().toISOString().split('T')[0],
        event_type: 'other',
        title: '',
        description: '',
        color: '#FF5733',
        measure_definition_id: measureDefinitionId || ''
      });
    }
    setError(null);
  }, [annotation, measureDefinitionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.event_date) {
      setError('Event date is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        measure_definition_id: formData.measure_definition_id || null
      };

      if (annotation) {
        // Update existing annotation
        await api.put(`/annotations/${annotation.id}`, payload);
      } else {
        // Create new annotation
        await api.post(`/patients/${patientId}/annotations`, payload);
      }

      if (onSave) {
        onSave();
      }

      onHide();
    } catch (err) {
      console.error('Error saving annotation:', err);
      setError(err.response?.data?.error || 'Failed to save annotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {annotation ? t('annotations.editAnnotation') : t('annotations.createAnnotation')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Event Date */}
          <Form.Group className="mb-3">
            <Form.Label>
              {t('annotations.eventDate')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
            />
          </Form.Group>

          {/* Event Type */}
          <Form.Group className="mb-3">
            <Form.Label>{t('annotations.eventType')}</Form.Label>
            <Form.Select
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Title */}
          <Form.Group className="mb-3">
            <Form.Label>
              {t('annotations.title')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={t('annotations.titlePlaceholder')}
              maxLength={255}
              required
            />
            <Form.Text className="text-muted">
              {formData.title.length}/255 characters
            </Form.Text>
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label>{t('annotations.description')}</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('annotations.descriptionPlaceholder')}
              rows={3}
            />
          </Form.Group>

          {/* Color Picker */}
          <Form.Group className="mb-3">
            <Form.Label>{t('annotations.markerColor')}</Form.Label>
            <div className="d-flex gap-2 align-items-center mb-2">
              <Form.Control
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                style={{ width: '60px', height: '40px' }}
              />
              <Form.Control
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="#FF5733"
                style={{ width: '120px' }}
              />
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: formData.color,
                  border: '2px solid #dee2e6',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: color,
                    border: formData.color === color ? '3px solid #000' : '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title={color}
                />
              ))}
            </div>
          </Form.Group>

          {/* Measure Scope */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="apply-to-all"
              label={t('annotations.applyToAllMeasures')}
              checked={!formData.measure_definition_id}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  measure_definition_id: e.target.checked ? '' : measureDefinitionId
                }));
              }}
            />
            <Form.Text className="text-muted">
              {t('annotations.applyToAllHelp')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

AnnotationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  patientId: PropTypes.string.isRequired,
  annotation: PropTypes.object,
  measureDefinitionId: PropTypes.string,
  onSave: PropTypes.func
};

export default AnnotationModal;
