/**
 * PaymentMethodModal
 * Create/Edit modal for the configurable billing payment methods.
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import paymentMethodService from '../services/paymentMethodService';

const emptyForm = { label: '', is_card: false, display_order: 0, is_active: true };

const PaymentMethodModal = ({ show, onHide, paymentMethod, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!paymentMethod;

  useEffect(() => {
    if (paymentMethod) {
      setForm({
        label: paymentMethod.label || '',
        is_card: !!paymentMethod.is_card,
        display_order: paymentMethod.display_order || 0,
        is_active: paymentMethod.is_active !== false
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [paymentMethod, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError(t('paymentMethods.labelRequired', 'Le libellé est requis'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = {
        label: form.label.trim(),
        is_card: form.is_card,
        display_order: parseInt(form.display_order, 10) || 0,
        is_active: form.is_active
      };
      if (isEditing) {
        await paymentMethodService.updatePaymentMethod(paymentMethod.id, payload);
      } else {
        await paymentMethodService.createPaymentMethod(payload);
      }
      onSuccess();
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || t('paymentMethods.saveError', 'Échec de l\'enregistrement du mode de paiement'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing
            ? t('paymentMethods.edit', 'Modifier le mode de paiement')
            : t('paymentMethods.create', 'Nouveau mode de paiement')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>{t('paymentMethods.label', 'Libellé')} *</Form.Label>
            <Form.Control
              type="text"
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder={t('paymentMethods.labelPlaceholder', 'ex. Espèces, Carte bancaire…')}
              autoFocus
            />
          </Form.Group>

          {isEditing && (
            <Form.Group className="mb-3">
              <Form.Label>{t('paymentMethods.code', 'Code')}</Form.Label>
              <Form.Control type="text" value={paymentMethod.code} disabled />
              <Form.Text className="text-muted">
                {t('paymentMethods.codeHelp', 'Valeur interne stockée sur les factures — non modifiable')}
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>{t('paymentMethods.displayOrder', 'Ordre d\'affichage')}</Form.Label>
            <Form.Control type="number" name="display_order" min="0" value={form.display_order} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="is_card"
              label={t('paymentMethods.isCard', 'Paiement par carte (commission bancaire déduite en compta)')}
              checked={form.is_card}
              onChange={handleChange}
            />
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
              {t('paymentMethods.activeHelp', 'Les modes inactifs sont masqués des menus déroulants')}
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

export default PaymentMethodModal;
