/**
 * InvoiceDetailPage Component
 * Detailed invoice view with payment processing capabilities
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Table, Modal, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import * as billingService from '../services/billingService';

const InvoiceDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [changingPaymentStatus, setChangingPaymentStatus] = useState(false);
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false);

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
      setEmailHistory(invoiceData.email_history || []);
      setError(null);
    } catch (err) {
      setError(t('billing.failedToLoad') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching invoice details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = async () => {
    try {
      // Call backend API to generate customized PDF
      const response = await billingService.downloadInvoicePDF(id);

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create URL and open in new window
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Cleanup after a delay to ensure window opens
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(t('billing.failedToViewPDF', 'Failed to view PDF') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error viewing PDF:', err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Call backend API to generate customized PDF
      const response = await billingService.downloadInvoicePDF(id);

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(t('billing.failedToDownloadPDF', 'Failed to download PDF') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error downloading PDF:', err);
    }
  };

  const handlePrintPDF = async () => {
    try {
      // Call backend API to generate customized PDF
      const response = await billingService.downloadInvoicePDF(id);

      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });

      // Create URL and open in new window
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      // Wait for window to load, then trigger print
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Cleanup after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(t('billing.failedToPrintPDF', 'Failed to print PDF') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error printing PDF:', err);
    }
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

  const handleMarkAsPaid = () => {
    setShowMarkPaidConfirm(true);
  };

  const confirmMarkAsPaid = async () => {
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

  const handleOpenStatusModal = () => {
    setNewStatus(invoice.status);
    setShowStatusModal(true);
  };

  const handleChangeStatus = async () => {
    if (!newStatus || newStatus === invoice.status) {
      setShowStatusModal(false);
      return;
    }

    try {
      setChangingStatus(true);
      setError(null);
      await billingService.changeInvoiceStatus(id, newStatus);
      setSuccessMessage(t('billing.statusChangedSuccessfully', `Status changed to ${newStatus}`));
      setShowStatusModal(false);
      // Refresh invoice data
      await fetchInvoiceDetails();
    } catch (err) {
      setError(t('billing.failedToChangeStatus', 'Failed to change status') + ': ' + (err.response?.data?.error || err.message));
      setShowStatusModal(false);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleOpenPaymentStatusModal = (payment) => {
    setSelectedPayment(payment);
    setNewPaymentStatus(payment.status || 'PAID');
    setShowPaymentStatusModal(true);
  };

  const handleChangePaymentStatus = async () => {
    if (!selectedPayment || !newPaymentStatus) {
      setError(t('billing.invalidPaymentStatus', 'Invalid payment status'));
      return;
    }

    try {
      setChangingPaymentStatus(true);
      setError(null);
      await billingService.changePaymentStatus(selectedPayment.id, newPaymentStatus);
      setSuccessMessage(t('billing.paymentStatusChanged', `Payment status changed to ${newPaymentStatus}`));
      setShowPaymentStatusModal(false);
      setSelectedPayment(null);
      // Refresh invoice data
      await fetchInvoiceDetails();
    } catch (err) {
      setError(t('billing.failedToChangePaymentStatus', 'Failed to change payment status') + ': ' + (err.response?.data?.error || err.message));
      setShowPaymentStatusModal(false);
    } finally {
      setChangingPaymentStatus(false);
    }
  };

  const getPaymentStatusBadgeVariant = (status) => {
    return status === 'PAID' ? 'success' : 'danger';
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
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleString(locale);
  };

  // Combine payments and email history into a unified timeline
  const getHistory = () => {
    const history = [];

    // Add payments
    payments.forEach(payment => {
      history.push({
        type: 'payment',
        date: payment.payment_date,
        data: payment
      });
    });

    // Add emails
    emailHistory.forEach(email => {
      history.push({
        type: 'email',
        date: email.sent_at,
        data: email
      });
    });

    // Sort by date (most recent first)
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
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
                      <dd className="col-sm-7 fw-bold">{formatCurrency(invoice.amount_total)}</dd>

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
                  <>
                    <Button
                      variant="outline-primary"
                      className="w-100 mb-2"
                      onClick={() => navigate(`/billing/${id}/edit`)}
                    >
                      ✏️ {t('common.edit')}
                    </Button>

                    <Button
                      variant="outline-warning"
                      className="w-100 mb-2"
                      onClick={handleOpenStatusModal}
                    >
                      🔄 {t('billing.changeStatus', 'Change Status')}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline-primary"
                  className="w-100 mb-2"
                  onClick={handleViewPDF}
                >
                  👁️ {t('billing.viewInvoice', 'View Invoice')}
                </Button>

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
                  onClick={handlePrintPDF}
                >
                  🖨️ {t('billing.printInvoice')}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment & Email History */}
        <Card>
          <Card.Header>
            <h5 className="mb-0">{t('billing.history', 'History')}</h5>
          </Card.Header>
          <Card.Body>
            {getHistory().length === 0 ? (
              <p className="text-muted">{t('billing.noHistory', 'No activity yet')}</p>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>{t('billing.date', 'Date')}</th>
                    <th>{t('billing.type', 'Type')}</th>
                    <th>{t('billing.details', 'Details')}</th>
                    <th>{t('billing.statusLabel')}</th>
                    {hasPermission('billing.update') && <th>{t('common.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {getHistory().map((item, index) => {
                    if (item.type === 'payment') {
                      const payment = item.data;
                      return (
                        <tr key={`payment-${payment.id}`} style={{ opacity: payment.status === 'CANCELLED' ? 0.6 : 1 }}>
                          <td>{formatDateTime(payment.payment_date)}</td>
                          <td>
                            <Badge bg="success">💳 {t('billing.payment', 'Payment')}</Badge>
                          </td>
                          <td>
                            <strong>{formatCurrency(payment.amount)}</strong>
                            {payment.status === 'CANCELLED' && (
                              <span className="text-muted small ms-2">({t('billing.notCounted', 'not counted')})</span>
                            )}
                            <div className="small text-muted">
                              {payment.payment_method && `${payment.payment_method}`}
                              {payment.notes && ` - ${payment.notes}`}
                            </div>
                          </td>
                          <td>
                            <Badge bg={getPaymentStatusBadgeVariant(payment.status)}>
                              {t(`billing.paymentStatus.${payment.status}`, payment.status)}
                            </Badge>
                          </td>
                          {hasPermission('billing.update') && (
                            <td>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleOpenPaymentStatusModal(payment)}
                              >
                                🔄 {t('billing.changeStatus')}
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    } else {
                      const email = item.data;
                      return (
                        <tr key={`email-${email.id}`}>
                          <td>{formatDateTime(email.sent_at)}</td>
                          <td>
                            <Badge bg="info">📧 {t('billing.emailSent', 'Email Sent')}</Badge>
                          </td>
                          <td>
                            <div className="small">
                              {t('billing.sentTo', 'Sent to')}: <strong>{email.sent_to}</strong>
                            </div>
                            {email.sender && (
                              <div className="small text-muted">
                                {t('billing.sentBy', 'By')}: {email.sender.first_name} {email.sender.last_name}
                              </div>
                            )}
                            {email.error_message && (
                              <div className="small text-danger">
                                {t('billing.error', 'Error')}: {email.error_message}
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge bg={email.status === 'SUCCESS' ? 'success' : 'danger'}>
                              {email.status === 'SUCCESS' ? '✓ ' + t('billing.sent', 'Sent') : '✗ ' + t('billing.failed', 'Failed')}
                            </Badge>
                          </td>
                          {hasPermission('billing.update') && <td>-</td>}
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Change Payment Status Modal */}
        <Modal show={showPaymentStatusModal} onHide={() => setShowPaymentStatusModal(false)} centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>🔄 {t('billing.changePaymentStatus', 'Change Payment Status')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPayment && (
              <>
                <Alert variant="warning" className="small">
                  <strong>{t('billing.changePaymentStatusWarning', 'Warning:')}</strong>{' '}
                  {t('billing.changePaymentStatusMessage', 'Changing the payment status to CANCELLED will exclude this payment from the invoice balance calculation.')}
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>{t('billing.paymentAmount', 'Payment Amount')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={formatCurrency(selectedPayment.amount)}
                    disabled
                    readOnly
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('billing.paymentDate', 'Payment Date')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={formatDate(selectedPayment.payment_date)}
                    disabled
                    readOnly
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label>
                    {t('billing.currentStatus', 'Current Status')}: <Badge bg={getPaymentStatusBadgeVariant(selectedPayment.status)}>{t(`billing.paymentStatus.${selectedPayment.status}`, selectedPayment.status)}</Badge>
                  </Form.Label>
                </Form.Group>

                <Form.Group className="mt-3">
                  <Form.Label>{t('billing.newStatus', 'New Status')}</Form.Label>
                  <Form.Select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    disabled={changingPaymentStatus}
                  >
                    <option value="PAID">{t('billing.paymentStatus.PAID', 'Paid')}</option>
                    <option value="CANCELLED">{t('billing.paymentStatus.CANCELLED', 'Cancelled')}</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {t('billing.selectNewPaymentStatus', 'Select the new status for this payment')}
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowPaymentStatusModal(false)}
              disabled={changingPaymentStatus}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleChangePaymentStatus}
              disabled={changingPaymentStatus}
            >
              {changingPaymentStatus ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('common.updating', 'Updating...')}
                </>
              ) : (
                <>
                  🔄 {t('billing.changeStatus', 'Change Status')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Mark as Paid Confirm Modal */}
        <ConfirmModal
          show={showMarkPaidConfirm}
          onHide={() => setShowMarkPaidConfirm(false)}
          onConfirm={confirmMarkAsPaid}
          title={t('common.confirmation', 'Confirmation')}
          message={t('billing.confirmMarkAsPaid')}
          confirmLabel={t('billing.markAsPaid', 'Mark as Paid')}
          variant="success"
        />

        {/* Change Status Modal */}
        <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>🔄 {t('billing.changeStatus', 'Change Invoice Status')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="small">
              <strong>{t('billing.changeStatusWarning', 'Warning:')}</strong>{' '}
              {t('billing.changeStatusMessage', 'Changing the invoice status will affect reporting and workflows. Use with caution.')}
            </Alert>

            <Form.Group>
              <Form.Label>
                {t('billing.currentStatus', 'Current Status')}: <Badge bg={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
              </Form.Label>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>{t('billing.newStatus', 'New Status')}</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={changingStatus}
              >
                <option value="DRAFT">{t('billing.status.draft', 'Draft')}</option>
                <option value="SENT">{t('billing.status.sent', 'Sent')}</option>
                <option value="PAID">{t('billing.status.paid', 'Paid')}</option>
                <option value="OVERDUE">{t('billing.status.overdue', 'Overdue')}</option>
                <option value="CANCELLED">{t('billing.status.cancelled', 'Cancelled')}</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {t('billing.selectNewStatus', 'Select the new status for this invoice')}
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowStatusModal(false)}
              disabled={changingStatus}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="warning"
              onClick={handleChangeStatus}
              disabled={changingStatus || newStatus === invoice.status}
            >
              {changingStatus ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('common.changing', 'Changing...')}
                </>
              ) : (
                <>
                  🔄 {t('billing.changeStatus', 'Change Status')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default InvoiceDetailPage;