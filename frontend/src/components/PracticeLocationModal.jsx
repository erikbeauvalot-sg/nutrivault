/**
 * PracticeLocationModal
 * Create/Edit modal for the configurable consultation locations.
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import practiceLocationService from '../services/practiceLocationService';
import BankAccountSelect from './BankAccountSelect';

const emptyForm = { label: '', is_default: false, bank_account_code: '', display_order: 0, is_active: true };

const PracticeLocationModal = ({ show, onHide, location, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!location;

  useEffect(() => {
    if (location) {
      setForm({
        label: location.label || '',
        is_default: !!location.is_default,
        bank_account_code: location.bank_account_code || '',
        display_order: location.display_order || 0,
        is_active: location.is_active !== false
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [location, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError(t('locations.labelRequired', 'The label is required'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = {
        label: form.label.trim(),
        is_default: form.is_default,
        bank_account_code: form.bank_account_code || null,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: form.is_active
      };
      if (isEditing) {
        await practiceLocationService.updatePracticeLocation(location.id, payload);
      } else {
        await practiceLocationService.createPracticeLocation(payload);
      }
      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || t('locations.saveError', 'Failed to save the location'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? t('locations.edit', 'Edit location') : t('locations.create', 'New location')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Form.Group className="mb-3" controlId="location-label">
            <Form.Label>{t('locations.label', 'Label')} *</Form.Label>
            <Form.Control
              type="text"
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder={t('locations.labelPlaceholder', 'e.g. Main office')}
              autoFocus
            />
            <Form.Text className="text-muted">
              {t('locations.labelHelp', 'Written as-is in the "Structure" column of the accounting export: use exactly the spelling of your Excel file.')}
            </Form.Text>
          </Form.Group>

          {isEditing && (
            <Form.Group className="mb-3">
              <Form.Label>{t('locations.code', 'Code')}</Form.Label>
              <Form.Control type="text" value={location.code} disabled />
              <Form.Text className="text-muted">
                {t('locations.codeHelp', 'Internal value stored on invoices — cannot be changed')}
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3" controlId="location-bank-account">
            <Form.Label>{t('locations.bankAccount', 'Bank account of the revenue')}</Form.Label>
            <BankAccountSelect value={form.bank_account_code} onChange={handleChange} />
            <Form.Text className="text-muted">
              {t('locations.bankAccountHelp', 'Account given to the invoices of this location.')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="location-order">
            <Form.Label>{t('locations.displayOrder', 'Display order')}</Form.Label>
            <Form.Control type="number" name="display_order" min="0" value={form.display_order} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="location-default"
              name="is_default"
              label={t('locations.isDefault', 'Default location for new invoices')}
              checked={form.is_default}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="location-active"
              name="is_active"
              label={t('common.active', 'Active')}
              checked={form.is_active}
              onChange={handleChange}
            />
            <Form.Text className="text-muted">
              {t('locations.activeHelp', 'Inactive locations are hidden from the drop-down lists')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : (isEditing ? t('common.update', 'Update') : t('common.create', 'Create'))}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PracticeLocationModal;
