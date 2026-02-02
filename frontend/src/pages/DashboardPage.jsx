/**
 * Dashboard Page Component
 * Main landing page after login with stats and quick links
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import QuickPatientModal from '../components/QuickPatientModal';
import AlertsWidget from '../components/AlertsWidget';
import MeasureAlertsWidget from '../components/MeasureAlertsWidget';
import {
  PracticeOverviewWidget,
  RevenueChartWidget,
  ActivityFeedWidget,
  TaskManagerWidget,
  PracticeHealthScoreWidget,
  WhatsNewWidget,
  CampaignsWidget
} from '../components/dashboard';
import api from '../services/api';
import visitService from '../services/visitService';
import userService from '../services/userService';
import * as patientService from '../services/patientService';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';

const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dashboardMode, setDashboardMode] = useState('day'); // 'day' or 'office'
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    totalVisits: 0,
    scheduledVisits: 0,
    completedToday: 0,
    totalUsers: 0,
    pendingInvoices: 0,
    loading: true,
  });
  const [todaysVisits, setTodaysVisits] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [showQuickPatientModal, setShowQuickPatientModal] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTodaysVisits();

    // Load dashboard mode preference
    const savedMode = localStorage.getItem('nutrivault_dashboard_mode');
    if (savedMode && (savedMode === 'day' || savedMode === 'office')) {
      setDashboardMode(savedMode);
    }
  }, []);

  // Save dashboard mode preference when it changes
  useEffect(() => {
    localStorage.setItem('nutrivault_dashboard_mode', dashboardMode);
  }, [dashboardMode]);

  const toggleDashboardMode = () => {
    setDashboardMode(prevMode => prevMode === 'day' ? 'office' : 'day');
  };

  const fetchStats = async () => {
    try {
      // Fetch patients count
      const { data: patientsData } = await patientService.getPatients({ limit: 1000 }); // Get all patients for stats
      const totalPatients = Array.isArray(patientsData) ? patientsData.length : 0;
      const activePatients = Array.isArray(patientsData)
        ? patientsData.filter(p => p.is_active !== false).length
        : 0;

      // Fetch visits count
      let totalVisits = 0;
      let scheduledVisits = 0;
      let completedToday = 0;
      try {
        const { data: visitsData } = await visitService.getVisits({ limit: 1000 });
        totalVisits = Array.isArray(visitsData) ? visitsData.length : 0;
        scheduledVisits = Array.isArray(visitsData)
          ? visitsData.filter(v => v.status === 'SCHEDULED').length
          : 0;
        completedToday = Array.isArray(visitsData)
          ? visitsData.filter(v => v.status === 'COMPLETED' && isToday(new Date(v.visit_date))).length
          : 0;
      } catch (err) {
        // Error fetching visits
      }

      // Fetch users count (Admin only)
      let totalUsers = 0;
      if (user?.role === 'ADMIN') {
        try {
          const { data: usersData } = await userService.getUsers({ limit: 1000 });
          totalUsers = Array.isArray(usersData) ? usersData.length : 0;
        } catch (err) {
          // Error fetching users
        }
      }

      setStats({
        totalPatients,
        activePatients,
        totalVisits,
        scheduledVisits,
        completedToday,
        totalUsers,
        pendingInvoices: 0, // Will be implemented in Phase 16
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchTodaysVisits = async () => {
    try {
      setLoadingVisits(true);
      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      const { data: visitsData, customFieldDefinitions: fieldDefs } = await visitService.getVisits({
        start_date: startDate,
        end_date: endDate,
        limit: 100
      });

      const visits = Array.isArray(visitsData) ? visitsData : [];

      // Sort by visit time
      visits.sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));

      setTodaysVisits(visits);
      setCustomFieldDefinitions(fieldDefs || []);
    } catch (error) {
      setTodaysVisits([]);
      setCustomFieldDefinitions([]);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleQuickPatientCreated = (patient) => {
    // Refresh stats after creating a patient
    fetchStats();

    // Navigate to the patient detail page
    navigate(`/patients/${patient.id}`);
  };

  const formatCustomFieldValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (fieldType === 'boolean') {
      return value ? t('common.yes') : t('common.no');
    }
    if (fieldType === 'date') {
      return format(new Date(value), 'dd/MM/yyyy');
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  return (
    <Layout>
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h1 className="mb-0">{t('dashboard.welcomeBack', { username: user?.username })} 👋</h1>
          <div className="dashboard-toggle">
            <div className="btn-group flex-wrap" role="group">
              <button
                type="button"
                className={`btn ${dashboardMode === 'day' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setDashboardMode('day')}
              >
                🌅 {t('dashboard.myDay', 'Ma Journée')}
              </button>
              <button
                type="button"
                className={`btn ${dashboardMode === 'office' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setDashboardMode('office')}
              >
                🏢 {t('dashboard.myOffice', 'Mon Cabinet')}
              </button>
            </div>
          </div>
        </div>

        {/* MY DAY VIEW - Mobile-first, consultation-focused */}
        {dashboardMode === 'day' ? (
          <>
            {/* Quick Actions */}
            <Row className="g-3 mb-4">
              <Col xs={12} sm={4}>
                <Button
                  variant="success"
                  className="w-100 py-3"
                  onClick={() => setShowQuickPatientModal(true)}
                >
                  <div className="h4 mb-1">⚡</div>
                  <div>{t('dashboard.quickPatient', 'Patient Flash')}</div>
                </Button>
              </Col>
              <Col xs={12} sm={4}>
                <Button
                  variant="primary"
                  className="w-100 py-3"
                  onClick={() => navigate('/visits/create')}
                >
                  <div className="h4 mb-1">📅</div>
                  <div>{t('dashboard.scheduleVisit')}</div>
                </Button>
              </Col>
              <Col xs={12} sm={4}>
                <Button
                  variant="info"
                  className="w-100 py-3"
                  onClick={() => navigate('/agenda')}
                >
                  <div className="h4 mb-1">🗓️</div>
                  <div>{t('dashboard.viewAgenda')}</div>
                </Button>
              </Col>
            </Row>

            {/* Today's Stats - Clickable cards */}
            <Row className="g-3 mb-4">
              <Col xs={6} md={3}>
                <Card
                  className="text-center shadow-sm cursor-pointer hover-shadow"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    navigate(`/visits?date=${today}`);
                  }}
                >
                  <Card.Body>
                    <div className="h2 text-primary mb-1">
                      {stats.loading ? '...' : todaysVisits.length}
                    </div>
                    <div className="text-muted small">{t('dashboard.todaysAppointments')}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card
                  className="text-center shadow-sm"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    navigate(`/visits?status=COMPLETED&date=${today}`);
                  }}
                >
                  <Card.Body>
                    <div className="h2 text-success mb-1">
                      {stats.loading ? '...' : stats.completedToday}
                    </div>
                    <div className="text-muted small">{t('dashboard.completedToday')}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card
                  className="text-center shadow-sm"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate('/visits?status=SCHEDULED')}
                >
                  <Card.Body>
                    <div className="h2 text-info mb-1">
                      {stats.loading ? '...' : stats.scheduledVisits}
                    </div>
                    <div className="text-muted small">{t('dashboard.upcomingVisits')}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card
                  className="text-center shadow-sm"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate('/patients?is_active=true')}
                >
                  <Card.Body>
                    <div className="h2 text-warning mb-1">
                      {stats.loading ? '...' : stats.activePatients}
                    </div>
                    <div className="text-muted small">{t('dashboard.activePatients')}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Alerts Widget */}
            <Row className="mb-4">
              <Col md={12} lg={6} className="mb-3 mb-lg-0">
                <AlertsWidget />
              </Col>
              <Col md={12} lg={6}>
                <MeasureAlertsWidget />
              </Col>
            </Row>

            {/* Today's Appointments List */}
            <Row>
              <Col>
                <Card className="shadow-sm">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">📅 {t('dashboard.todaysAppointments')}</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {loadingVisits ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">{t('common.loading')}</span>
                        </div>
                      </div>
                    ) : todaysVisits.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <div className="h1 mb-2">☀️</div>
                        <p>{t('dashboard.noAppointmentsToday')}</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px' }}>{t('visits.time', 'Heure')}</th>
                              <th style={{ width: '180px' }}>{t('visits.patient', 'Patient')}</th>
                              <th>{t('visits.type', 'Type')}</th>
                              <th style={{ width: '50px', paddingRight: '25px' }} className="text-center">{t('visits.durationShort', 'Durée')}</th>
                              {customFieldDefinitions.map(field => (
                                <th key={field.id} style={{ paddingLeft: '15px' }}>{field.field_label}</th>
                              ))}
                              <th style={{ width: '90px' }} className="text-end">{t('visits.status', 'Statut')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {todaysVisits.map((visit) => (
                              <tr
                                key={visit.id}
                                onClick={() => navigate(`/visits/${visit.id}/edit`)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td className="fw-bold text-primary">
                                  {format(new Date(visit.visit_date), 'HH:mm')}
                                </td>
                                <td className="fw-bold">
                                  {visit.patient?.first_name} {visit.patient?.last_name}
                                </td>
                                <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                                  {visit.visit_type || t('visits.visit')}
                                </td>
                                <td className="text-muted text-center" style={{ paddingRight: '25px' }}>
                                  {visit.duration_minutes || 30}'
                                </td>
                                {customFieldDefinitions.map(field => (
                                  <td key={field.id} style={{ paddingLeft: '15px' }}>
                                    {formatCustomFieldValue(
                                      visit.custom_field_values?.[field.field_name],
                                      field.field_type
                                    ) || '-'}
                                  </td>
                                ))}
                                <td className="text-end">
                                  <Badge
                                    bg={
                                      visit.status === 'COMPLETED' ? 'success' :
                                      visit.status === 'SCHEDULED' ? 'info' :
                                      visit.status === 'CANCELLED' ? 'secondary' : 'danger'
                                    }
                                  >
                                    {t(`visits.${visit.status.toLowerCase()}`)}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          /* MY OFFICE VIEW - Enhanced dashboard with KPIs, charts, and activity */
          <>
            {/* What's New Widget */}
            <WhatsNewWidget />

            {/* Practice Overview KPIs */}
            <PracticeOverviewWidget />

            {/* Revenue Chart + Health Score */}
            <Row className="mb-4">
              <Col lg={8} className="mb-4 mb-lg-0">
                <RevenueChartWidget />
              </Col>
              <Col lg={4}>
                <PracticeHealthScoreWidget />
              </Col>
            </Row>

            {/* Activity Feed + Task Manager */}
            <Row className="mb-4">
              <Col lg={6} className="mb-4 mb-lg-0">
                <ActivityFeedWidget />
              </Col>
              <Col lg={6}>
                <TaskManagerWidget />
              </Col>
            </Row>

            {/* Campaigns Widget */}
            <Row className="mb-4">
              <Col lg={6} className="mb-4 mb-lg-0">
                <CampaignsWidget />
              </Col>
              <Col lg={6}>
                {/* Placeholder for future widget or leave empty */}
              </Col>
            </Row>

            {/* Quick Navigation Cards */}
            <Row className="g-3">
              <Col md={4}>
                <Card className="text-center h-100 shadow-sm border-0">
                  <Card.Body className="py-3">
                    <div className="h3 mb-2">👥</div>
                    <h6 className="mb-2">{t('navigation.patients')}</h6>
                    <Link to="/patients" className="btn btn-outline-primary btn-sm">
                      {t('dashboard.viewPatients')}
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center h-100 shadow-sm border-0">
                  <Card.Body className="py-3">
                    <div className="h3 mb-2">🗓️</div>
                    <h6 className="mb-2">{t('navigation.agenda')}</h6>
                    <Link to="/agenda" className="btn btn-outline-primary btn-sm">
                      {t('dashboard.viewAgenda')}
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center h-100 shadow-sm border-0">
                  <Card.Body className="py-3">
                    <div className="h3 mb-2">💰</div>
                    <h6 className="mb-2">{t('navigation.billing')}</h6>
                    <Link to="/billing" className="btn btn-outline-primary btn-sm">
                      {t('dashboard.viewBilling')}
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>

      {/* Quick Patient Modal */}
      <QuickPatientModal
        show={showQuickPatientModal}
        onHide={() => setShowQuickPatientModal(false)}
        onSuccess={handleQuickPatientCreated}
      />
    </Layout>
  );
};

export default DashboardPage;
