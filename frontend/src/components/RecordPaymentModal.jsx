/**
 * RecordPaymentModal Component
 * Modal form for recording payments on invoices
 */

import { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const RecordPaymentModal = ({ show, onHide, onSubmit, invoice }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0], // Today's date
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setError('Payment amount must be greater than 0');
      return false;
    }

    if (invoice && amount > invoice.amount_due) {
      setError(`Payment amount cannot exceed the outstanding balance of ${invoice.amount_due.toFixed(2)} €`);
      return false;
    }

    if (!formData.payment_method) {
      setError('Payment method is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const submitData = {
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date || null,
        notes: formData.notes.trim() || null
      };

      await onSubmit(submitData);
      onHide();
    } catch (err) {
      setError(err.message || t('errors.failedToRecordPayment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        amount: '',
        payment_method: 'CASH',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setError(null);
      onHide();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{t('billing.recordPayment', 'Record Payment')}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {invoice && (
            <Alert variant="info">
              <strong>{t('billing.invoice', 'Invoice')}:</strong> {invoice.invoice_number}
              <br />
              <strong>{t('billing.outstandingBalance', 'Outstanding Balance')}:</strong> {formatCurrency(invoice.amount_due)}
            </Alert>
          )}

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('billing.paymentAmount', 'Payment Amount')} *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('billing.paymentMethod', 'Payment Method')} *</Form.Label>
                <Form.Select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  required
                >
                  <option value="CASH">{t('billing.paymentMethods.cash', 'Cash')}</option>
                  <option value="CREDIT_CARD">{t('billing.paymentMethods.creditCard', 'Credit Card')}</option>
                  <option value="BANK_TRANSFER">{t('billing.paymentMethods.bankTransfer', 'Bank Transfer')}</option>
                  <option value="CHECK">{t('billing.paymentMethods.check', 'Check')}</option>
                  <option value="INSURANCE">{t('billing.paymentMethods.insurance', 'Insurance')}</option>
                  <option value="OTHER">{t('billing.paymentMethods.other', 'Other')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>{t('billing.paymentDate', 'Payment Date')} *</Form.Label>
            <Form.Control
              type="date"
              name="payment_date"
              value={formData.payment_date}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('billing.paymentNotes', 'Notes')} ({t('common.optional', 'Optional')})</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder={t('billing.paymentNotesPlaceholder', 'Additional payment notes')}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('billing.recording', 'Recording...')}
              </>
            ) : (
              t('billing.recordPayment', 'Record Payment')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default RecordPaymentModal;