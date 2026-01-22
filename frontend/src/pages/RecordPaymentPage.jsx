/**
 * RecordPaymentPage Component
 * Full page for recording payments on invoices
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { getInvoiceById, recordPayment } from '../services/billingService';

const RecordPaymentPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_date: new Date().toISOString().split('T')[0], // Today's date
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await getInvoiceById(id);
      const invoiceData = response.data?.data || response.data;
      setInvoice(invoiceData);

      // Set default payment amount to outstanding balance
      setFormData(prev => ({
        ...prev,
        amount: invoiceData.amount_due?.toString() || ''
      }));
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(t('billing.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

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
      setError(t('billing.paymentAmountRequired', 'Payment amount must be greater than 0'));
      return false;
    }

    if (invoice && amount > invoice.amount_due) {
      setError(t('billing.paymentAmountExceedsBalance', `Payment amount cannot exceed the outstanding balance of ${invoice.amount_due.toFixed(2)} €`));
      return false;
    }

    if (!formData.payment_method) {
      setError(t('billing.paymentMethodRequired', 'Payment method is required'));
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

      await recordPayment(id, submitData);

      // Navigate back to invoice detail page with success message
      navigate(`/billing/${id}`, {
        state: { message: t('billing.paymentRecorded', 'Payment recorded successfully') }
      });
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.message || t('errors.failedToRecordPayment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/billing/${id}`); // Go back to invoice detail page
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <Row className="justify-content-center">
            <Col xs="auto">
              <Spinner animation="border" />
            </Col>
          </Row>
        </Container>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <Container fluid className="py-4">
          <Alert variant="danger">
            {t('billing.invoiceNotFound', 'Invoice not found')}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h1 className="h3 mb-0">{t('billing.recordPayment', 'Record Payment')}</h1>
            <p className="text-muted">{t('billing.recordPaymentDescription', 'Record a payment for this invoice')}</p>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card>
              <Card.Body>
                {invoice && (
                  <Alert variant="info" className="mb-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{t('billing.invoice', 'Invoice')}:</strong> {invoice.invoice_number}
                        <br />
                        <strong>{t('billing.outstandingBalance', 'Outstanding Balance')}:</strong> {formatCurrency(invoice.amount_due)}
                      </div>
                      <Badge bg={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'danger' : 'warning'}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </Alert>
                )}

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
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
                      rows={3}
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder={t('billing.paymentNotesPlaceholder', 'Additional payment notes')}
                    />
                  </Form.Group>

                  <div className="d-flex gap-2 mt-4">
                    <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
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
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('common.help', 'Help')}</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small">
                  {t('billing.recordPaymentHelp', 'Record a payment against this invoice. The payment amount cannot exceed the outstanding balance.')}
                </p>
                <ul className="text-muted small">
                  <li>{t('billing.paymentAmountRequired', 'Payment amount is required and must be greater than 0')}</li>
                  <li>{t('billing.paymentMethodRequired', 'Payment method selection is required')}</li>
                  <li>{t('billing.paymentDateRequired', 'Payment date is required')}</li>
                  <li>{t('billing.paymentNotesOptional', 'Notes are optional')}</li>
                </ul>
              </Card.Body>
            </Card>

            {invoice && (
              <Card className="mt-3">
                <Card.Header>
                  <h6 className="mb-0">{t('billing.invoiceInfo', 'Invoice Information')}</h6>
                </Card.Header>
                <Card.Body>
                  <div className="small text-muted">
                    <div><strong>{t('billing.patient', 'Patient')}:</strong> {invoice.patient?.first_name} {invoice.patient?.last_name}</div>
                    <div><strong>{t('billing.totalAmount', 'Total Amount')}:</strong> {formatCurrency(invoice.amount_total)}</div>
                    <div><strong>{t('billing.amountPaid', 'Amount Paid')}:</strong> {formatCurrency(invoice.amount_paid)}</div>
                    <div><strong>{t('billing.amountDue', 'Amount Due')}:</strong> {formatCurrency(invoice.amount_due)}</div>
                    {invoice.due_date && (
                      <div><strong>{t('billing.dueDate', 'Due Date')}:</strong> {new Date(invoice.due_date).toLocaleDateString()}</div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default RecordPaymentPage;