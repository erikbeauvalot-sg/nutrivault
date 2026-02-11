/**
 * ExportEmailTemplatesModal Component
 * Modal for selecting and exporting email templates with translations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Form, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as emailTemplateService from '../services/emailTemplateService';

const CATEGORIES = [
  { id: 'invoice', icon: '\u{1F4B0}' },
  { id: 'document_share', icon: '\u{1F4C4}' },
  { id: 'payment_reminder', icon: '\u{1F514}' },
  { id: 'appointment_reminder', icon: '\u{1F4C5}' },
  { id: 'follow_up', icon: '\u{1F4CB}' },
  { id: 'general', icon: '\u{2709}\u{FE0F}' }
];

const ExportEmailTemplatesModal = ({ show, onHide, templates }) => {
  const { t } = useTranslation();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Group templates by category
  const categoriesWithCounts = useMemo(() => {
    if (!templates || templates.length === 0) return [];

    const countMap = {};
    for (const tpl of templates) {
      const cat = tpl.category || 'general';
      countMap[cat] = (countMap[cat] || 0) + 1;
    }

    return CATEGORIES
      .filter(c => countMap[c.id])
      .map(c => ({
        ...c,
        name: t(`emailTemplates.categories.${c.id === 'document_share' ? 'documentShare' : c.id === 'payment_reminder' ? 'paymentReminder' : c.id === 'appointment_reminder' ? 'appointmentReminder' : c.id === 'follow_up' ? 'followUp' : c.id}`, c.id),
        count: countMap[c.id] || 0
      }));
  }, [templates, t]);

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
      const result = await emailTemplateService.exportTemplates(categoriesToExport);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      const filename = `nutrivault-email-templates-${new Date().toISOString().split('T')[0]}.json`;
      downloadJson(result.data, filename);
      onHide();
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || err.message || t('emailTemplates.exportError', 'Failed to export email templates'));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!templates) return { categories: 0, templates: 0 };
    const selectedTemplates = templates.filter(tpl => selectedCategories.includes(tpl.category || 'general'));
    return {
      categories: selectedCategories.length,
      templates: selectedTemplates.length
    };
  }, [templates, selectedCategories]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {t('emailTemplates.exportTitle', 'Export Email Templates')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p className="text-muted">
          {t('emailTemplates.exportDescription', 'Select the categories you want to export. All email templates and their translations within selected categories will be included.')}
        </p>

        {/* Select All Checkbox */}
        <Form.Check
          type="checkbox"
          id="select-all-email-templates"
          label={<strong>{t('emailTemplates.selectAllCategories', 'Select All')}</strong>}
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
                id={`email-template-category-${category.id}`}
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
                {category.count} {t('emailTemplates.templatesCount', 'templates')}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {categoriesWithCounts.length === 0 && (
          <Alert variant="info">
            {t('emailTemplates.noCategoriesToExport', 'No email templates available to export.')}
          </Alert>
        )}

        {/* Selection Summary */}
        {selectedCategories.length > 0 && (
          <Alert variant="info">
            {t('emailTemplates.exportSummary', 'Will export {{templates}} templates from {{categories}} categories.', {
              categories: stats.categories,
              templates: stats.templates
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
            ? t('emailTemplates.exporting', 'Exporting...')
            : t('emailTemplates.export', 'Export')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportEmailTemplatesModal;
