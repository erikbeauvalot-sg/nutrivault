/**
 * MeasureTranslationModal Component
 *
 * Manage translations for measure definitions
 * Supports multiple languages with bulk save
 *
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Tabs, Tab, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as measureService from '../services/measureService';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

function MeasureTranslationModal({ show, onHide, measure, onSuccess }) {
  const { t } = useTranslation();

  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('en');

  // Load translations when modal opens
  useEffect(() => {
    if (show && measure) {
      loadTranslations();
    }
  }, [show, measure]);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      setError(null);

      const allTranslations = await measureService.getAllMeasureTranslations(measure.id);

      // Initialize translations object with empty values for supported languages
      const initialTranslations = {};
      SUPPORTED_LANGUAGES.forEach(lang => {
        initialTranslations[lang.code] = {
          display_name: allTranslations[lang.code]?.display_name || '',
          description: allTranslations[lang.code]?.description || '',
          unit: allTranslations[lang.code]?.unit || ''
        };
      });

      setTranslations(initialTranslations);
    } catch (err) {
      console.error('Error loading translations:', err);
      setError(err.response?.data?.error || 'Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (languageCode, field, value) => {
    setTranslations(prev => ({
      ...prev,
      [languageCode]: {
        ...prev[languageCode],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Save translations for each language that has at least one field filled
      const savePromises = [];

      for (const [languageCode, fields] of Object.entries(translations)) {
        // Check if at least one field has content
        const hasContent = Object.values(fields).some(value => value && value.trim() !== '');

        if (hasContent) {
          savePromises.push(
            measureService.setMeasureTranslations(measure.id, languageCode, fields)
          );
        }
      }

      await Promise.all(savePromises);

      setSuccess(true);

      // Close modal after short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onHide();
      }, 1500);
    } catch (err) {
      console.error('Error saving translations:', err);
      setError(err.response?.data?.error || 'Failed to save translations');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onHide();
  };

  const getCompletionStatus = (languageCode) => {
    const fields = translations[languageCode];
    if (!fields) return { count: 0, total: 3, percentage: 0 };

    const completed = Object.values(fields).filter(value => value && value.trim() !== '').length;
    const total = 3; // display_name, description, unit

    return {
      count: completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  };

  if (!measure) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('measures.translations', 'Translations')} - {measure.display_name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            {t('measures.translationsSaved', 'Translations saved successfully!')}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="text-muted mt-2">{t('common.loading', 'Loading translations...')}</p>
          </div>
        ) : (
          <>
            <Alert variant="info" className="small mb-3">
              <strong>{t('measures.originalValues', 'Original values')}:</strong>
              <div className="mt-1">
                <strong>{t('measures.displayName', 'Display Name')}:</strong> {measure.display_name}
              </div>
              {measure.description && (
                <div>
                  <strong>{t('measures.description', 'Description')}:</strong> {measure.description}
                </div>
              )}
              {measure.unit && (
                <div>
                  <strong>{t('measures.unit', 'Unit')}:</strong> {measure.unit}
                </div>
              )}
            </Alert>

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              {SUPPORTED_LANGUAGES.map(lang => {
                const status = getCompletionStatus(lang.code);
                return (
                  <Tab
                    key={lang.code}
                    eventKey={lang.code}
                    title={
                      <span>
                        {lang.flag} {lang.name}{' '}
                        {status.count > 0 && (
                          <Badge bg={status.percentage === 100 ? 'success' : 'warning'}>
                            {status.count}/{status.total}
                          </Badge>
                        )}
                      </span>
                    }
                  >
                    <div className="pt-3">
                      <Form.Group className="mb-3">
                        <Form.Label>
                          {t('measures.displayName', 'Display Name')}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={translations[lang.code]?.display_name || ''}
                          onChange={(e) => handleChange(lang.code, 'display_name', e.target.value)}
                          placeholder={measure.display_name}
                        />
                        <Form.Text className="text-muted">
                          {t('measures.translationHintDisplayName', 'User-facing name in')} {lang.name}
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>
                          {t('measures.description', 'Description')}
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={translations[lang.code]?.description || ''}
                          onChange={(e) => handleChange(lang.code, 'description', e.target.value)}
                          placeholder={measure.description || ''}
                        />
                        <Form.Text className="text-muted">
                          {t('measures.translationHintDescription', 'Measure description in')} {lang.name}
                        </Form.Text>
                      </Form.Group>

                      {measure.unit && (
                        <Form.Group className="mb-3">
                          <Form.Label>
                            {t('measures.unit', 'Unit')}
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={translations[lang.code]?.unit || ''}
                            onChange={(e) => handleChange(lang.code, 'unit', e.target.value)}
                            placeholder={measure.unit}
                          />
                          <Form.Text className="text-muted">
                            {t('measures.translationHintUnit', 'Unit of measurement in')} {lang.name}
                          </Form.Text>
                        </Form.Group>
                      )}

                      {status.percentage === 100 && (
                        <Alert variant="success" className="small">
                          ✓ {t('measures.translationComplete', 'Translation complete')}
                        </Alert>
                      )}
                    </div>
                  </Tab>
                );
              })}
            </Tabs>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={saving}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={loading || saving || success}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('common.saving', 'Saving...')}
            </>
          ) : (
            t('common.save', 'Save Translations')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MeasureTranslationModal;
