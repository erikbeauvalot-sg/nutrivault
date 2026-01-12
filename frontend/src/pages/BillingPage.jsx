/**
 * Billing Page Component
 * Invoice management with table view and modal-based CRUD operations
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Container, Button, Row, Col, Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import InvoiceList from '../components/InvoiceList';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import EditInvoiceModal from '../components/EditInvoiceModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import ExportModal from '../components/ExportModal';
import * as billingService from '../services/billingService';

const BillingPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // For individual invoice view

  // Check if we're viewing a specific invoice
  const isViewingInvoice = !!id;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Individual invoice view state
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (hasPermission('billing.read')) {
      fetchInvoices();
    }
  }, [filters, hasPermission]);

  // Check if we navigated here from visit creation and refresh
  useEffect(() => {
    if (location.state?.refreshFromVisit) {
      console.log('🔄 Refreshing billing page after visit creation');
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
      // Force refresh after a short delay to ensure invoice was created
      setTimeout(() => {
        fetchInvoices();
      }, 500);
    }
  }, [location.state]);

  // Fetch individual invoice if ID is present
  useEffect(() => {
    if (isViewingInvoice && hasPermission('billing.read')) {
      fetchInvoiceById(id);
    }
  }, [id, isViewingInvoice, hasPermission]);

  const fetchInvoiceById = async (invoiceId) => {
    try {
      setInvoiceLoading(true);
      const response = await billingService.getInvoiceById(invoiceId);
      setCurrentInvoice(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load invoice: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching invoice:', err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await billingService.getInvoices(filters);
      const invoicesData = response.data.data || [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setPagination(response.data.pagination || null);
      setError(null);
    } catch (err) {
      setError('Failed to load invoices: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (invoiceData) => {
    try {
      await billingService.createInvoice(invoiceData);
      setShowCreateModal(false);
      fetchInvoices(); // Refresh list
    } catch (err) {
      throw new Error('Failed to create invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRecordPayment = async (paymentData) => {
    try {
      await billingService.recordPayment(selectedInvoice.id, paymentData);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchInvoices(); // Refresh list
    } catch (err) {
      throw new Error('Failed to record payment: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await billingService.deleteInvoice(invoiceId);
      fetchInvoices(); // Refresh list
    } catch (err) {
      setError('Failed to delete invoice: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleViewInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}`);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async (invoiceId, invoiceData) => {
    try {
      await billingService.updateInvoice(invoiceId, invoiceData);
      await fetchInvoices(); // Refresh the list
    } catch (err) {
      console.error('Failed to update invoice:', err);
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const handleRecordPaymentClick = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, page: 1 }); // Reset to page 1 when filtering
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  if (!hasPermission('billing.read')) {
    return (
      <Layout>
        <Container>
          <Alert variant="danger">
            You don't have permission to view billing information.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h1>{t('billing.title', 'Billing Management')}</h1>
            <p className="text-muted">
              {t('billing.subtitle', 'Manage invoices and track payments')}
            </p>
          </Col>
          <Col xs="auto">
            <Button
              variant="outline-secondary"
              onClick={() => setShowExportModal(true)}
              className="me-2"
            >
              <i className="bi bi-download me-2"></i>
              {t('common.export', 'Export')}
            </Button>
            {hasPermission('billing.create') && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus me-2"></i>
                {t('billing.createInvoice', 'Create Invoice')}
              </Button>
            )}
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isViewingInvoice ? (
          // Individual invoice view
          <div>
            <Row className="mb-3">
              <Col>
                <Button variant="outline-secondary" onClick={() => navigate('/billing')}>
                  <i className="fas fa-arrow-left me-2"></i>
                  {t('billing.backToList', 'Back to Invoices')}
                </Button>
              </Col>
            </Row>

            {invoiceLoading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : currentInvoice ? (
              <div className="card">
                <div className="card-header">
                  <h3>{t('billing.invoice', 'Invoice')} #{currentInvoice.invoice_number}</h3>
                  <Badge bg={
                    currentInvoice.status === 'PAID' ? 'success' :
                    currentInvoice.status === 'OVERDUE' ? 'danger' :
                    currentInvoice.status === 'SENT' ? 'warning' : 'secondary'
                  }>
                    {currentInvoice.status}
                  </Badge>
                </div>
                <div className="card-body">
                  <Row>
                    <Col md={6}>
                      <h5>{t('billing.patient', 'Patient')}</h5>
                      <p>{currentInvoice.patient?.first_name} {currentInvoice.patient?.last_name}</p>
                      
                      <h5>{t('billing.amount', 'Amount')}</h5>
                      <p className="h4">${currentInvoice.amount?.toFixed(2)}</p>
                      
                      <h5>{t('billing.dueDate', 'Due Date')}</h5>
                      <p>{new Date(currentInvoice.due_date).toLocaleDateString()}</p>
                    </Col>
                    <Col md={6}>
                      <h5>{t('billing.created', 'Created')}</h5>
                      <p>{new Date(currentInvoice.created_at).toLocaleDateString()}</p>
                      
                      <h5>{t('billing.description', 'Description')}</h5>
                      <p>{currentInvoice.description || t('billing.noDescription', 'No description')}</p>
                    </Col>
                  </Row>
                </div>
                <div className="card-footer">
                  <Button variant="primary" onClick={() => handleEditInvoice(currentInvoice)}>
                    <i className="fas fa-edit me-2"></i>
                    {t('billing.editInvoice', 'Edit Invoice')}
                  </Button>
                  {currentInvoice.status !== 'PAID' && (
                    <Button variant="success" className="ms-2" onClick={() => handleRecordPaymentClick(currentInvoice)}>
                      <i className="fas fa-dollar-sign me-2"></i>
                      {t('billing.recordPayment', 'Record Payment')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Alert variant="warning">
                {t('billing.invoiceNotFound', 'Invoice not found')}
              </Alert>
            )}
          </div>
        ) : (
          // Invoice list view
          <InvoiceList
            invoices={invoices}
            loading={loading}
            filters={filters}
            pagination={pagination}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onView={handleViewInvoice}
            onEdit={handleEditInvoice}
            onRecordPayment={handleRecordPaymentClick}
            onDelete={handleDeleteInvoice}
            canCreate={hasPermission('billing.create')}
            canUpdate={hasPermission('billing.update')}
            canDelete={hasPermission('billing.delete')}
          />
        )}

        {/* Modals */}
        <CreateInvoiceModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onSubmit={handleCreateInvoice}
        />

        <EditInvoiceModal
          show={showEditModal}
          onHide={() => {
            setShowEditModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleUpdateInvoice}
          invoice={selectedInvoice}
        />

        <RecordPaymentModal
          show={showPaymentModal}
          onHide={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleRecordPayment}
          invoice={selectedInvoice}
        />

        <ExportModal
          show={showExportModal}
          onHide={() => setShowExportModal(false)}
          dataType="billing"
        />
      </Container>
    </Layout>
  );
};

export default BillingPage;