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
import ExportModal from '../components/ExportModal';
import ConfirmModal from '../components/ConfirmModal';
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

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
      setError(t('errors.failedToLoadInvoice', { error: err.response?.data?.error || err.message }));
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
      setError(t('errors.failedToLoadInvoices', { error: err.response?.data?.error || err.message }));
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = (invoiceId) => {
    setInvoiceToDelete(invoiceId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await billingService.deleteInvoice(invoiceToDelete);
      fetchInvoices(); // Refresh list
    } catch (err) {
      setError(t('errors.failedToDeleteInvoice', { error: err.response?.data?.error || err.message }));
    } finally {
      setInvoiceToDelete(null);
    }
  };

  const handleViewInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}`);
  };

  const handleEditInvoice = (invoice) => {
    navigate(`/billing/${invoice.id}/edit`);
  };

  const handleRecordPaymentClick = (invoice) => {
    navigate(`/billing/${invoice.id}/record-payment`);
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
            {t('billing.noPermission')}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid>
        <Row className="mb-4 align-items-center">
          <Col xs={12} md>
            <h1>{t('billing.title', 'Billing Management')}</h1>
            <p className="text-muted mb-0">
              {t('billing.subtitle', 'Manage invoices and track payments')}
            </p>
          </Col>
          <Col xs={12} md="auto" className="mt-3 mt-md-0">
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                onClick={() => setShowExportModal(true)}
              >
                <i className="bi bi-download me-2"></i>
                {t('common.export', 'Export')}
              </Button>
              {hasPermission('billing.create') && (
                <Button
                  variant="primary"
                  onClick={() => navigate('/billing/create')}
                >
                  <i className="fas fa-plus me-2"></i>
                  {t('billing.createInvoice', 'Create Invoice')}
                </Button>
              )}
            </div>
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
                    <Col xs={12} md={6} className="mb-3 mb-md-0">
                      <h5>{t('billing.patient', 'Patient')}</h5>
                      <p>{currentInvoice.patient?.first_name} {currentInvoice.patient?.last_name}</p>

                      <h5>{t('billing.amount', 'Amount')}</h5>
                      <p className="h4">{currentInvoice.amount?.toFixed(2)} €</p>

                      <h5>{t('billing.dueDate', 'Due Date')}</h5>
                      <p>{new Date(currentInvoice.due_date).toLocaleDateString()}</p>
                    </Col>
                    <Col xs={12} md={6}>
                      <h5>{t('billing.created', 'Created')}</h5>
                      <p>{new Date(currentInvoice.created_at).toLocaleDateString()}</p>

                      <h5>{t('billing.description', 'Description')}</h5>
                      <p>{currentInvoice.description || t('billing.noDescription', 'No description')}</p>
                    </Col>
                  </Row>
                </div>
                <div className="card-footer d-flex gap-2 flex-wrap">
                  <Button variant="primary" onClick={() => handleEditInvoice(currentInvoice)}>
                    <i className="fas fa-edit me-2"></i>
                    {t('billing.editInvoice', 'Edit Invoice')}
                  </Button>
                  {currentInvoice.status !== 'PAID' && (
                    <Button variant="success" onClick={() => handleRecordPaymentClick(currentInvoice)}>
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
        <ExportModal
          show={showExportModal}
          onHide={() => setShowExportModal(false)}
          dataType="billing"
        />

        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => {
            setShowDeleteConfirm(false);
            setInvoiceToDelete(null);
          }}
          onConfirm={confirmDeleteInvoice}
          title={t('common.confirmation', 'Confirmation')}
          message={t('billing.confirmDeleteInvoice')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default BillingPage;