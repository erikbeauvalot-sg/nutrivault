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
const getCategories = (t) => [
  { value: 'invoice', label: t('emailTemplates.categories.invoice', 'Invoice'), icon: '💰' },
  { value: 'document_share', label: t('emailTemplates.categories.documentShare', 'Document Share'), icon: '📄' },
  { value: 'payment_reminder', label: t('emailTemplates.categories.paymentReminder', 'Payment Reminder'), icon: '🔔' },
  { value: 'appointment_reminder', label: t('emailTemplates.categories.appointmentReminder', 'Appointment Reminder'), icon: '📅' },
  { value: 'follow_up', label: t('emailTemplates.categories.followUp', 'Follow-up'), icon: '📋' },
  { value: 'quote', label: t('emailTemplates.categories.quote', 'Quote'), icon: '📝' },
  { value: 'general', label: t('emailTemplates.categories.general', 'General'), icon: '✉️' }
];

// Validation schema
const templateSchema = (t) => yup.object().shape({
  name: yup.string()
    .required(t('emailTemplates.validation.nameRequired', 'Template name is required'))
    .min(3, t('emailTemplates.validation.nameMin', 'Name must be at least 3 characters'))
    .max(200, t('emailTemplates.validation.nameMax', 'Name must be at most 200 characters')),
  slug: yup.string()
    .matches(/^[a-z0-9_-]+$/i, t('emailTemplates.validation.slugFormat', 'Slug can only contain letters, numbers, underscores, and dashes'))
    .min(3, t('emailTemplates.validation.slugMin', 'Slug must be at least 3 characters'))
    .max(100, t('emailTemplates.validation.slugMax', 'Slug must be at most 100 characters')),
  category: yup.string()
    .required(t('emailTemplates.validation.categoryRequired', 'Category is required'))
    .oneOf(['invoice', 'document_share', 'payment_reminder', 'appointment_reminder', 'follow_up', 'general']),
  description: yup.string()
    .max(500, t('emailTemplates.validation.descriptionMax', 'Description must be at most 500 characters')),
  subject: yup.string()
    .required(t('emailTemplates.validation.subjectRequired', 'Subject is required'))
    .min(5, t('emailTemplates.validation.subjectMin', 'Subject must be at least 5 characters'))
    .max(500, t('emailTemplates.validation.subjectMax', 'Subject must be at most 500 characters')),
  body_html: yup.string()
    .required(t('emailTemplates.validation.bodyRequired', 'HTML body is required')),
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
    <Modal show={show} onHide={() => onHide(false)} size="xl" fullscreen="md-down" backdrop="static" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? t('emailTemplates.editTemplate', 'Edit Email Template') : t('emailTemplates.createTemplate', 'Create Email Template')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{t('emailTemplates.templateSaved', 'Template saved successfully!')}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
            {/* General Tab */}
            <Tab eventKey="general" title={t('emailTemplates.tabs.general', 'General')}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('emailTemplates.name', 'Name')} *</Form.Label>
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
                    <Form.Label>{t('emailTemplates.slug', 'Slug')}</Form.Label>
                    <Form.Control
                      type="text"
                      {...register('slug')}
                      isInvalid={!!errors.slug}
                      disabled={isEditing && template?.is_system}
                    />
                    <Form.Text className="text-muted">
                      {t('emailTemplates.slugHelp', 'Unique identifier (lowercase, numbers, dashes, underscores)')}
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
                    <Form.Label>{t('emailTemplates.category', 'Category')} *</Form.Label>
                    <Form.Select
                      {...register('category')}
                      isInvalid={!!errors.category}
                    >
                      {getCategories(t).map(cat => (
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
                    <Form.Label>{t('emailTemplates.status', 'Status')}</Form.Label>
                    <Form.Check
                      type="switch"
                      id="is_active"
                      label={t('emailTemplates.active', 'Active')}
                      {...register('is_active')}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.description', 'Description')}</Form.Label>
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
            <Tab eventKey="content" title={t('emailTemplates.tabs.content', 'Content')}>
              {/* Variable Picker */}
              <div className="mb-3">
                <Form.Label>{t('emailTemplates.availableVariables', 'Available Variables')}</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {availableVariables.map(variable => (
                    <ButtonGroup key={variable} size="sm">
                      <Button
                        variant="outline-secondary"
                        onClick={() => insertVariable(variable, 'subject')}
                        title={t('emailTemplates.insertIntoSubject', 'Insert into subject')}
                      >
                        {variable}
                      </Button>
                      <Button
                        variant="outline-primary"
                        onClick={() => insertVariable(variable, 'body_html')}
                        title={t('emailTemplates.insertIntoHtml', 'Insert into HTML body')}
                      >
                        📄
                      </Button>
                      <Button
                        variant="outline-info"
                        onClick={() => insertVariable(variable, 'body_text')}
                        title={t('emailTemplates.insertIntoText', 'Insert into text body')}
                      >
                        📝
                      </Button>
                    </ButtonGroup>
                  ))}
                </div>
                <Form.Text className="text-muted">
                  {t('emailTemplates.variablesHelp', 'Click a variable name to insert into subject, or use the icons to insert into HTML/text body')}
                </Form.Text>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.subjectLine', 'Subject Line')} *</Form.Label>
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
                <Form.Label>{t('emailTemplates.htmlBody', 'HTML Body')} *</Form.Label>
                <Form.Control
                  id="body_html"
                  as="textarea"
                  rows={12}
                  {...register('body_html')}
                  isInvalid={!!errors.body_html}
                  placeholder={t('emailTemplates.htmlBodyPlaceholder', 'HTML email content with {{variables}}')}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.body_html?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.plainTextBody', 'Plain Text Body')}</Form.Label>
                <Form.Control
                  id="body_text"
                  as="textarea"
                  rows={8}
                  {...register('body_text')}
                  isInvalid={!!errors.body_text}
                  placeholder={t('emailTemplates.plainTextPlaceholder', 'Plain text version (optional - auto-generated from HTML if empty)')}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
                <Form.Text className="text-muted">
                  {t('emailTemplates.plainTextHelp', 'Leave empty to auto-generate from HTML')}
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => onHide(false)} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              isEditing ? t('emailTemplates.updateTemplate', 'Update Template') : t('emailTemplates.createTemplate', 'Create Template')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EmailTemplateModal;
