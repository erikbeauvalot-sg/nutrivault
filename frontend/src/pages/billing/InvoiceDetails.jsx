/**
 * InvoiceDetails Page
 * Display invoice details with payment recording and print functionality
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Table, Button, Badge, Modal,
  Form, Alert, Spinner
} from 'react-bootstrap';
import { Printer, CashStack, ArrowLeft, XCircle } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { getInvoice, recordPayment, deleteInvoice } from '../../services/billingService';
import { format } from 'date-fns';

export function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'CASH',
    reference_number: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoice(id);
      setInvoice(response.invoice || response.data);
      // Set default payment amount to outstanding balance
      const outstanding = calculateOutstanding(response.invoice || response.data);
      setPaymentData(prev => ({ ...prev, amount: outstanding.toString() }));
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setError(err.response?.data?.message || 'Failed to load invoice');
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'} className="fs-6">{status}</Badge>;
  };

  const calculateTotalPaid = (invoiceData) => {
    if (!invoiceData?.payments) return 0;
    return invoiceData.payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  };

  const calculateOutstanding = (invoiceData) => {
    if (!invoiceData) return 0;
    const totalPaid = calculateTotalPaid(invoiceData);
    return Math.max(0, (invoiceData.total_amount || 0) - totalPaid);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = async () => {
    try {
      setSubmittingPayment(true);
      await recordPayment(id, {
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        payment_method: 'CASH',
        reference_number: '',
        notes: ''
      });
      loadInvoice(); // Reload invoice data
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteInvoice(id);
      toast.success('Invoice deleted successfully');
      navigate('/billing');
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Loading invoice...</p>
        </div>
      </Container>
    );
  }

  if (error || !invoice) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          {error || 'Invoice not found'}
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/billing')}>
          <ArrowLeft className="me-2" />
          Back to Invoices
        </Button>
      </Container>
    );
  }

  const totalPaid = calculateTotalPaid(invoice);
  const outstanding = calculateOutstanding(invoice);

  return (
    <>
      <Container fluid className="py-4 no-print">
        <Row className="mb-4">
          <Col>
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/billing')}
              className="me-2"
            >
              <ArrowLeft className="me-2" />
              Back to Invoices
            </Button>
          </Col>
          <Col xs="auto">
            <Button
              variant="primary"
              onClick={handlePrint}
              className="me-2"
            >
              <Printer className="me-2" />
              Print Invoice
            </Button>
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <Button
                variant="success"
                onClick={() => setShowPaymentModal(true)}
                className="me-2"
              >
                <CashStack className="me-2" />
                Record Payment
              </Button>
            )}
            {invoice.status === 'PENDING' && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <XCircle className="me-2" />
                Delete
              </Button>
            )}
          </Col>
        </Row>
      </Container>

      {/* Print-friendly invoice */}
      <Container className="invoice-container print-only">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; }
          }
          @media screen {
            .print-only { display: none; }
          }
        `}</style>

        <Card className="shadow-lg">
          <Card.Body className="p-5">
            {/* Header */}
            <Row className="mb-5">
              <Col>
                <h1 className="mb-0">INVOICE</h1>
                <p className="text-muted mb-0">#{invoice.invoice_number || invoice.id.slice(0, 8)}</p>
              </Col>
              <Col xs="auto" className="text-end">
                <h2 className="text-primary mb-0">NutriVault</h2>
                <p className="text-muted mb-0">Nutrition Practice Management</p>
              </Col>
            </Row>

            {/* Status and Date Info */}
            <Row className="mb-4">
              <Col md={6}>
                <div className="mb-2">
                  <strong>Status:</strong> {getStatusBadge(invoice.status)}
                </div>
                <div className="mb-2">
                  <strong>Issue Date:</strong> {formatDate(invoice.created_at)}
                </div>
                <div>
                  <strong>Due Date:</strong> {formatDate(invoice.due_date)}
                </div>
              </Col>
              <Col md={6} className="text-end">
                {invoice.visit && (
                  <div className="mb-2">
                    <strong>Related Visit:</strong> {formatDate(invoice.visit.visit_date)}
                  </div>
                )}
              </Col>
            </Row>

            {/* Bill To */}
            <Row className="mb-4">
              <Col md={6}>
                <h5 className="mb-3">Bill To:</h5>
                <div>
                  <strong>{invoice.patient?.full_name || `${invoice.patient?.first_name} ${invoice.patient?.last_name}`}</strong>
                </div>
                {invoice.patient?.email && <div>{invoice.patient.email}</div>}
                {invoice.patient?.phone && <div>{invoice.patient.phone}</div>}
                {invoice.patient?.address && <div className="mt-2">{invoice.patient.address}</div>}
              </Col>
            </Row>

            {/* Invoice Items */}
            <Table bordered className="mb-4">
              <thead className="table-light">
                <tr>
                  <th>Description</th>
                  <th className="text-end" style={{ width: '150px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, index) => (
                  <tr key={index}>
                    <td>{item.description}</td>
                    <td className="text-end">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Totals */}
            <Row className="justify-content-end mb-4">
              <Col md={4}>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <strong>{formatCurrency(invoice.subtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax ({invoice.tax_rate || 0}%):</span>
                  <strong>{formatCurrency(invoice.tax_amount)}</strong>
                </div>
                <hr />
                <div className="d-flex justify-content-between mb-3">
                  <strong className="fs-5">Total:</strong>
                  <strong className="fs-5 text-primary">{formatCurrency(invoice.total_amount)}</strong>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="d-flex justify-content-between mb-2 text-success">
                      <span>Total Paid:</span>
                      <strong>-{formatCurrency(totalPaid)}</strong>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong className="fs-5">Balance Due:</strong>
                      <strong className="fs-5 text-danger">{formatCurrency(outstanding)}</strong>
                    </div>
                  </>
                )}
              </Col>
            </Row>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-3">Payment History</h5>
                <Table bordered size="sm">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment, index) => (
                      <tr key={index}>
                        <td>{formatDateTime(payment.payment_date)}</td>
                        <td>{payment.payment_method}</td>
                        <td>{payment.reference_number || '-'}</td>
                        <td className="text-end">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-4">
                <h6>Notes:</h6>
                <p className="text-muted">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <hr className="my-4" />
            <p className="text-center text-muted small mb-0">
              Thank you for your business!
            </p>
          </Card.Body>
        </Card>
      </Container>

      {/* Record Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Record Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            Outstanding Balance: <strong>{formatCurrency(outstanding)}</strong>
          </Alert>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Payment Amount *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                max={outstanding}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method *</Form.Label>
              <Form.Select
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reference Number (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Check number, transaction ID, etc."
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Additional notes..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={submittingPayment}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRecordPayment} disabled={submittingPayment}>
            {submittingPayment ? 'Recording...' : 'Record Payment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this invoice? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Invoice'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default InvoiceDetails;
