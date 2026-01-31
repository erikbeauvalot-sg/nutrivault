/**
 * ExportCustomFieldsModal Component
 * Modal for selecting and exporting custom field categories
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';

const ExportCustomFieldsModal = ({ show, onHide, categories }) => {
  const { t } = useTranslation();

  // State
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedIds(categories.map(cat => cat.id));
      setSelectAll(true);
      setError(null);
    }
  }, [show, categories]);

  // Handle select all toggle
  const handleSelectAllChange = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(categories.map(cat => cat.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual category toggle
  const handleCategoryToggle = (categoryId) => {
    setSelectedIds(prev => {
      if (prev.includes(categoryId)) {
        const newIds = prev.filter(id => id !== categoryId);
        setSelectAll(false);
        return newIds;
      } else {
        const newIds = [...prev, categoryId];
        if (newIds.length === categories.length) {
          setSelectAll(true);
        }
        return newIds;
      }
    });
  };

  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Export selected categories (empty array = all)
      const categoryIdsToExport = selectAll ? [] : selectedIds;
      const result = await customFieldService.exportCategories(categoryIdsToExport);

      if (result.success && result.data) {
        // Create and download JSON file
        const exportData = result.data;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nutrivault-custom-fields-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onHide();
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || err.message || t('customFields.exportError', 'Failed to export custom fields'));
    } finally {
      setLoading(false);
    }
  };

  // Count definitions for selected categories
  const getSelectedStats = () => {
    const selectedCategories = categories.filter(cat => selectedIds.includes(cat.id));
    const totalDefinitions = selectedCategories.reduce(
      (sum, cat) => sum + (cat.field_definitions?.length || 0),
      0
    );
    return {
      categories: selectedCategories.length,
      definitions: totalDefinitions
    };
  };

  const stats = getSelectedStats();

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('customFields.exportTitle', 'Export Custom Fields')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p className="text-muted">
          {t('customFields.exportDescription', 'Select the categories you want to export. All field definitions within selected categories will be included.')}
        </p>

        {/* Select All Checkbox */}
        <Form.Check
          type="checkbox"
          id="select-all"
          label={<strong>{t('customFields.selectAll', 'Select All')}</strong>}
          checked={selectAll}
          onChange={(e) => handleSelectAllChange(e.target.checked)}
          className="mb-3"
        />

        {/* Category List */}
        <ListGroup className="mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {categories.map((category) => {
            const fieldCount = category.field_definitions?.length || 0;
            const entityTypes = category.entity_types || ['patient'];

            return (
              <ListGroup.Item
                key={category.id}
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => handleCategoryToggle(category.id)}
              >
                <Form.Check
                  type="checkbox"
                  id={`category-${category.id}`}
                  checked={selectedIds.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  onClick={(e) => e.stopPropagation()}
                  label={
                    <div>
                      <span
                        className="me-2"
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: category.color || '#3498db'
                        }}
                      />
                      <strong>{category.name}</strong>
                      {category.description && (
                        <small className="text-muted d-block ms-4">
                          {category.description}
                        </small>
                      )}
                    </div>
                  }
                />
                <div className="d-flex gap-2">
                  {entityTypes.includes('patient') && (
                    <Badge bg="primary" className="me-1">Patient</Badge>
                  )}
                  {entityTypes.includes('visit') && (
                    <Badge bg="info">Visit</Badge>
                  )}
                  <Badge bg="secondary">
                    {fieldCount} {t('customFields.fields', 'fields')}
                  </Badge>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>

        {categories.length === 0 && (
          <Alert variant="info">
            {t('customFields.noCategoriesToExport', 'No categories available to export.')}
          </Alert>
        )}

        {/* Selection Summary */}
        {selectedIds.length > 0 && (
          <Alert variant="info">
            {t('customFields.exportSummary', 'Will export {{categories}} categories with {{definitions}} field definitions.', {
              categories: stats.categories,
              definitions: stats.definitions
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
          disabled={loading || selectedIds.length === 0}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('customFields.exporting', 'Exporting...')}
            </>
          ) : (
            <>
              {t('customFields.export', 'Export')}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportCustomFieldsModal;
