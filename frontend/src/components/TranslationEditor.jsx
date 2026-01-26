/**
 * TranslationEditor Component
 * Reusable component for editing translations of custom field entities
 */

import { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, Badge, ButtonGroup, Card, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' }
  // Future: Add more languages here
  // { code: 'es', name: 'Español', flag: '🇪🇸' },
  // { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

/**
 * TranslationEditor component
 *
 * @param {Object} props
 * @param {string} props.entityType - 'category' or 'field_definition'
 * @param {string} props.entityId - UUID of the entity
 * @param {Object} props.originalValues - Original French values { name, description } or { field_label, help_text }
 */
const TranslationEditor = ({ entityType, entityId, originalValues }) => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get field names based on entity type
  const getFieldNames = () => {
    if (entityType === 'category') {
      return ['name', 'description'];
    } else if (entityType === 'field_definition') {
      return ['field_label', 'help_text'];
    }
    return [];
  };

  const fieldNames = getFieldNames();

  // Load translations for the selected language
  useEffect(() => {
    if (entityId && selectedLanguage) {
      loadTranslations();
    }
  }, [entityId, selectedLanguage]);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await customFieldService.getTranslations(
        entityType,
        entityId,
        selectedLanguage
      );

      setTranslations(response.data || {});
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading translations:', err);
      // If no translations exist yet, that's ok - start with empty
      if (err.response?.status === 404) {
        setTranslations({});
      } else {
        setError(err.response?.data?.error || 'Failed to load translations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTranslationChange = (fieldName, value) => {
    setTranslations(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setHasUnsavedChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await customFieldService.setTranslations(
        entityType,
        entityId,
        selectedLanguage,
        translations
      );

      setSuccess(true);
      setHasUnsavedChanges(false);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving translations:', err);
      setError(err.response?.data?.error || 'Failed to save translations');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFromOriginal = () => {
    const newTranslations = {};
    fieldNames.forEach(fieldName => {
      if (originalValues[fieldName]) {
        newTranslations[fieldName] = originalValues[fieldName];
      }
    });
    setTranslations(newTranslations);
    setHasUnsavedChanges(true);
    setSuccess(false);
  };

  const isTranslationComplete = () => {
    return fieldNames.every(fieldName =>
      translations[fieldName] && translations[fieldName].trim() !== ''
    );
  };

  const getFieldLabel = (fieldName) => {
    const labels = {
      name: 'Category Name',
      description: 'Description',
      field_label: 'Field Label',
      help_text: 'Help Text'
    };
    return labels[fieldName] || fieldName;
  };

  const getFieldPlaceholder = (fieldName) => {
    if (originalValues[fieldName]) {
      return `French: "${originalValues[fieldName]}"`;
    }
    return `Enter ${getFieldLabel(fieldName).toLowerCase()} in ${AVAILABLE_LANGUAGES.find(l => l.code === selectedLanguage)?.name}`;
  };

  return (
    <div className="translation-editor" style={{ minHeight: '200px' }}>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          ✅ Translations saved successfully!
        </Alert>
      )}

      {/* Language Selector */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="mb-2">
                <strong>🌍 Target Language:</strong>
              </div>
              <ButtonGroup>
                {AVAILABLE_LANGUAGES.map(lang => (
                  <Button
                    key={lang.code}
                    variant={selectedLanguage === lang.code ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedLanguage(lang.code)}
                    disabled={loading || saving}
                  >
                    {lang.flag} {lang.name}
                  </Button>
                ))}
              </ButtonGroup>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              {isTranslationComplete() ? (
                <Badge bg="success" className="p-2">
                  ✅ Translation Complete
                </Badge>
              ) : (
                <Badge bg="warning" className="p-2">
                  ⚠️ Translation Incomplete
                </Badge>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading translations...</p>
        </div>
      )}

      {/* Translation Fields */}
      {!loading && (
        <>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>📝 Translation Fields</strong>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleCopyFromOriginal}
                disabled={saving}
              >
                📋 Copy from French
              </Button>
            </Card.Header>
            <Card.Body>
              {fieldNames.map(fieldName => (
                <Form.Group key={fieldName} className="mb-3">
                  <Form.Label>
                    {getFieldLabel(fieldName)}
                    {translations[fieldName]?.trim() ? (
                      <Badge bg="success" className="ms-2">✓</Badge>
                    ) : (
                      <Badge bg="secondary" className="ms-2">Empty</Badge>
                    )}
                  </Form.Label>

                  {/* Show original French value for reference */}
                  {originalValues[fieldName] && (
                    <div className="small text-muted mb-2">
                      <strong>🇫🇷 French:</strong> {originalValues[fieldName]}
                    </div>
                  )}

                  {fieldName === 'description' || fieldName === 'help_text' ? (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={translations[fieldName] || ''}
                      onChange={(e) => handleTranslationChange(fieldName, e.target.value)}
                      placeholder={getFieldPlaceholder(fieldName)}
                      disabled={saving}
                    />
                  ) : (
                    <Form.Control
                      type="text"
                      value={translations[fieldName] || ''}
                      onChange={(e) => handleTranslationChange(fieldName, e.target.value)}
                      placeholder={getFieldPlaceholder(fieldName)}
                      disabled={saving}
                    />
                  )}
                </Form.Group>
              ))}
            </Card.Body>
          </Card>

          {/* Save Button */}
          <div className="d-flex justify-content-end gap-2">
            {hasUnsavedChanges && (
              <Badge bg="warning" className="p-2 align-self-center">
                ⚠️ Unsaved changes
              </Badge>
            )}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                '💾 Save Translations'
              )}
            </Button>
          </div>
        </>
      )}

    </div>
  );
};

export default TranslationEditor;
