/**
 * ImportEmailTemplatesModal Component
 * Modal for importing email templates from JSON file
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as emailTemplateService from '../services/emailTemplateService';

const CATEGORY_ICONS = {
  invoice: '\u{1F4B0}',
  document_share: '\u{1F4C4}',
  payment_reminder: '\u{1F514}',
  appointment_reminder: '\u{1F4C5}',
  follow_up: '\u{1F4CB}',
  general: '\u{2709}\u{FE0F}'
};

const INITIAL_OPTIONS = { skipExisting: true, updateExisting: false };

const ImportEmailTemplatesModal = ({ show, onHide, onSuccess, existingTemplates }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [importData, setImportData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const existingSlugs = useMemo(() => {
    if (!existingTemplates) return new Set();
    return new Set(existingTemplates.map(tpl => tpl.slug?.toLowerCase()));
  }, [existingTemplates]);

  const handleClose = useCallback(() => {
    setImportData(null);
    setSelectedIds([]);
    setSelectAll(true);
    setOptions(INITIAL_OPTIONS);
    setError(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onHide();
  }, [onHide]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError(null);
      setImportResults(null);

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.templates || !Array.isArray(data.templates)) {
        throw new Error(t('emailTemplates.invalidFileFormat', 'Invalid file format. Expected a NutriVault email templates export file.'));
      }

      setImportData(data);
      setSelectedIds(data.templates.map((_, index) => index));
      setSelectAll(true);
    } catch (err) {
      console.error('File read error:', err);
      const errorMessage = err instanceof SyntaxError
        ? t('emailTemplates.invalidJson', 'Invalid JSON file. Please select a valid export file.')
        : err.message || t('emailTemplates.fileReadError', 'Failed to read file');
      setError(errorMessage);
      setImportData(null);
    }
  };

  const handleSelectAllChange = useCallback((checked) => {
    setSelectAll(checked);
    if (checked && importData) {
      setSelectedIds(importData.templates.map((_, index) => index));
    } else {
      setSelectedIds([]);
    }
  }, [importData]);

  const handleTemplateToggle = useCallback((index) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(index);
      const newIds = isSelected
        ? prev.filter(id => id !== index)
        : [...prev, index];
      setSelectAll(importData && newIds.length === importData.templates.length);
      return newIds;
    });
  }, [importData]);

  const templateExists = useCallback((slug) => {
    return existingSlugs.has(slug?.toLowerCase());
  }, [existingSlugs]);

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      setError(t('emailTemplates.noTemplatesToImport', 'Please select at least one template to import.'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedTemplates = importData.templates.filter((_, index) => selectedIds.includes(index));
      const dataToImport = { ...importData, templates: selectedTemplates };
      const result = await emailTemplateService.importTemplates(dataToImport, options);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults(result.data);
      onSuccess?.();
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || t('emailTemplates.importError', 'Failed to import email templates'));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!importData) return { templates: 0, existing: 0 };

    const selected = importData.templates.filter((_, index) => selectedIds.includes(index));
    return {
      templates: selected.length,
      existing: selected.filter(tpl => templateExists(tpl.slug)).length
    };
  }, [importData, selectedIds, templateExists]);

  const getCategoryIcon = (category) => CATEGORY_ICONS[category] || '\u{2709}\u{FE0F}';

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('emailTemplates.importTitle', 'Import Email Templates')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Import Results */}
        {importResults && (
          <Alert variant="success">
            <Alert.Heading>{t('emailTemplates.importComplete', 'Import Complete!')}</Alert.Heading>
            <hr />
            <div className="d-flex flex-wrap gap-3">
              <div>
                <strong>{t('emailTemplates.templatesCreated', 'Templates Created:')}</strong> {importResults.templatesCreated}
              </div>
              <div>
                <strong>{t('emailTemplates.templatesUpdated', 'Templates Updated:')}</strong> {importResults.templatesUpdated}
              </div>
              <div>
                <strong>{t('emailTemplates.templatesSkipped', 'Templates Skipped:')}</strong> {importResults.templatesSkipped}
              </div>
              <div>
                <strong>{t('emailTemplates.translationsCreated', 'Translations Created:')}</strong> {importResults.translationsCreated}
              </div>
            </div>
            {importResults.errors && importResults.errors.length > 0 && (
              <>
                <hr />
                <strong className="text-danger">{t('emailTemplates.importErrors', 'Errors:')}</strong>
                <ul className="mb-0">
                  {importResults.errors.map((err, idx) => (
                    <li key={idx} className="text-danger">
                      {err.type}: {err.name} - {err.error}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Alert>
        )}

        {/* File Selection (only show if no import results) */}
        {!importResults && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>{t('emailTemplates.selectFile', 'Select Export File')}</Form.Label>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                {t('emailTemplates.fileHint', 'Select a JSON file exported from NutriVault.')}
              </Form.Text>
            </Form.Group>

            {/* File Info */}
            {importData && (
              <>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('emailTemplates.fileInfo', 'File Information')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-3">
                      <div>
                        <small className="text-muted">{t('emailTemplates.exportVersion', 'Version:')}</small>
                        <div>{importData.version || 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('emailTemplates.exportDateLabel', 'Export Date:')}</small>
                        <div>{importData.exportDate ? new Date(importData.exportDate).toLocaleString() : 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('emailTemplates.totalTemplates', 'Total Templates:')}</small>
                        <div>{importData.templates.length}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Import Options */}
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('emailTemplates.importOptions', 'Import Options')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <Form.Check
                      type="radio"
                      id="email-tpl-option-skip"
                      name="emailTplImportOption"
                      label={t('emailTemplates.optionSkipExisting', 'Skip existing templates (keep current data)')}
                      checked={options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: true, updateExisting: false })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="email-tpl-option-update"
                      name="emailTplImportOption"
                      label={t('emailTemplates.optionUpdateExisting', 'Update existing templates (merge with imported data)')}
                      checked={options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: true })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="email-tpl-option-rename"
                      name="emailTplImportOption"
                      label={t('emailTemplates.optionRenameExisting', 'Create new templates with "(imported)" suffix for duplicates')}
                      checked={!options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: false })}
                    />
                  </Card.Body>
                </Card>

                {/* Select All Checkbox */}
                <Form.Check
                  type="checkbox"
                  id="import-select-all-email-templates"
                  label={<strong>{t('emailTemplates.selectAllTemplates', 'Select All')}</strong>}
                  checked={selectAll}
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  className="mb-3"
                />

                {/* Template List */}
                <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {importData.templates.map((template, index) => (
                    <ListGroup.Item
                      key={index}
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleTemplateToggle(index)}
                    >
                      <Form.Check
                        type="checkbox"
                        id={`import-email-template-${index}`}
                        checked={selectedIds.includes(index)}
                        onChange={() => handleTemplateToggle(index)}
                        onClick={(e) => e.stopPropagation()}
                        label={
                          <div>
                            <span className="me-2">{getCategoryIcon(template.category)}</span>
                            <strong>{template.name}</strong>
                            {templateExists(template.slug) && (
                              <Badge bg="warning" className="ms-2" text="dark">
                                {t('emailTemplates.exists', 'Exists')}
                              </Badge>
                            )}
                            <small className="text-muted d-block ms-4">
                              <code>{template.slug}</code>
                            </small>
                          </div>
                        }
                      />
                      <div className="d-flex gap-2">
                        <Badge bg="light" text="dark">
                          {template.category || 'general'}
                        </Badge>
                        {template.is_system && (
                          <Badge bg="warning" text="dark">System</Badge>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>

                {/* Selection Summary */}
                {selectedIds.length > 0 && (
                  <Alert variant="info">
                    {t('emailTemplates.importSummary', 'Will import {{templates}} templates.', {
                      templates: stats.templates
                    })}
                    {stats.existing > 0 && (
                      <span className="d-block mt-1">
                        {t('emailTemplates.existingWarning', '{{count}} of these templates already exist.', {
                          count: stats.existing
                        })}
                      </span>
                    )}
                  </Alert>
                )}
              </>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {importResults ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
        </Button>
        {!importResults && (
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || !importData || selectedIds.length === 0}
          >
            {loading && <Spinner animation="border" size="sm" className="me-2" />}
            {loading
              ? t('emailTemplates.importing', 'Importing...')
              : t('emailTemplates.import', 'Import')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ImportEmailTemplatesModal;
