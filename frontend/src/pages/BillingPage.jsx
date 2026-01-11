/**
 * Billing Page Component
 * Invoice management with table view and modal-based CRUD operations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Row, Col, Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import InvoiceList from '../components/InvoiceList';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import EditInvoiceModal from '../components/EditInvoiceModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import * as billingService from '../services/billingService';

const BillingPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

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
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (hasPermission('billing.read')) {
      fetchInvoices();
    }
  }, [filters, hasPermission]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await billingService.getInvoices(filters);
      const invoicesData = response.data || [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setPagination(response.pagination || null);
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
      </Container>
    </Layout>
  );
};

export default BillingPage;