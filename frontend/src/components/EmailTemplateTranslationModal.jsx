/**
 * Email Template Translation Modal
 * US-5.5.6: Email Template Multi-Language Support
 *
 * Modal for managing translations of email templates
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  Tab,
  Tabs,
  Row,
  Col
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import emailTemplateService from '../services/emailTemplateService';
import { SUPPORTED_LANGUAGES, getLanguageFlag, formatLanguageDisplay } from '../utils/languages';

const EmailTemplateTranslationModal = ({ show, onHide, template, onSaved }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [translations, setTranslations] = useState({});
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    body_html: '',
    body_text: ''
  });

  useEffect(() => {
    if (show && template?.id) {
      fetchTranslations();
    }
  }, [show, template]);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await emailTemplateService.getTranslations(template.id);
      const data = response.data?.data || {};

      setTranslations(data.translations || {});
      setAvailableLanguages(data.available_languages || []);

      // Set first available language as active tab, or first supported language
      if (data.available_languages?.length > 0) {
        setActiveTab(data.available_languages[0]);
        loadTranslationForLanguage(data.available_languages[0], data.translations);
      } else {
        // No translations yet, select first supported language
        const firstLang = SUPPORTED_LANGUAGES[0]?.code;
        if (firstLang) {
          setActiveTab(firstLang);
          setFormData({ subject: '', body_html: '', body_text: '' });
        }
      }
    } catch (err) {
      console.error('Error fetching translations:', err);
      setError(t('emailTemplates.translations.fetchError', 'Failed to load translations'));
    } finally {
      setLoading(false);
    }
  };

  const loadTranslationForLanguage = (langCode, translationsData = translations) => {
    const langTranslation = translationsData[langCode];
    if (langTranslation) {
      setFormData({
        subject: langTranslation.subject || '',
        body_html: langTranslation.body_html || '',
        body_text: langTranslation.body_text || ''
      });
    } else {
      setFormData({ subject: '', body_html: '', body_text: '' });
    }
  };

  const handleTabChange = (langCode) => {
    setActiveTab(langCode);
    loadTranslationForLanguage(langCode);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopyFromBase = async () => {
    try {
      const response = await emailTemplateService.getBaseContent(template.id);
      const content = response.data?.data || {};
      setFormData({
        subject: content.subject || '',
        body_html: content.body_html || '',
        body_text: content.body_text || ''
      });
      setSuccess(t('emailTemplates.translations.copiedFromBase', 'Content copied from base template'));
    } catch (err) {
      setError(t('emailTemplates.translations.copyError', 'Failed to copy base content'));
    }
  };

  const handleSave = async () => {
    if (!formData.subject || !formData.body_html) {
      setError(t('emailTemplates.translations.requiredFields', 'Subject and HTML body are required'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await emailTemplateService.saveTranslation(template.id, activeTab, formData);

      // Update local state
      setTranslations(prev => ({
        ...prev,
        [activeTab]: { ...formData }
      }));

      if (!availableLanguages.includes(activeTab)) {
        setAvailableLanguages(prev => [...prev, activeTab]);
      }

      setSuccess(t('emailTemplates.translations.saved', 'Translation saved successfully'));
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error saving translation:', err);
      setError(err.response?.data?.error || t('emailTemplates.translations.saveError', 'Failed to save translation'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('emailTemplates.translations.confirmDelete', 'Are you sure you want to delete this translation?'))) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await emailTemplateService.deleteTranslation(template.id, activeTab);

      // Update local state
      const newTranslations = { ...translations };
      delete newTranslations[activeTab];
      setTranslations(newTranslations);
      setAvailableLanguages(prev => prev.filter(l => l !== activeTab));

      // Clear form
      setFormData({ subject: '', body_html: '', body_text: '' });
      setSuccess(t('emailTemplates.translations.deleted', 'Translation deleted successfully'));
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error deleting translation:', err);
      setError(err.response?.data?.error || t('emailTemplates.translations.deleteError', 'Failed to delete translation'));
    } finally {
      setSaving(false);
    }
  };

  const hasTranslation = (langCode) => availableLanguages.includes(langCode);

  if (!template) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('emailTemplates.translations.title', 'Translations')}: {template.name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : (
          <>
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

            <div className="mb-3">
              <small className="text-muted">
                {t('emailTemplates.translations.baseLanguage', 'Base template language')}: <strong>EN</strong>
              </small>
              <div className="mt-1">
                {t('emailTemplates.translations.availableCount', 'Available translations')}:{' '}
                {availableLanguages.map(lang => (
                  <Badge key={lang} bg="success" className="me-1">
                    {formatLanguageDisplay(lang)}
                  </Badge>
                ))}
                {availableLanguages.length === 0 && (
                  <Badge bg="secondary">{t('emailTemplates.translations.none', 'None')}</Badge>
                )}
              </div>
            </div>

            <Tabs activeKey={activeTab} onSelect={handleTabChange} className="mb-3">
              {SUPPORTED_LANGUAGES.map(lang => (
                <Tab
                  key={lang.code}
                  eventKey={lang.code}
                  title={
                    <span>
                      {lang.flag} {lang.nativeName}
                      {hasTranslation(lang.code) && (
                        <Badge bg="success" className="ms-1" style={{ fontSize: '0.6em' }}>
                          {t('emailTemplates.translations.translated', 'Translated')}
                        </Badge>
                      )}
                    </span>
                  }
                />
              ))}
            </Tabs>

            <div className="mb-3 d-flex gap-2">
              <Button variant="outline-secondary" size="sm" onClick={handleCopyFromBase}>
                {t('emailTemplates.translations.copyFromBase', 'Copy from base template')}
              </Button>
              {hasTranslation(activeTab) && (
                <Button variant="outline-danger" size="sm" onClick={handleDelete} disabled={saving}>
                  {t('emailTemplates.translations.deleteTranslation', 'Delete translation')}
                </Button>
              )}
            </div>

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.subject', 'Subject')} *</Form.Label>
                <Form.Control
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder={t('emailTemplates.subjectPlaceholder', 'Email subject line')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.bodyHtml', 'HTML Body')} *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  name="body_html"
                  value={formData.body_html}
                  onChange={handleInputChange}
                  placeholder={t('emailTemplates.bodyHtmlPlaceholder', 'HTML email content')}
                  style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                />
                <Form.Text className="text-muted">
                  {t('emailTemplates.translations.variablesNote', 'Variables like {{patient_name}} remain the same across all languages.')}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('emailTemplates.bodyText', 'Plain Text Body')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  name="body_text"
                  value={formData.body_text}
                  onChange={handleInputChange}
                  placeholder={t('emailTemplates.bodyTextPlaceholder', 'Plain text version (optional)')}
                  style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                />
              </Form.Group>
            </Form>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('common.close', 'Close')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading || saving}>
          {saving ? (
            <>
              <Spinner size="sm" animation="border" className="me-1" />
              {t('common.saving', 'Saving...')}
            </>
          ) : (
            t('common.save', 'Save')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmailTemplateTranslationModal;
