/**
 * Dashboard Page Component
 * Main landing page after login with stats and quick links
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import useModalParam from '../hooks/useModalParam';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import QuickPatientModal from '../components/QuickPatientModal';
import CreateVisitModal from '../components/CreateVisitModal';
import AlertsWidget from '../components/AlertsWidget';
import MeasureAlertsWidget from '../components/MeasureAlertsWidget';
import {
  PracticeOverviewWidget,
  RevenueChartWidget,
  ActivityFeedWidget,
  TaskManagerWidget,
  PracticeHealthScoreWidget,
  WhatsNewWidget,
  CampaignsWidget,
  RecentJournalWidget,
  BirthdaysWidget,
  TasksDueTodayWidget
} from '../components/dashboard';
import visitService from '../services/visitService';
import dashboardService from '../services/dashboardService';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  FaCalendarDay, FaCheckCircle, FaCalendarAlt, FaEnvelope,
  FaFileInvoiceDollar, FaFileSignature, FaBook, FaUserClock,
  FaBirthdayCake, FaTasks, FaHeartbeat, FaCog
} from 'react-icons/fa';

/** Stat card config: icon, color, nav target */
const STAT_CARD_CONFIG = {
  todaysAppointments: { icon: FaCalendarDay, color: '#2563eb', nav: () => `/visits?date=${format(new Date(), 'yyyy-MM-dd')}` },
  completedToday:     { icon: FaCheckCircle,  color: '#16a34a', nav: () => `/visits?status=COMPLETED&date=${format(new Date(), 'yyyy-MM-dd')}` },
  upcomingVisits:     { icon: FaCalendarAlt,   color: '#0891b2', nav: () => '/visits?status=SCHEDULED' },
  newMessages:        { icon: FaEnvelope,      color: '#d97706', nav: () => '/messages' },
  unpaidInvoices:     { icon: FaFileInvoiceDollar, color: '#dc2626', nav: () => '/billing?status=SENT,OVERDUE' },
  pendingQuotes:      { icon: FaFileSignature, color: '#7c3aed', nav: () => '/quotes?status=SENT' },
  todaysJournalEntries: { icon: FaBook,        color: '#059669', nav: () => null, scrollTo: 'recentJournalWidget' },
  patientsWithoutFollowup: { icon: FaUserClock, color: '#ea580c', nav: () => '/patients' },
  upcomingBirthdays:  { icon: FaBirthdayCake,  color: '#ec4899', nav: () => null, scrollTo: 'birthdaysWidget' },
  tasksDueToday:      { icon: FaTasks,         color: '#4f46e5', nav: () => null, scrollTo: 'tasksDueTodayWidget' },
  newPatientMeasures: { icon: FaHeartbeat,     color: '#0d9488', nav: () => '/patients' },
};

const STAT_CARD_ORDER = [
  'todaysAppointments', 'completedToday', 'upcomingVisits', 'newMessages',
  'unpaidInvoices', 'pendingQuotes', 'todaysJournalEntries',
  'patientsWithoutFollowup', 'upcomingBirthdays', 'tasksDueToday', 'newPatientMeasures'
];

