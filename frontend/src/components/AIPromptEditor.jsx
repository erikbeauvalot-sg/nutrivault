/**
 * AI Prompt Editor Modal
 * Component for creating and editing AI prompts
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
  Badge,
  Tab,
  Tabs
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaSave,
  FaTimes,
  FaPlay,
  FaInfoCircle
} from 'react-icons/fa';
import aiPromptService from '../services/aiPromptService';

// Usage types with descriptions
const USAGE_TYPES = [
  { value: 'followup', labelKey: 'aiPrompt.usageFollowup', descKey: 'aiPrompt.usageFollowupDesc' },
  { value: 'invitation', labelKey: 'aiPrompt.usageInvitation', descKey: 'aiPrompt.usageInvitationDesc' },
  { value: 'relance', labelKey: 'aiPrompt.usageRelance', descKey: 'aiPrompt.usageRelanceDesc' },
  { value: 'welcome', labelKey: 'aiPrompt.usageWelcome', descKey: 'aiPrompt.usageWelcomeDesc' }
];

// Supported languages
const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

// Default variables for each usage type (sent to AI - anonymized data)
const DEFAULT_VARIABLES = {
  followup: [
    'patient_name', 'dietitian_name', 'visit_date', 'visit_type',
    'visit_custom_fields', 'visit_measurements',
    'patient_custom_fields', 'patient_measures',
    'next_visit_date', 'tone'
  ],
  invitation: [
    'patient_name', 'dietitian_name', 'appointment_date', 'appointment_time',
    'clinic_name', 'clinic_address', 'clinic_phone'
  ],
  relance: [
    'patient_name', 'dietitian_name', 'last_visit_date',
    'amount_due', 'invoice_number', 'due_date'
  ],
  welcome: [
    'patient_name', 'dietitian_name', 'clinic_name',
    'first_appointment_date', 'clinic_phone', 'clinic_email'
  ]
};

// Template placeholders - NOT sent to AI, substituted by backend with real PII data
// These allow GDPR compliance by not sending personal data to AI
const TEMPLATE_PLACEHOLDERS = [
  { placeholder: '{{PATIENT_NAME}}', descKey: 'aiPrompt.placeholderPatientName' },
  { placeholder: '{{PATIENT_FIRST_NAME}}', descKey: 'aiPrompt.placeholderPatientFirstName' },
  { placeholder: '{{DIETITIAN_NAME}}', descKey: 'aiPrompt.placeholderDietitianName' },
  { placeholder: '{{NEXT_APPOINTMENT_DATE}}', descKey: 'aiPrompt.placeholderNextAppointment' },
  { placeholder: '{{CLINIC_NAME}}', descKey: 'aiPrompt.placeholderClinicName' },
  { placeholder: '{{CLINIC_PHONE}}', descKey: 'aiPrompt.placeholderClinicPhone' }
];

const AIPromptEditor = ({ show, onHide, prompt, onSaved }) => {
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    usage: 'followup',
    name: '',
    description: '',
    language_code: 'fr',
    system_prompt: '',
    user_prompt_template: '',
    available_variables: [],
    is_active: true,
    is_default: false
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('system');

  // Initialize form when prompt changes
  useEffect(() => {
    if (prompt) {
      setFormData({
        usage: prompt.usage || 'followup',
        name: prompt.name || '',
        description: prompt.description || '',
        language_code: prompt.language_code || 'fr',
        system_prompt: prompt.system_prompt || '',
        user_prompt_template: prompt.user_prompt_template || '',
        available_variables: prompt.available_variables || DEFAULT_VARIABLES[prompt.usage] || [],
        is_active: prompt.is_active !== false,
        is_default: prompt.is_default || false
      });
    } else {
      // Reset to default for new prompt
      setFormData({
        usage: 'followup',
        name: '',
        description: '',
        language_code: 'fr',
        system_prompt: '',
        user_prompt_template: '',
        available_variables: DEFAULT_VARIABLES.followup,
        is_active: true,
        is_default: false
      });
    }
    setError(null);
    setSuccess(null);
    setTestResult(null);
    setActiveTab('system');
  }, [prompt, show]);

  // Update available variables when usage changes
  useEffect(() => {
    if (!prompt) {
      setFormData(prev => ({
        ...prev,
        available_variables: DEFAULT_VARIABLES[prev.usage] || []
      }));
    }
  }, [formData.usage, prompt]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.name || !formData.name.trim()) {
      setError(t('aiPrompt.errorNameRequired'));
      return;
    }
    if (!formData.system_prompt || !formData.system_prompt.trim()) {
      setError(t('aiPrompt.errorSystemPromptRequired'));
      return;
    }
    if (!formData.user_prompt_template || !formData.user_prompt_template.trim()) {
      setError(t('aiPrompt.errorUserPromptRequired'));
      return;
    }

    try {
      setLoading(true);

      let result;
      if (prompt?.id) {
        result = await aiPromptService.update(prompt.id, formData);
      } else {
        result = await aiPromptService.create(formData);
      }

      setSuccess(t('aiPrompt.savedSuccess'));

      // Notify parent and close after a short delay
      setTimeout(() => {
        if (onSaved) onSaved(result.data);
        onHide();
      }, 1000);
    } catch (err) {
      console.error('Error saving prompt:', err);
      const errorMessage = err.response?.data?.error || err.message || t('aiPrompt.saveError');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!prompt?.id) {
      setError(t('aiPrompt.saveBeforeTest'));
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const result = await aiPromptService.test(prompt.id);
      setTestResult(result.data);
    } catch (err) {
      console.error('Error testing prompt:', err);
      setError(err.response?.data?.error || t('aiPrompt.testError'));
    } finally {
      setTesting(false);
    }
  };

  const insertVariable = (variable) => {
    const fieldName = activeTab === 'system' ? 'system_prompt' : 'user_prompt_template';
    const currentValue = formData[fieldName];
    const textarea = document.getElementById(`textarea-${fieldName}`);

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = currentValue.substring(0, start) + `{{${variable}}}` + currentValue.substring(end);

      setFormData(prev => ({
        ...prev,
        [fieldName]: newValue
      }));

      // Restore cursor position after the inserted variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4;
        textarea.focus();
      }, 0);
    } else {
      // Fallback: append at end
      setFormData(prev => ({
        ...prev,
        [fieldName]: prev[fieldName] + `{{${variable}}}`
      }));
    }
  };

  const insertPlaceholder = (placeholder) => {
    const fieldName = activeTab === 'system' ? 'system_prompt' : 'user_prompt_template';
    const currentValue = formData[fieldName];
    const textarea = document.getElementById(`textarea-${fieldName}`);

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);

      setFormData(prev => ({
        ...prev,
        [fieldName]: newValue
      }));

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }, 0);
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: prev[fieldName] + placeholder
      }));
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {prompt?.id ? t('aiPrompt.editTitle') : t('aiPrompt.createTitle')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Alerts */}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Basic Info */}
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('aiPrompt.usage')} *</Form.Label>
                <Form.Select
                  name="usage"
                  value={formData.usage}
                  onChange={handleChange}
                  disabled={!!prompt?.id}
                >
                  {USAGE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  {t(USAGE_TYPES.find(u => u.value === formData.usage)?.descKey || '')}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('aiPrompt.language')} *</Form.Label>
                <Form.Select
                  name="language_code"
                  value={formData.language_code}
                  onChange={handleChange}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('aiPrompt.name')} *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('aiPrompt.namePlaceholder')}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={8}>
              <Form.Group>
                <Form.Label>{t('aiPrompt.description')}</Form.Label>
                <Form.Control
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('aiPrompt.descriptionPlaceholder')}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="d-flex flex-column">
                <Form.Label>&nbsp;</Form.Label>
                <div className="d-flex gap-3 mt-2">
                  <Form.Check
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    label={t('aiPrompt.active')}
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <Form.Check
                    type="checkbox"
                    id="is_default"
                    name="is_default"
                    label={t('aiPrompt.default')}
                    checked={formData.is_default}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>

          {/* Available Variables - Sent to AI */}
          <div className="mb-3 p-3 bg-light rounded">
            <Form.Label className="d-flex align-items-center">
              <FaInfoCircle className="me-2 text-primary" />
              {t('aiPrompt.availableVariables')}
            </Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {formData.available_variables.map(variable => (
                <Badge
                  key={variable}
                  bg="secondary"
                  className="cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => insertVariable(variable)}
                  title={t('aiPrompt.clickToInsert')}
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
            <Form.Text className="text-muted">
              {t('aiPrompt.variablesHelp')}
            </Form.Text>
          </div>

          {/* Template Placeholders - NOT sent to AI (GDPR) */}
          <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
            <Form.Label className="d-flex align-items-center">
              <FaInfoCircle className="me-2 text-warning" />
              {t('aiPrompt.templatePlaceholders')}
            </Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {TEMPLATE_PLACEHOLDERS.map(item => (
                <Badge
                  key={item.placeholder}
                  bg="warning"
                  text="dark"
                  style={{ cursor: 'pointer' }}
                  onClick={() => insertPlaceholder(item.placeholder)}
                  title={t(item.descKey)}
                >
                  {item.placeholder}
                </Badge>
              ))}
            </div>
            <Form.Text className="text-dark">
              <strong>{t('aiPrompt.gdprNote')}</strong> {t('aiPrompt.templatePlaceholdersHelp')}
            </Form.Text>
          </div>

          {/* Prompt Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="system" title={t('aiPrompt.systemPrompt')}>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  id="textarea-system_prompt"
                  name="system_prompt"
                  value={formData.system_prompt}
                  onChange={handleChange}
                  rows={12}
                  placeholder={t('aiPrompt.systemPromptPlaceholder')}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  required
                />
                <Form.Text className="text-muted">
                  {t('aiPrompt.systemPromptHelp')}
                </Form.Text>
              </Form.Group>
            </Tab>
            <Tab eventKey="user" title={t('aiPrompt.userPromptTemplate')}>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  id="textarea-user_prompt_template"
                  name="user_prompt_template"
                  value={formData.user_prompt_template}
                  onChange={handleChange}
                  rows={12}
                  placeholder={t('aiPrompt.userPromptPlaceholder')}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  required
                />
                <Form.Text className="text-muted">
                  {t('aiPrompt.userPromptHelp')}
                </Form.Text>
              </Form.Group>
            </Tab>
            {testResult && (
              <Tab eventKey="preview" title={t('aiPrompt.preview')}>
                <div className="p-3 bg-light rounded">
                  <h6>{t('aiPrompt.systemPrompt')}:</h6>
                  <pre className="bg-white p-3 rounded" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {testResult.system_prompt}
                  </pre>
                  <h6 className="mt-3">{t('aiPrompt.userPromptTemplate')}:</h6>
                  <pre className="bg-white p-3 rounded" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {testResult.user_prompt}
                  </pre>
                </div>
              </Tab>
            )}
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            <FaTimes className="me-2" />
            {t('common.cancel')}
          </Button>
          {prompt?.id && (
            <Button
              variant="outline-primary"
              onClick={handleTest}
              disabled={testing || loading}
            >
              {testing ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('aiPrompt.testing')}
                </>
              ) : (
                <>
                  <FaPlay className="me-2" />
                  {t('aiPrompt.testPrompt')}
                </>
              )}
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                {t('common.save')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AIPromptEditor;
