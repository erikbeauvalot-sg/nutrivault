/**
 * ImportCustomFieldsModal Component
 * Modal for importing custom field categories from JSON file
 */

import { useState, useRef, useCallback } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';

// Shared styles for category color indicator
const colorDotStyle = (color) => ({
  display: 'inline-block',
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: color || '#3498db'
});

const INITIAL_OPTIONS = { skipExisting: true, updateExisting: false };

const ImportCustomFieldsModal = ({ show, onHide, onSuccess, existingCategories }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [importData, setImportData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importResults, setImportResults] = useState(null);

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

      if (!data.categories || !Array.isArray(data.categories)) {
        throw new Error(t('customFields.invalidFileFormat', 'Invalid file format. Expected a NutriVault export file.'));
      }

      setImportData(data);
      setSelectedIds(data.categories.map((_, index) => index));
      setSelectAll(true);
    } catch (err) {
      console.error('File read error:', err);
      const errorMessage = err instanceof SyntaxError
        ? t('customFields.invalidJson', 'Invalid JSON file. Please select a valid export file.')
        : err.message || t('customFields.fileReadError', 'Failed to read file');
      setError(errorMessage);
      setImportData(null);
    }
  };

  const handleSelectAllChange = useCallback((checked) => {
    setSelectAll(checked);
    if (checked && importData) {
      setSelectedIds(importData.categories.map((_, index) => index));
    } else {
      setSelectedIds([]);
    }
  }, [importData]);

  const handleCategoryToggle = useCallback((index) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(index);
      const newIds = isSelected
        ? prev.filter(id => id !== index)
        : [...prev, index];
      setSelectAll(importData && newIds.length === importData.categories.length);
      return newIds;
    });
  }, [importData]);

  const categoryExists = useCallback((categoryName) => {
    return existingCategories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
  }, [existingCategories]);

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      setError(t('customFields.noCategoriesToImport', 'Please select at least one category to import.'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedCategories = importData.categories.filter((_, index) => selectedIds.includes(index));
      const dataToImport = { ...importData, categories: selectedCategories };
      const result = await customFieldService.importCategories(dataToImport, options);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults(result.data);
      onSuccess?.();
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || t('customFields.importError', 'Failed to import custom fields'));
    } finally {
      setLoading(false);
    }
  };

  const stats = (() => {
    if (!importData) return { categories: 0, definitions: 0, existing: 0 };

    const selected = importData.categories.filter((_, index) => selectedIds.includes(index));
    return {
      categories: selected.length,
      definitions: selected.reduce((sum, cat) => sum + (cat.field_definitions?.length || 0), 0),
      existing: selected.filter(cat => categoryExists(cat.name)).length
    };
  })();

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('customFields.importTitle', 'Import Custom Fields')}
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
            <Alert.Heading>{t('customFields.importComplete', 'Import Complete!')}</Alert.Heading>
            <hr />
            <div className="d-flex flex-wrap gap-3">
              <div>
                <strong>{t('customFields.categoriesCreated', 'Categories Created:')}</strong> {importResults.categoriesCreated}
              </div>
              <div>
                <strong>{t('customFields.categoriesUpdated', 'Categories Updated:')}</strong> {importResults.categoriesUpdated}
              </div>
              <div>
                <strong>{t('customFields.categoriesSkipped', 'Categories Skipped:')}</strong> {importResults.categoriesSkipped}
              </div>
              <div>
                <strong>{t('customFields.fieldsCreated', 'Fields Created:')}</strong> {importResults.definitionsCreated}
              </div>
              <div>
                <strong>{t('customFields.fieldsUpdated', 'Fields Updated:')}</strong> {importResults.definitionsUpdated}
              </div>
              <div>
                <strong>{t('customFields.fieldsSkipped', 'Fields Skipped:')}</strong> {importResults.definitionsSkipped}
              </div>
            </div>
            {importResults.errors && importResults.errors.length > 0 && (
              <>
                <hr />
                <strong className="text-danger">{t('customFields.importErrors', 'Errors:')}</strong>
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
              <Form.Label>{t('customFields.selectFile', 'Select Export File')}</Form.Label>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                {t('customFields.fileHint', 'Select a JSON file exported from NutriVault.')}
              </Form.Text>
            </Form.Group>

            {/* File Info */}
            {importData && (
              <>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('customFields.fileInfo', 'File Information')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-3">
                      <div>
                        <small className="text-muted">{t('customFields.exportVersion', 'Version:')}</small>
                        <div>{importData.version || 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('customFields.exportDate', 'Export Date:')}</small>
                        <div>{importData.exportDate ? new Date(importData.exportDate).toLocaleString() : 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('customFields.exportedBy', 'Exported By:')}</small>
                        <div>{importData.exportedBy || 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('customFields.totalCategories', 'Total Categories:')}</small>
                        <div>{importData.categories.length}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Import Options */}
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('customFields.importOptions', 'Import Options')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <Form.Check
                      type="radio"
                      id="option-skip"
                      name="importOption"
                      label={t('customFields.optionSkipExisting', 'Skip existing categories (keep current data)')}
                      checked={options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: true, updateExisting: false })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="option-update"
                      name="importOption"
                      label={t('customFields.optionUpdateExisting', 'Update existing categories (merge with imported data)')}
                      checked={options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: true })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="option-rename"
                      name="importOption"
                      label={t('customFields.optionRenameExisting', 'Create new categories with "(imported)" suffix for duplicates')}
                      checked={!options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: false })}
                    />
                  </Card.Body>
                </Card>

                {/* Select All Checkbox */}
                <Form.Check
                  type="checkbox"
                  id="import-select-all"
                  label={<strong>{t('customFields.selectAll', 'Select All')}</strong>}
                  checked={selectAll}
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  className="mb-3"
                />

                {/* Category List */}
                <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {importData.categories.map((category, index) => (
                    <ListGroup.Item
                      key={index}
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleCategoryToggle(index)}
                    >
                      <Form.Check
                        type="checkbox"
                        id={`import-category-${index}`}
                        checked={selectedIds.includes(index)}
                        onChange={() => handleCategoryToggle(index)}
                        onClick={(e) => e.stopPropagation()}
                        label={
                          <div>
                            <span className="me-2" style={colorDotStyle(category.color)} />
                            <strong>{category.name}</strong>
                            {categoryExists(category.name) && (
                              <Badge bg="warning" className="ms-2" text="dark">
                                {t('customFields.exists', 'Exists')}
                              </Badge>
                            )}
                            {category.description && (
                              <small className="text-muted d-block ms-4">{category.description}</small>
                            )}
                          </div>
                        }
                      />
                      <div className="d-flex gap-2">
                        {(category.entity_types || ['patient']).includes('patient') && (
                          <Badge bg="primary" className="me-1">Patient</Badge>
                        )}
                        {(category.entity_types || ['patient']).includes('visit') && (
                          <Badge bg="info">Visit</Badge>
                        )}
                        <Badge bg="secondary">
                          {category.field_definitions?.length || 0} {t('customFields.fields', 'fields')}
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>

                {/* Selection Summary */}
                {selectedIds.length > 0 && (
                  <Alert variant="info">
                    {t('customFields.importSummary', 'Will import {{categories}} categories with {{definitions}} field definitions.', {
                      categories: stats.categories,
                      definitions: stats.definitions
                    })}
                    {stats.existing > 0 && (
                      <span className="d-block mt-1">
                        {t('customFields.existingWarning', '{{count}} of these categories already exist.', {
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
              ? t('customFields.importing', 'Importing...')
              : t('customFields.import', 'Import')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ImportCustomFieldsModal;
