/**
 * Dashboard Settings Page
 * Allows each dietitian to toggle which indicators/widgets appear on their dashboard
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import dashboardService from '../services/dashboardService';
import {
  FaCalendarDay, FaCheckCircle, FaCalendarAlt, FaEnvelope,
  FaFileInvoiceDollar, FaFileSignature, FaBook, FaUserClock,
  FaBirthdayCake, FaTasks, FaHeartbeat, FaExclamationTriangle,
  FaRuler, FaJournalWhills, FaListAlt, FaSave, FaArrowLeft
} from 'react-icons/fa';

const STAT_CARDS = [
  { key: 'todaysAppointments', icon: FaCalendarDay, color: '#2563eb' },
  { key: 'completedToday', icon: FaCheckCircle, color: '#16a34a' },
  { key: 'upcomingVisits', icon: FaCalendarAlt, color: '#0891b2' },
  { key: 'newMessages', icon: FaEnvelope, color: '#d97706' },
  { key: 'unpaidInvoices', icon: FaFileInvoiceDollar, color: '#dc2626' },
  { key: 'pendingQuotes', icon: FaFileSignature, color: '#7c3aed' },
  { key: 'todaysJournalEntries', icon: FaBook, color: '#059669' },
  { key: 'patientsWithoutFollowup', icon: FaUserClock, color: '#ea580c' },
  { key: 'upcomingBirthdays', icon: FaBirthdayCake, color: '#ec4899' },
  { key: 'tasksDueToday', icon: FaTasks, color: '#4f46e5' },
  { key: 'newPatientMeasures', icon: FaHeartbeat, color: '#0d9488' },
];

const FULL_WIDGETS = [
  { key: 'alertsWidget', icon: FaExclamationTriangle, color: '#f59e0b' },
  { key: 'measureAlertsWidget', icon: FaRuler, color: '#ef4444' },
  { key: 'recentJournalWidget', icon: FaJournalWhills, color: '#10b981' },
  { key: 'todaysAppointmentsList', icon: FaListAlt, color: '#3b82f6' },
  { key: 'birthdaysWidget', icon: FaBirthdayCake, color: '#ec4899' },
  { key: 'tasksDueTodayWidget', icon: FaTasks, color: '#6366f1' },
];

const DashboardSettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getDashboardPreferences();
      setWidgets(result.data?.widgets || {});
    } catch (err) {
      setError(t('common.loadError', 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setWidgets(prev => ({ ...prev, [key]: !prev[key] }));
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await dashboardService.updateDashboardPreferences(widgets);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(t('common.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="text-center py-5">
          <Spinner animation="border" />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/dashboard')}>
              <FaArrowLeft />
            </Button>
            <div>
              <h2 className="mb-0">{t('dashboard.dashboardSettings', 'Paramètres du tableau de bord')}</h2>
              <p className="text-muted mb-0 small">{t('dashboard.dashboardSettingsDesc', 'Choisissez les indicateurs et widgets visibles sur votre tableau de bord')}</p>
            </div>
          </div>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" animation="border" className="me-1" /> : <FaSave className="me-1" />}
            {t('common.save', 'Enregistrer')}
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success">{t('common.savedSuccess', 'Enregistré avec succès')}</Alert>}

        {/* Stat Cards Section */}
        <Card className="mb-4 shadow-sm">
          <Card.Header>
            <h5 className="mb-0">{t('dashboard.statCards', 'Indicateurs')}</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              {STAT_CARDS.map(({ key, icon: Icon, color }) => (
                <Col xs={12} sm={6} md={4} key={key}>
                  <div
                    className="d-flex align-items-center gap-3 p-2 rounded"
                    style={{
                      backgroundColor: widgets[key] !== false ? `${color}10` : '#f3f4f6',
                      border: `1px solid ${widgets[key] !== false ? color : '#e5e7eb'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Form.Check
                      type="switch"
                      id={`switch-${key}`}
                      checked={widgets[key] !== false}
                      onChange={() => handleToggle(key)}
                    />
                    <Icon size={18} color={widgets[key] !== false ? color : '#9ca3af'} />
                    <span className={widgets[key] !== false ? 'fw-medium' : 'text-muted'}>
                      {t(`dashboard.${key}`)}
                    </span>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>

        {/* Full Widgets Section */}
        <Card className="mb-4 shadow-sm">
          <Card.Header>
            <h5 className="mb-0">{t('dashboard.fullWidgets', 'Widgets')}</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              {FULL_WIDGETS.map(({ key, icon: Icon, color }) => (
                <Col xs={12} sm={6} key={key}>
                  <div
                    className="d-flex align-items-center gap-3 p-2 rounded"
                    style={{
                      backgroundColor: widgets[key] !== false ? `${color}10` : '#f3f4f6',
                      border: `1px solid ${widgets[key] !== false ? color : '#e5e7eb'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Form.Check
                      type="switch"
                      id={`switch-${key}`}
                      checked={widgets[key] !== false}
                      onChange={() => handleToggle(key)}
                    />
                    <Icon size={18} color={widgets[key] !== false ? color : '#9ca3af'} />
                    <span className={widgets[key] !== false ? 'fw-medium' : 'text-muted'}>
                      {t(`dashboard.widget_${key}`, t(`dashboard.${key}`, key))}
                    </span>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default DashboardSettingsPage;
