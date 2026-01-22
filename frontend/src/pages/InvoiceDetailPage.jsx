/**
 * InvoiceDetailPage Component
 * Detailed invoice view with payment processing capabilities
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import * as billingService from '../services/billingService';

const InvoiceDetailPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (id && hasPermission('billing.read')) {
      fetchInvoiceDetails();
    }
  }, [id, hasPermission]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await billingService.getInvoiceById(id);
      const invoiceData = response.data.data || response.data;
      setInvoice(invoiceData);
      setPayments(invoiceData.payments || []);
      setError(null);
    } catch (err) {
      setError(t('billing.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching invoice details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    // Create a clean HTML version for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .invoice-details { margin: 20px 0; }
          .invoice-details table { width: 100%; border-collapse: collapse; }
          .invoice-details td { padding: 8px; border: 1px solid #ddd; }
          .invoice-details .label { font-weight: bold; background-color: #f5f5f5; }
          .items { margin: 30px 0; }
          .items table { width: 100%; border-collapse: collapse; }
          .items th, .items td { padding: 10px; text-align: left; border: 1px solid #ddd; }
          .items th { background-color: #f5f5f5; font-weight: bold; }
          .totals { text-align: right; margin-top: 20px; }
          .totals table { margin-left: auto; }
          .totals td { padding: 5px 20px; }
          .status { text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; }
          .status.PAID { color: green; }
          .status.SENT { color: blue; }
          .status.OVERDUE { color: red; }
          .status.DRAFT { color: gray; }
          .status.CANCELLED { color: orange; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoice.invoice_number}</h2>
        </div>

        <div class="invoice-details">
          <table>
            <tr>
              <td class="label">Invoice Number:</td>
              <td>${invoice.invoice_number}</td>
              <td class="label">Date:</td>
              <td>${formatDate(invoice.created_at)}</td>
            </tr>
            <tr>
              <td class="label">Patient:</td>
              <td>${invoice.patient?.first_name} ${invoice.patient?.last_name}</td>
              <td class="label">Due Date:</td>
              <td>${formatDate(invoice.due_date)}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td class="status ${invoice.status}">${invoice.status}</td>
              <td class="label">Total Amount:</td>
              <td>${formatCurrency(invoice.total_amount)}</td>
            </tr>
          </table>
        </div>

        <div class="items">
          <h3>Invoice Items</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unit_price)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No items found</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td>${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td>Tax (${invoice.tax_rate}%):</td>
              <td>${formatCurrency(invoice.tax_amount)}</td>
            </tr>
            <tr style="font-weight: bold; font-size: 16px;">
              <td>Total:</td>
              <td>${formatCurrency(invoice.total_amount)}</td>
            </tr>
          </table>
        </div>

        ${payments.length > 0 ? `
          <div class="payments" style="margin-top: 30px;">
            <h3>Payment History</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Method</th>
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Reference</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(payment => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${formatDate(payment.payment_date)}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(payment.amount)}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${payment.payment_method}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${payment.reference || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleBack = () => {
    navigate('/billing');
  };

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      setError(null);
      await billingService.sendInvoiceEmail(id);
      setSuccessMessage(t('billing.emailSentSuccessfully'));
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('billing.failedToSendEmail') + ': ' + (err.response?.data?.error || err.message));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm(t('billing.confirmMarkAsPaid'))) {
      return;
    }

    try {
      setMarkingPaid(true);
      setError(null);
      await billingService.markAsPaid(id);
      setSuccessMessage(t('billing.markedAsPaidSuccessfully'));
      // Refresh invoice data
      await fetchInvoiceDetails();
    } catch (err) {
      setError(t('billing.failedToMarkAsPaid') + ': ' + (err.response?.data?.error || err.message));
    } finally {
      setMarkingPaid(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SENT': return 'primary';
      case 'PAID': return 'success';
      case 'OVERDUE': return 'danger';
      case 'CANCELLED': return 'warning';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </Spinner>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container className="py-4">
          <Alert variant="danger">
            <Alert.Heading>{t('common.error')}</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              {t('common.back')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <Container className="py-4">
          <Alert variant="warning">
            <Alert.Heading>{t('billing.invoiceNotFound')}</Alert.Heading>
            <p>{t('billing.invoiceNotFoundMessage')}</p>
            <Button variant="outline-warning" onClick={handleBack}>
              {t('common.back')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Row className="mb-4">
          <Col>
            <Button variant="outline-secondary" onClick={handleBack} className="mb-3">
              ← {t('common.back')}
            </Button>
            <h1 className="mb-2">{t('billing.invoiceDetails')}</h1>
            <div className="d-flex align-items-center gap-2">
              <Badge bg={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
              <span className="text-muted">#{invoice.id}</span>
            </div>
          </Col>
          <Col xs="auto">
            {hasPermission('billing.update') && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <Button
                variant="success"
                onClick={() => navigate(`/billing/${id}/record-payment`)}
                className="me-2"
              >
                💳 {t('billing.recordPayment')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Invoice Information */}
        <Row className="mb-4">
          <Col lg={8}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('billing.invoiceInfo')}</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <dl className="row">
                      <dt className="col-sm-5">{t('billing.patient')}:</dt>
                      <dd className="col-sm-7">{invoice.patient?.first_name} {invoice.patient?.last_name}</dd>

                      <dt className="col-sm-5">{t('billing.visit')}:</dt>
                      <dd className="col-sm-7">#{invoice.visit?.id}</dd>

                      <dt className="col-sm-5">{t('billing.created')}:</dt>
                      <dd className="col-sm-7">{formatDate(invoice.created_at)}</dd>

                      <dt className="col-sm-5">{t('billing.dueDate')}:</dt>
                      <dd className="col-sm-7">{formatDate(invoice.due_date)}</dd>
                    </dl>
                  </Col>
                  <Col md={6}>
                    <dl className="row">
                      <dt className="col-sm-5">{t('billing.amount')}:</dt>
                      <dd className="col-sm-7 fw-bold">{formatCurrency(invoice.amount)}</dd>

                      <dt className="col-sm-5">{t('billing.amountPaid')}:</dt>
                      <dd className="col-sm-7">{formatCurrency(invoice.amount_paid)}</dd>

                      <dt className="col-sm-5">{t('billing.amountDue')}:</dt>
                      <dd className="col-sm-7 fw-bold text-danger">{formatCurrency(invoice.amount_due)}</dd>

                      <dt className="col-sm-5">{t('billing.notes')}:</dt>
                      <dd className="col-sm-7">{invoice.notes || '-'}</dd>
                    </dl>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('billing.quickActions')}</h5>
              </Card.Header>
              <Card.Body>
                {hasPermission('billing.update') && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                  <>
                    <Button
                      variant="success"
                      className="w-100 mb-2"
                      onClick={() => navigate(`/billing/${id}/record-payment`)}
                    >
                      💳 {t('billing.recordPayment')}
                    </Button>

                    <Button
                      variant="warning"
                      className="w-100 mb-2"
                      onClick={handleMarkAsPaid}
                      disabled={markingPaid || invoice.amount_due <= 0}
                    >
                      {markingPaid ? '⏳' : '✅'} {t('billing.markAsPaid')}
                    </Button>
                  </>
                )}

                {invoice.patient?.email && (
                  <Button
                    variant="info"
                    className="w-100 mb-2"
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? '⏳' : '📧'} {t('billing.sendEmail')}
                  </Button>
                )}

                {hasPermission('billing.update') && (
                  <Button
                    variant="outline-primary"
                    className="w-100 mb-2"
                    onClick={() => navigate(`/billing/${id}/edit`)}
                  >
                    ✏️ {t('common.edit')}
                  </Button>
                )}

                <Button
                  variant="outline-secondary"
                  className="w-100 mb-2"
                  onClick={handleDownloadPDF}
                >
                  📄 {t('billing.downloadPDF')}
                </Button>

                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => window.print()}
                >
                  🖨️ {t('billing.printInvoice')}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment History */}
        <Card>
          <Card.Header>
            <h5 className="mb-0">{t('billing.paymentHistory')}</h5>
          </Card.Header>
          <Card.Body>
            {payments.length === 0 ? (
              <p className="text-muted">{t('billing.noPayments')}</p>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>{t('billing.paymentDate')}</th>
                    <th>{t('billing.amount')}</th>
                    <th>{t('billing.paymentMethod')}</th>
                    <th>{t('billing.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.payment_method}</td>
                      <td>{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default InvoiceDetailPage;