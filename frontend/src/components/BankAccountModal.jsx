/**
 * BankAccountModal
 * Create/Edit modal for the configurable bank accounts.
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import bankAccountService from '../services/bankAccountService';

const emptyForm = { label: '', bank_name: '', iban: '', is_default: false, display_order: 0, is_active: true };

const BankAccountModal = ({ show, onHide, account, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!account;

  useEffect(() => {
    if (account) {
      setForm({
        label: account.label || '',
        bank_name: account.bank_name || '',
        iban: account.iban || '',
        is_default: !!account.is_default,
        display_order: account.display_order || 0,
        is_active: account.is_active !== false
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [account, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError(t('bankAccounts.labelRequired', 'The label is required'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = {
        label: form.label.trim(),
        bank_name: form.bank_name.trim() || null,
        iban: form.iban.trim() || null,
        is_default: form.is_default,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: form.is_active
      };
      if (isEditing) {
        await bankAccountService.updateBankAccount(account.id, payload);
      } else {
        await bankAccountService.createBankAccount(payload);
      }
      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || t('bankAccounts.saveError', 'Failed to save the bank account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? t('bankAccounts.edit', 'Edit bank account') : t('bankAccounts.create', 'New bank account')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Form.Group className="mb-3" controlId="bank-account-label">
            <Form.Label>{t('bankAccounts.label', 'Label')} *</Form.Label>
            <Form.Control
              type="text"
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder={t('bankAccounts.labelPlaceholder', 'e.g. Business account, Cash')}
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="bank-account-bank">
            <Form.Label>{t('bankAccounts.bankName', 'Bank')} ({t('common.optional', 'Optional')})</Form.Label>
            <Form.Control type="text" name="bank_name" value={form.bank_name} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3" controlId="bank-account-iban">
            <Form.Label>{t('bankAccounts.iban', 'IBAN')} ({t('common.optional', 'Optional')})</Form.Label>
            <Form.Control type="text" name="iban" value={form.iban} onChange={handleChange} />
          </Form.Group>

          {isEditing && (
            <Form.Group className="mb-3">
              <Form.Label>{t('bankAccounts.code', 'Code')}</Form.Label>
              <Form.Control type="text" value={account.code} disabled />
              <Form.Text className="text-muted">
                {t('bankAccounts.codeHelp', 'Internal value stored on financial records — cannot be changed')}
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3" controlId="bank-account-order">
            <Form.Label>{t('bankAccounts.displayOrder', 'Display order')}</Form.Label>
            <Form.Control type="number" name="display_order" min="0" value={form.display_order} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="bank-account-default"
              name="is_default"
              label={t('bankAccounts.isDefault', 'Default account for new expenses and entries')}
              checked={form.is_default}
              onChange={handleChange}
            />
            <Form.Text className="text-muted">
              {t('bankAccounts.defaultHelp', 'Revenue goes to the account of the invoice location (see Locations).')}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="bank-account-active"
              name="is_active"
              label={t('common.active', 'Active')}
              checked={form.is_active}
              onChange={handleChange}
            />
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

export default BankAccountModal;