const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dashboardMode, setDashboardMode] = useState('day');
  const [dayStats, setDayStats] = useState(null);
  const [dayStatsLoading, setDayStatsLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [todaysVisits, setTodaysVisits] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [showQuickPatientModal, openQuickPatientModal, closeQuickPatientModal] = useModalParam('new-patient');
  const [showCreateVisitModal, openCreateVisitModal, closeCreateVisitModal] = useModalParam('new-visit');

  useEffect(() => {
    fetchDayStats();
    fetchPreferences();
    fetchTodaysVisits();

    const savedMode = localStorage.getItem('nutrivault_dashboard_mode');
    if (savedMode && (savedMode === 'day' || savedMode === 'office')) {
      setDashboardMode(savedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nutrivault_dashboard_mode', dashboardMode);
  }, [dashboardMode]);

  const fetchDayStats = async () => {
    try {
      setDayStatsLoading(true);
      const result = await dashboardService.getDayStats();
      setDayStats(result.data);
    } catch (error) {
      console.error('Error fetching day stats:', error);
    } finally {
      setDayStatsLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const result = await dashboardService.getDashboardPreferences();
      setPreferences(result.data?.widgets || {});
    } catch (error) {
      console.error('Error fetching dashboard preferences:', error);
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
    fetchDayStats();
    navigate(`/patients/${patient.id}`);
  };

  const formatCustomFieldValue = (value, fieldType) => {
    if (value === null || value === undefined || value === '') return null;
    if (fieldType === 'boolean') return value ? t('common.yes') : t('common.no');
    if (fieldType === 'date') return format(new Date(value), 'dd/MM/yyyy');
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  const isWidgetEnabled = (key) => {
    if (!preferences) return true; // show all while loading
    return preferences[key] !== false;
  };

  const handleStatCardClick = (key) => {
    const config = STAT_CARD_CONFIG[key];
    if (!config) return;
    if (config.scrollTo) {
      const el = document.getElementById(config.scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const path = config.nav();
    if (path) navigate(path);
  };

  const enabledStatCards = STAT_CARD_ORDER.filter(key => isWidgetEnabled(key));

  return (
    <Layout>
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h1 className="mb-0">{t('dashboard.welcomeBack', { username: user?.username })} 👋</h1>
          <div className="d-flex align-items-center gap-2">
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
            {dashboardMode === 'day' && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/settings/dashboard')}
                title={t('dashboard.dashboardSettings', 'Paramètres du tableau de bord')}
              >
                <FaCog />
              </Button>
            )}
          </div>
        </div>

        {/* MY DAY VIEW */}
        {dashboardMode === 'day' ? (
          <>
            {/* Quick Actions */}
            <Row className="g-3 mb-4">
              <Col xs={12} sm={4}>
                <Button variant="success" className="w-100 py-3" onClick={openQuickPatientModal}>
                  <div className="h4 mb-1">⚡</div>
                  <div>{t('dashboard.quickPatient', 'Patient Flash')}</div>
                </Button>
              </Col>
              <Col xs={12} sm={4}>
                <Button variant="primary" className="w-100 py-3" onClick={openCreateVisitModal}>
                  <div className="h4 mb-1">📅</div>
                  <div>{t('dashboard.scheduleVisit')}</div>
                </Button>
              </Col>
              <Col xs={12} sm={4}>
                <Button variant="info" className="w-100 py-3" onClick={() => navigate('/agenda')}>
                  <div className="h4 mb-1">🗓️</div>
                  <div>{t('dashboard.viewAgenda')}</div>
                </Button>
              </Col>
            </Row>

            {/* Stat Cards — dynamic grid */}
            {enabledStatCards.length > 0 && (
              <Row className="g-3 mb-4">
                {enabledStatCards.map(key => {
                  const config = STAT_CARD_CONFIG[key];
                  const IconComponent = config.icon;
                  const value = dayStats ? dayStats[key] : null;
                  return (
                    <Col xs={6} md={4} lg={3} key={key}>
                      <Card
                        className="text-center shadow-sm h-100"
                        style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${config.color}` }}
                        onClick={() => handleStatCardClick(key)}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                      >
                        <Card.Body className="py-3">
                          <IconComponent size={20} color={config.color} className="mb-2" />
                          <div className="h2 mb-1" style={{ color: config.color }}>
                            {dayStatsLoading ? '...' : (value ?? 0)}
                          </div>
                          <div className="text-muted small">{t(`dashboard.${key}`)}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}

            {/* Alerts Widgets */}
            {(isWidgetEnabled('alertsWidget') || isWidgetEnabled('measureAlertsWidget')) && (
              <Row className="mb-4">
                {isWidgetEnabled('alertsWidget') && (
                  <Col md={12} lg={6} className="mb-3 mb-lg-0">
                    <AlertsWidget />
                  </Col>
                )}
                {isWidgetEnabled('measureAlertsWidget') && (
                  <Col md={12} lg={6}>
                    <MeasureAlertsWidget />
                  </Col>
                )}
              </Row>
            )}

            {/* Birthdays Widget */}
            {isWidgetEnabled('birthdaysWidget') && dayStats?.birthdayList?.length > 0 && (
              <Row className="mb-4" id="birthdaysWidget">
                <Col>
                  <BirthdaysWidget birthdays={dayStats.birthdayList} />
                </Col>
              </Row>
            )}

            {/* Tasks Due Today Widget */}
            {isWidgetEnabled('tasksDueTodayWidget') && (
              <Row className="mb-4" id="tasksDueTodayWidget">
                <Col>
                  <TasksDueTodayWidget />
                </Col>
              </Row>
            )}

            {/* Recent Patient Journal */}
            {isWidgetEnabled('recentJournalWidget') && (
              <Row className="mb-4" id="recentJournalWidget">
                <Col>
                  <RecentJournalWidget />
                </Col>
              </Row>
            )}

            {/* Today's Appointments List */}
            {isWidgetEnabled('todaysAppointmentsList') && (
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
            )}
          </>
        ) : (
          /* MY OFFICE VIEW */
          <>
            <WhatsNewWidget />
            <PracticeOverviewWidget />
            <Row className="mb-4">
              <Col lg={8} className="mb-4 mb-lg-0">
                <RevenueChartWidget />
              </Col>
              <Col lg={4}>
                <PracticeHealthScoreWidget />
              </Col>
            </Row>
            <Row className="mb-4">
              <Col lg={6} className="mb-4 mb-lg-0">
                <ActivityFeedWidget />
              </Col>
              <Col lg={6}>
                <TaskManagerWidget />
              </Col>
            </Row>
            <Row className="mb-4">
              <Col lg={6} className="mb-4 mb-lg-0">
                <CampaignsWidget />
              </Col>
              <Col lg={6}>
                <RecentJournalWidget />
              </Col>
            </Row>
            <Row className="g-3">
              <Col md={3}>
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
              <Col md={3}>
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
              <Col md={3}>
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
              <Col md={3}>
                <Card className="text-center h-100 shadow-sm border-0">
                  <Card.Body className="py-3">
                    <div className="h3 mb-2">📊</div>
                    <h6 className="mb-2">{t('navigation.finance')}</h6>
                    <Link to="/finance" className="btn btn-outline-primary btn-sm">
                      {t('dashboard.viewFinance', 'Voir Finance')}
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>

      <QuickPatientModal
        show={showQuickPatientModal}
        onHide={closeQuickPatientModal}
        onSuccess={handleQuickPatientCreated}
      />

      <CreateVisitModal
        show={showCreateVisitModal}
        onHide={closeCreateVisitModal}
        onSuccess={() => {
          closeCreateVisitModal();
          fetchTodaysVisits();
          fetchDayStats();
        }}
      />
    </Layout>
  );
};

export default DashboardPage;
