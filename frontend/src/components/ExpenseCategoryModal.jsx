/**
 * ExpenseCategoryModal
 * Create/Edit modal for the configurable expense categories.
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import expenseCategoryService from '../services/expenseCategoryService';

const emptyForm = { label: '', treso_line: 'autres', display_order: 0, is_active: true };

// TRÉSO CHARGES lines a category can feed in the accounting export.
const TRESO_LINES = [
  { value: 'autres', labelKey: 'expenseCategories.tresoLines.autres', fallback: 'Autres dépenses' },
  { value: 'loyer', labelKey: 'expenseCategories.tresoLines.loyer', fallback: 'Loyer' },
  { value: 'doctolib', labelKey: 'expenseCategories.tresoLines.doctolib', fallback: 'Doctolib' },
  { value: 'rcpro', labelKey: 'expenseCategories.tresoLines.rcpro', fallback: 'RC pro' },
  { value: 'assurance', labelKey: 'expenseCategories.tresoLines.assurance', fallback: 'Assurance locale' }
];

const ExpenseCategoryModal = ({ show, onHide, category, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setForm({
        label: category.label || '',
        treso_line: category.treso_line || 'autres',
        display_order: category.display_order || 0,
        is_active: category.is_active !== false
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [category, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError(t('expenseCategories.labelRequired', 'Le libellé est requis'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = {
        label: form.label.trim(),
        treso_line: form.treso_line || 'autres',
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: form.is_active
      };
      if (isEditing) {
        await expenseCategoryService.updateExpenseCategory(category.id, payload);
      } else {
        await expenseCategoryService.createExpenseCategory(payload);
      }
      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || t('expenseCategories.saveError', 'Échec de l\'enregistrement de la catégorie'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing
            ? t('expenseCategories.edit', 'Modifier la catégorie')
            : t('expenseCategories.create', 'Nouvelle catégorie de dépense')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>{t('expenseCategories.label', 'Libellé')} *</Form.Label>
            <Form.Control
              type="text"
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder={t('expenseCategories.labelPlaceholder', 'ex. Loyer, Logiciels…')}
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('expenseCategories.tresoLine', 'Ligne dans la trésorerie (compta)')}</Form.Label>
            <Form.Select name="treso_line" value={form.treso_line} onChange={handleChange}>
              {TRESO_LINES.map((line) => (
                <option key={line.value} value={line.value}>{t(line.labelKey, line.fallback)}</option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {t('expenseCategories.tresoLineHelp', 'Ligne des CHARGES de l\'onglet TRÉSO où cette catégorie est totalisée dans l\'export comptable.')}
            </Form.Text>
          </Form.Group>

          {isEditing && (
            <Form.Group className="mb-3">
              <Form.Label>{t('expenseCategories.code', 'Code')}</Form.Label>
              <Form.Control type="text" value={category.code} disabled />
              <Form.Text className="text-muted">
                {t('expenseCategories.codeHelp', 'Valeur interne stockée sur les dépenses — non modifiable')}
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>{t('expenseCategories.displayOrder', 'Ordre d\'affichage')}</Form.Label>
            <Form.Control type="number" name="display_order" min="0" value={form.display_order} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="is_active"
              label={t('common.active', 'Actif')}
              checked={form.is_active}
              onChange={handleChange}
            />
            <Form.Text className="text-muted">
              {t('expenseCategories.activeHelp', 'Les catégories inactives sont masquées des menus déroulants')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : (isEditing ? t('common.update', 'Modifier') : t('common.create', 'Créer'))}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ExpenseCategoryModal;
