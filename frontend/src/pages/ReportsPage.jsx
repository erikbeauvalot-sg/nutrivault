import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ExportModal from '../components/ExportModal';
import { getUsers } from '../services/userService';
import { getPatients } from '../services/patientService';
import { getVisits } from '../services/visitService';
import { getInvoices } from '../services/billingService';

/**
 * ReportsPage Component
 * Dashboard showing statistics and export functionality
 */
const ReportsPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  console.log('🔐 ReportsPage - isAuthenticated:', isAuthenticated);
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, inactive: 0 },
    patients: { total: 0, active: 0 },
    visits: { total: 0, completed: 0, scheduled: 0 },
    billing: { total: 0, paid: 0, pending: 0, overdue: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportModal, setExportModal] = useState({
    show: false,
    dataType: null
  });

  // Load statistics on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadStatistics();
    }
  }, [isAuthenticated]);

  // Load all statistics
  const loadStatistics = async () => {
    console.log('📊 loadStatistics called');
    setLoading(true);
    setError(null);

    try {
      // Load data from all services
      const [usersRes, patientsRes, visitsRes, billingRes] = await Promise.all([
        getUsers({ limit: 1000 }), // Get all users for counting
        getPatients({ limit: 1000 }), // Get all patients for counting
        getVisits({ limit: 1000 }), // Get all visits for counting
        getInvoices({ limit: 1000 }) // Get all billing records for counting
      ]);

      console.log('✅ API responses received');
      console.log('👥 Users response:', usersRes);
      console.log('🏥 Patients response:', patientsRes);
      console.log('🏥 Patients response.data:', patientsRes.data);
      console.log('🏥 Patients response.data.data:', patientsRes.data?.data);
      console.log('🏥 Patients response.data.data type:', typeof patientsRes.data?.data);
      console.log('🏥 Patients response.data.data length:', patientsRes.data?.data?.length);
      console.log('👥 Users:', usersRes.data?.data?.length || 0);
      console.log('🏥 Patients:', patientsRes.data?.data?.length || 0);

      // Process users statistics
      const users = usersRes.data?.data || [];
      const activeUsers = users.filter(u => u.is_active).length;
      const inactiveUsers = users.length - activeUsers;

      // Process patients statistics
      const patients = patientsRes.data?.data || [];
      const activePatients = patients.filter(p => p.is_active).length;

      // Process visits statistics
      const visits = visitsRes.data?.data || [];
      const completedVisits = visits.filter(v => v.status === 'COMPLETED').length;
      const scheduledVisits = visits.filter(v => v.status === 'SCHEDULED').length;

      // Process billing statistics
      const billing = billingRes.data?.data || [];
      console.log('💰 Billing data received:', billing.length, 'invoices');
      console.log('💰 Billing statuses:', billing.map(b => b.status));
      const paidBilling = billing.filter(b => b.status === 'PAID').length;
      const pendingBilling = billing.filter(b => b.status === 'SENT').length;
      const overdueBilling = billing.filter(b => b.status === 'OVERDUE').length;
      console.log('💰 Billing counts - Paid:', paidBilling, 'Pending:', pendingBilling, 'Overdue:', overdueBilling);

      setStats({
        users: {
          total: users.length,
          active: activeUsers,
          inactive: inactiveUsers
        },
        patients: {
          total: patients.length,
          active: activePatients
        },
        visits: {
          total: visits.length,
          completed: completedVisits,
          scheduled: scheduledVisits
        },
        billing: {
          total: billing.length,
          paid: paidBilling,
          pending: pendingBilling,
          overdue: overdueBilling
        }
      });

    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError(t('reports.loadError', 'Failed to load statistics'));
    } finally {
      setLoading(false);
    }
  };

  // Handle export modal
  const handleExport = (dataType) => {
    setExportModal({
      show: true,
      dataType
    });
  };

  const handleExportModalClose = () => {
    setExportModal({
      show: false,
      dataType: null
    });
  };

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <Container className="py-4">
          <Alert variant="warning">
            <h4>{t('auth.loginRequired', 'Authentication Required')}</h4>
            <p>{t('reports.authRequired', 'Please log in to view reports and statistics.')}</p>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Container className="py-4">
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
            </Spinner>
            <p className="mt-2">{t('reports.loadingStats', 'Loading statistics...')}</p>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>{t('reports.title', 'Reports & Export')}</h1>
          <Button
            variant="outline-primary"
            onClick={loadStatistics}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        {/* Users Statistics */}
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title className="d-flex align-items-center">
                <i className="bi bi-people text-primary me-2"></i>
                {t('users.title', 'Users')}
              </Card.Title>
              <div className="mb-2">
                <strong>{t('common.total', 'Total')}:</strong> {stats.users.total}
              </div>
              <div className="mb-2 text-success">
                <strong>{t('common.active', 'Active')}:</strong> {stats.users.active}
              </div>
              <div className="mb-2 text-secondary">
                <strong>{t('common.inactive', 'Inactive')}:</strong> {stats.users.inactive}
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleExport('users')}
                className="w-100"
              >
                <i className="bi bi-download me-1"></i>
                {t('common.export', 'Export')}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Patients Statistics */}
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title className="d-flex align-items-center">
                <i className="bi bi-person-hearts text-success me-2"></i>
                {t('patients.title', 'Patients')}
              </Card.Title>
              <div className="mb-2">
                <strong>{t('common.total', 'Total')}:</strong> {stats.patients.total}
              </div>
              <div className="mb-2 text-success">
                <strong>{t('common.active', 'Active')}:</strong> {stats.patients.active}
              </div>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleExport('patients')}
                className="w-100"
              >
                <i className="bi bi-download me-1"></i>
                {t('common.export', 'Export')}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Visits Statistics */}
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title className="d-flex align-items-center">
                <i className="bi bi-calendar-check text-info me-2"></i>
                {t('visits.title', 'Visits')}
              </Card.Title>
              <div className="mb-2">
                <strong>{t('common.total', 'Total')}:</strong> {stats.visits.total}
              </div>
              <div className="mb-2 text-success">
                <strong>{t('common.completed', 'Completed')}:</strong> {stats.visits.completed}
              </div>
              <div className="mb-2 text-warning">
                <strong>{t('common.scheduled', 'Scheduled')}:</strong> {stats.visits.scheduled}
              </div>
              <Button
                variant="outline-info"
                size="sm"
                onClick={() => handleExport('visits')}
                className="w-100"
              >
                <i className="bi bi-download me-1"></i>
                {t('common.export', 'Export')}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Billing Statistics */}
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title className="d-flex align-items-center">
                <i className="bi bi-cash text-warning me-2"></i>
                {t('billing.title', 'Billing')}
              </Card.Title>
              <div className="mb-2">
                <strong>{t('common.total', 'Total')}:</strong> {stats.billing.total}
              </div>
              <div className="mb-2 text-success">
                <strong>{t('common.paid', 'Paid')}:</strong> {stats.billing.paid}
              </div>
              <div className="mb-2 text-warning">
                <strong>{t('common.pending', 'Pending')}:</strong> {stats.billing.pending}
              </div>
              <div className="mb-2 text-danger">
                <strong>{t('common.overdue', 'Overdue')}:</strong> {stats.billing.overdue}
              </div>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => handleExport('billing')}
                className="w-100"
              >
                <i className="bi bi-download me-1"></i>
                {t('common.export', 'Export')}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Export Modal */}
      <ExportModal
        show={exportModal.show}
        onHide={handleExportModalClose}
        dataType={exportModal.dataType}
      />
    </Container>
    </Layout>
  );
};

export default ReportsPage;