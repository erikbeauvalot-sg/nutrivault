/**
 * EmailTemplateModal Component
 * Create/Edit modal for email templates
 * Sprint 5: US-5.5.2 - Email Templates
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  Row,
  Col,
  Tabs,
  Tab,
  ButtonGroup
} from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import emailTemplateService from '../services/emailTemplateService';

// Category options with available variables
const CATEGORIES = [
  { value: 'invoice', label: 'Invoice', icon: '💰' },
  { value: 'document_share', label: 'Document Share', icon: '📄' },
  { value: 'payment_reminder', label: 'Payment Reminder', icon: '🔔' },
  { value: 'appointment_reminder', label: 'Appointment Reminder', icon: '📅' },
  { value: 'follow_up', label: 'Follow-up', icon: '📋' },
  { value: 'general', label: 'General', icon: '✉️' }
];

// Validation schema
const templateSchema = (t) => yup.object().shape({
  name: yup.string()
    .required('Template name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must be at most 200 characters'),
  slug: yup.string()
    .matches(/^[a-z0-9_-]+$/i, 'Slug can only contain letters, numbers, underscores, and dashes')
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must be at most 100 characters'),
  category: yup.string()
    .required('Category is required')
    .oneOf(['invoice', 'document_share', 'payment_reminder', 'appointment_reminder', 'follow_up', 'general']),
  description: yup.string()
    .max(500, 'Description must be at most 500 characters'),
  subject: yup.string()
    .required('Subject is required')
    .min(5, 'Subject must be at least 5 characters')
    .max(500, 'Subject must be at most 500 characters'),
  body_html: yup.string()
    .required('HTML body is required'),
  body_text: yup.string(),
  is_active: yup.boolean()
});

const EmailTemplateModal = ({ show, onHide, template }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [availableVariables, setAvailableVariables] = useState([]);

  const isEditing = !!template;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm({
    resolver: yupResolver(templateSchema(t)),
    defaultValues: {
      name: '',
      slug: '',
      category: 'general',
      description: '',
      subject: '',
      body_html: '',
      body_text: '',
      is_active: true
    }
  });

  const watchCategory = watch('category');

  // Load template data when editing
  useEffect(() => {
    if (template) {
      reset({
        name: template.name || '',
        slug: template.slug || '',
        category: template.category || 'general',
        description: template.description || '',
        subject: template.subject || '',
        body_html: template.body_html || '',
        body_text: template.body_text || '',
        is_active: template.is_active ?? true
      });
    } else {
      reset({
        name: '',
        slug: '',
        category: 'general',
        description: '',
        subject: '',
        body_html: '',
        body_text: '',
        is_active: true
      });
    }
    setError(null);
    setSuccess(false);
  }, [template, reset, show]);

  // Load available variables when category changes
  useEffect(() => {
    if (watchCategory) {
      loadAvailableVariables(watchCategory);
    }
  }, [watchCategory]);

  const loadAvailableVariables = async (category) => {
    try {
      const response = await emailTemplateService.getAvailableVariables(category);
      setAvailableVariables(response.data.variables || []);
    } catch (err) {
      console.error('Error loading variables:', err);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const name = e.target.value;
    setValue('name', name);

    // Auto-generate slug if not editing or slug is empty
    if (!isEditing || !getValues('slug')) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setValue('slug', slug);
    }
  };

  // Insert variable into field
  const insertVariable = (variable, field) => {
    const currentValue = getValues(field);
    const cursorPosition = document.getElementById(field)?.selectionStart || currentValue.length;
    const newValue =
      currentValue.substring(0, cursorPosition) +
      `{{${variable}}}` +
      currentValue.substring(cursorPosition);
    setValue(field, newValue);
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      if (isEditing) {
        await emailTemplateService.updateTemplate(template.id, data);
      } else {
        await emailTemplateService.createTemplate(data);
      }

      setSuccess(true);
      setTimeout(() => {
        onHide(true); // Pass true to indicate success/refresh needed
      }, 1000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={() => onHide(false)} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? 'Edit Email Template' : 'Create Email Template'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Template saved successfully!</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
            {/* General Tab */}
            <Tab eventKey="general" title="General">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name *</Form.Label>
                    <Form.Control
                      type="text"
                      {...register('name')}
                      onChange={handleNameChange}
                      isInvalid={!!errors.name}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.name?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Slug</Form.Label>
                    <Form.Control
                      type="text"
                      {...register('slug')}
                      isInvalid={!!errors.slug}
                      disabled={isEditing && template?.is_system}
                    />
                    <Form.Text className="text-muted">
                      Unique identifier (lowercase, numbers, dashes, underscores)
                    </Form.Text>
                    <Form.Control.Feedback type="invalid">
                      {errors.slug?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category *</Form.Label>
                    <Form.Select
                      {...register('category')}
                      isInvalid={!!errors.category}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.category?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Check
                      type="switch"
                      id="is_active"
                      label="Active"
                      {...register('is_active')}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  {...register('description')}
                  isInvalid={!!errors.description}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.description?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Tab>

            {/* Content Tab */}
            <Tab eventKey="content" title="Content">
              {/* Variable Picker */}
              <div className="mb-3">
                <Form.Label>Available Variables</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {availableVariables.map(variable => (
                    <ButtonGroup key={variable} size="sm">
                      <Button
                        variant="outline-secondary"
                        onClick={() => insertVariable(variable, 'subject')}
                        title="Insert into subject"
                      >
                        {variable}
                      </Button>
                      <Button
                        variant="outline-primary"
                        onClick={() => insertVariable(variable, 'body_html')}
                        title="Insert into HTML body"
                      >
                        📄
                      </Button>
                      <Button
                        variant="outline-info"
                        onClick={() => insertVariable(variable, 'body_text')}
                        title="Insert into text body"
                      >
                        📝
                      </Button>
                    </ButtonGroup>
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Click a variable name to insert into subject, or use the icons to insert into HTML/text body
                </Form.Text>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Subject Line *</Form.Label>
                <Form.Control
                  id="subject"
                  type="text"
                  {...register('subject')}
                  isInvalid={!!errors.subject}
                  placeholder="E.g., Facture #{{invoice_number}} - NutriVault"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.subject?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>HTML Body *</Form.Label>
                <Form.Control
                  id="body_html"
                  as="textarea"
                  rows={12}
                  {...register('body_html')}
                  isInvalid={!!errors.body_html}
                  placeholder="HTML email content with {{variables}}"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.body_html?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Plain Text Body</Form.Label>
                <Form.Control
                  id="body_text"
                  as="textarea"
                  rows={8}
                  {...register('body_text')}
                  isInvalid={!!errors.body_text}
                  placeholder="Plain text version (optional - auto-generated from HTML if empty)"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
                <Form.Text className="text-muted">
                  Leave empty to auto-generate from HTML
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => onHide(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update Template' : 'Create Template'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EmailTemplateModal;
