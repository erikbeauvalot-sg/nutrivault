/**
 * ExportMeasuresModal Component
 * Modal for selecting and exporting measure definitions with translations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as measureService from '../services/measureService';

const CATEGORIES = [
  { id: 'vitals', icon: '\u{1F493}' },
  { id: 'lab_results', icon: '\u{1F9EA}' },
  { id: 'anthropometric', icon: '\u{1F4CF}' },
  { id: 'lifestyle', icon: '\u{1F3C3}' },
  { id: 'symptoms', icon: '\u{1F912}' },
  { id: 'other', icon: '\u{1F4CA}' }
];

const ExportMeasuresModal = ({ show, onHide, measures }) => {
  const { t } = useTranslation();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Group measures by category
  const categoriesWithCounts = useMemo(() => {
    if (!measures || measures.length === 0) return [];

    const countMap = {};
    for (const m of measures) {
      const cat = m.category || 'other';
      countMap[cat] = (countMap[cat] || 0) + 1;
    }

    return CATEGORIES
      .filter(c => countMap[c.id])
      .map(c => ({
        ...c,
        name: t(`measures.categories.${c.id === 'lab_results' ? 'labResults' : c.id}`, c.id),
        count: countMap[c.id] || 0
      }));
  }, [measures, t]);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedCategories(categoriesWithCounts.map(c => c.id));
      setSelectAll(true);
      setError(null);
    }
  }, [show, categoriesWithCounts]);

  const handleSelectAllChange = useCallback((checked) => {
    setSelectAll(checked);
    setSelectedCategories(checked ? categoriesWithCounts.map(c => c.id) : []);
  }, [categoriesWithCounts]);

  const handleCategoryToggle = useCallback((categoryId) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId);
      const newIds = isSelected
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      setSelectAll(newIds.length === categoriesWithCounts.length);
      return newIds;
    });
  }, [categoriesWithCounts.length]);

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const categoriesToExport = selectAll ? [] : selectedCategories;
      const result = await measureService.exportMeasures(categoriesToExport);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      const filename = `nutrivault-measures-${new Date().toISOString().split('T')[0]}.json`;
      downloadJson(result.data, filename);
      onHide();
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || err.message || t('measures.exportError', 'Failed to export measures'));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!measures) return { categories: 0, measures: 0 };
    const selectedMeasures = measures.filter(m => selectedCategories.includes(m.category || 'other'));
    return {
      categories: selectedCategories.length,
      measures: selectedMeasures.length
    };
  }, [measures, selectedCategories]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('measures.exportTitle', 'Export Measures')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p className="text-muted">
          {t('measures.exportDescription', 'Select the categories you want to export. All measure definitions and their translations within selected categories will be included.')}
        </p>

        {/* Select All Checkbox */}
        <Form.Check
          type="checkbox"
          id="select-all-measures"
          label={<strong>{t('measures.selectAllCategories', 'Select All')}</strong>}
          checked={selectAll}
          onChange={(e) => handleSelectAllChange(e.target.checked)}
          className="mb-3"
        />

        {/* Category List */}
        <ListGroup className="mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {categoriesWithCounts.map((category) => (
            <ListGroup.Item
              key={category.id}
              className="d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => handleCategoryToggle(category.id)}
            >
              <Form.Check
                type="checkbox"
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onChange={() => handleCategoryToggle(category.id)}
                onClick={(e) => e.stopPropagation()}
                label={
                  <div>
                    <span className="me-2">{category.icon}</span>
                    <strong>{category.name}</strong>
                  </div>
                }
              />
              <Badge bg="secondary">
                {category.count} {t('measures.measuresCount', 'measures')}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {categoriesWithCounts.length === 0 && (
          <Alert variant="info">
            {t('measures.noCategoriesToExport', 'No measures available to export.')}
          </Alert>
        )}

        {/* Selection Summary */}
        {selectedCategories.length > 0 && (
          <Alert variant="info">
            {t('measures.exportSummary', 'Will export {{measures}} measures from {{categories}} categories.', {
              categories: stats.categories,
              measures: stats.measures
            })}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={loading || selectedCategories.length === 0}
        >
          {loading && <Spinner animation="border" size="sm" className="me-2" />}
          {loading
            ? t('measures.exporting', 'Exporting...')
            : t('measures.export', 'Export')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportMeasuresModal;
