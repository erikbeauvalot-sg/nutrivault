/**
 * ImportMeasuresModal Component
 * Modal for importing measure definitions from JSON file
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as measureService from '../services/measureService';

const CATEGORY_ICONS = {
  vitals: '\u{1F493}',
  lab_results: '\u{1F9EA}',
  anthropometric: '\u{1F4CF}',
  lifestyle: '\u{1F3C3}',
  symptoms: '\u{1F912}',
  other: '\u{1F4CA}'
};

const INITIAL_OPTIONS = { skipExisting: true, updateExisting: false };

const ImportMeasuresModal = ({ show, onHide, onSuccess, existingMeasures }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [importData, setImportData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const existingNames = useMemo(() => {
    if (!existingMeasures) return new Set();
    return new Set(existingMeasures.map(m => m.name.toLowerCase()));
  }, [existingMeasures]);

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

      if (!data.measures || !Array.isArray(data.measures)) {
        throw new Error(t('measures.invalidFileFormat', 'Invalid file format. Expected a NutriVault measures export file.'));
      }

      setImportData(data);
      setSelectedIds(data.measures.map((_, index) => index));
      setSelectAll(true);
    } catch (err) {
      console.error('File read error:', err);
      const errorMessage = err instanceof SyntaxError
        ? t('measures.invalidJson', 'Invalid JSON file. Please select a valid export file.')
        : err.message || t('measures.fileReadError', 'Failed to read file');
      setError(errorMessage);
      setImportData(null);
    }
  };

  const handleSelectAllChange = useCallback((checked) => {
    setSelectAll(checked);
    if (checked && importData) {
      setSelectedIds(importData.measures.map((_, index) => index));
    } else {
      setSelectedIds([]);
    }
  }, [importData]);

  const handleMeasureToggle = useCallback((index) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(index);
      const newIds = isSelected
        ? prev.filter(id => id !== index)
        : [...prev, index];
      setSelectAll(importData && newIds.length === importData.measures.length);
      return newIds;
    });
  }, [importData]);

  const measureExists = useCallback((name) => {
    return existingNames.has(name.toLowerCase());
  }, [existingNames]);

  const handleImport = async () => {
    if (selectedIds.length === 0) {
      setError(t('measures.noMeasuresToImport', 'Please select at least one measure to import.'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedMeasures = importData.measures.filter((_, index) => selectedIds.includes(index));
      const dataToImport = { ...importData, measures: selectedMeasures };
      const result = await measureService.importMeasures(dataToImport, options);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults(result.data);
      onSuccess?.();
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || t('measures.importError', 'Failed to import measures'));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!importData) return { measures: 0, existing: 0 };

    const selected = importData.measures.filter((_, index) => selectedIds.includes(index));
    return {
      measures: selected.length,
      existing: selected.filter(m => measureExists(m.name)).length
    };
  }, [importData, selectedIds, measureExists]);

  const getCategoryIcon = (category) => CATEGORY_ICONS[category] || '\u{1F4CA}';

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('measures.importTitle', 'Import Measures')}
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
            <Alert.Heading>{t('measures.importComplete', 'Import Complete!')}</Alert.Heading>
            <hr />
            <div className="d-flex flex-wrap gap-3">
              <div>
                <strong>{t('measures.measuresCreated', 'Measures Created:')}</strong> {importResults.measuresCreated}
              </div>
              <div>
                <strong>{t('measures.measuresUpdated', 'Measures Updated:')}</strong> {importResults.measuresUpdated}
              </div>
              <div>
                <strong>{t('measures.measuresSkipped', 'Measures Skipped:')}</strong> {importResults.measuresSkipped}
              </div>
              <div>
                <strong>{t('measures.translationsCreated', 'Translations Created:')}</strong> {importResults.translationsCreated}
              </div>
            </div>
            {importResults.errors && importResults.errors.length > 0 && (
              <>
                <hr />
                <strong className="text-danger">{t('measures.importErrors', 'Errors:')}</strong>
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
              <Form.Label>{t('measures.selectFile', 'Select Export File')}</Form.Label>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                {t('measures.fileHint', 'Select a JSON file exported from NutriVault.')}
              </Form.Text>
            </Form.Group>

            {/* File Info */}
            {importData && (
              <>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('measures.fileInfo', 'File Information')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-3">
                      <div>
                        <small className="text-muted">{t('measures.exportVersion', 'Version:')}</small>
                        <div>{importData.version || 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('measures.exportDate', 'Export Date:')}</small>
                        <div>{importData.exportDate ? new Date(importData.exportDate).toLocaleString() : 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('measures.exportedBy', 'Exported By:')}</small>
                        <div>{importData.exportedBy || 'N/A'}</div>
                      </div>
                      <div>
                        <small className="text-muted">{t('measures.totalMeasures', 'Total Measures:')}</small>
                        <div>{importData.measures.length}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Import Options */}
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{t('measures.importOptions', 'Import Options')}</strong>
                  </Card.Header>
                  <Card.Body>
                    <Form.Check
                      type="radio"
                      id="option-skip"
                      name="importOption"
                      label={t('measures.optionSkipExisting', 'Skip existing measures (keep current data)')}
                      checked={options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: true, updateExisting: false })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="option-update"
                      name="importOption"
                      label={t('measures.optionUpdateExisting', 'Update existing measures (merge with imported data)')}
                      checked={options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: true })}
                      className="mb-2"
                    />
                    <Form.Check
                      type="radio"
                      id="option-rename"
                      name="importOption"
                      label={t('measures.optionRenameExisting', 'Create new measures with "(imported)" suffix for duplicates')}
                      checked={!options.skipExisting && !options.updateExisting}
                      onChange={() => setOptions({ skipExisting: false, updateExisting: false })}
                    />
                  </Card.Body>
                </Card>

                {/* Select All Checkbox */}
                <Form.Check
                  type="checkbox"
                  id="import-select-all"
                  label={<strong>{t('measures.selectAllMeasures', 'Select All')}</strong>}
                  checked={selectAll}
                  onChange={(e) => handleSelectAllChange(e.target.checked)}
                  className="mb-3"
                />

                {/* Measure List */}
                <ListGroup className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {importData.measures.map((measure, index) => (
                    <ListGroup.Item
                      key={index}
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleMeasureToggle(index)}
                    >
                      <Form.Check
                        type="checkbox"
                        id={`import-measure-${index}`}
                        checked={selectedIds.includes(index)}
                        onChange={() => handleMeasureToggle(index)}
                        onClick={(e) => e.stopPropagation()}
                        label={
                          <div>
                            <span className="me-2">{getCategoryIcon(measure.category)}</span>
                            <strong>{measure.display_name}</strong>
                            {measureExists(measure.name) && (
                              <Badge bg="warning" className="ms-2" text="dark">
                                {t('measures.exists', 'Exists')}
                              </Badge>
                            )}
                            <small className="text-muted d-block ms-4">
                              <code>{measure.name}</code>
                              {measure.unit && <span className="ms-2">({measure.unit})</span>}
                            </small>
                          </div>
                        }
                      />
                      <div className="d-flex gap-2">
                        <Badge bg="light" text="dark">
                          {measure.category || 'other'}
                        </Badge>
                        <Badge bg={measure.measure_type === 'calculated' ? 'warning' : 'primary'}>
                          {measure.measure_type || 'numeric'}
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>

                {/* Selection Summary */}
                {selectedIds.length > 0 && (
                  <Alert variant="info">
                    {t('measures.importSummary', 'Will import {{measures}} measures.', {
                      measures: stats.measures
                    })}
                    {stats.existing > 0 && (
                      <span className="d-block mt-1">
                        {t('measures.existingWarning', '{{count}} of these measures already exist.', {
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
              ? t('measures.importing', 'Importing...')
              : t('measures.import', 'Import')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ImportMeasuresModal;
