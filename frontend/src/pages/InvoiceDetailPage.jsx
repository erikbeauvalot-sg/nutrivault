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
import RecordPaymentModal from '../components/RecordPaymentModal';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  const handleRecordPayment = async (paymentData) => {
    try {
      await billingService.recordPayment(id, paymentData);
      setShowPaymentModal(false);
      fetchInvoiceDetails(); // Refresh data
    } catch (err) {
      throw new Error('Failed to record payment: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleBack = () => {
    navigate('/billing');
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
                onClick={() => setShowPaymentModal(true)}
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
                  <Button
                    variant="success"
                    className="w-100 mb-2"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    💳 {t('billing.recordPayment')}
                  </Button>
                )}

                {hasPermission('billing.update') && (
                  <Button
                    variant="outline-primary"
                    className="w-100 mb-2"
                    onClick={() => navigate(`/billing/edit/${invoice.id}`)}
                  >
                    ✏️ {t('common.edit')}
                  </Button>
                )}

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

        {/* Record Payment Modal */}
        <RecordPaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          onSubmit={handleRecordPayment}
          invoice={invoice}
        />
      </Container>
    </Layout>
  );
};

export default InvoiceDetailPage;