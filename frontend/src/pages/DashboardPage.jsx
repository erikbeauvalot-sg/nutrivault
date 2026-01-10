/**
 * Dashboard Page Component
 * Main landing page after login with stats and quick links
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import visitService from '../services/visitService';
import userService from '../services/userService';

const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalVisits: 0,
    scheduledVisits: 0,
    totalUsers: 0,
    pendingInvoices: 0,
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch patients count
      const patientsResponse = await api.get('/api/patients');
      const patientsData = patientsResponse.data.data || patientsResponse.data;
      const totalPatients = Array.isArray(patientsData) ? patientsData.length : 0;

      // Fetch visits count
      let totalVisits = 0;
      let scheduledVisits = 0;
      try {
        const visitsResponse = await visitService.getVisits({ limit: 1000 });
        const visitsData = visitsResponse.data.data || visitsResponse.data;
        totalVisits = Array.isArray(visitsData) ? visitsData.length : 0;
        scheduledVisits = Array.isArray(visitsData) 
          ? visitsData.filter(v => v.status === 'SCHEDULED').length 
          : 0;
      } catch (err) {
        console.warn('Error fetching visits:', err);
      }

      // Fetch users count (Admin only)
      let totalUsers = 0;
      if (user?.role === 'ADMIN') {
        try {
          const usersResponse = await userService.getUsers({ limit: 1000 });
          const usersData = usersResponse.data.data || usersResponse.data;
          totalUsers = Array.isArray(usersData) ? usersData.length : 0;
        } catch (err) {
          console.warn('Error fetching users:', err);
        }
      }

      setStats({
        totalPatients,
        totalVisits,
        scheduledVisits,
        totalUsers,
        pendingInvoices: 0, // Will be implemented in Phase 16
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <Layout>
      <Container fluid>
        <h1 className="mb-4">{t('dashboard.welcomeBack', { username: user?.username })} 👋</h1>

        <Row className="g-4 mb-4">
          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">👥</div>
                <h3 className="mb-2">{t('navigation.patients')}</h3>
                <p className="text-muted mb-3">{t('dashboard.managePatientRecords')}</p>
                <Link to="/patients" className="btn btn-primary">
                  {t('dashboard.viewPatients')}
                </Link>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">📅</div>
                <h3 className="mb-2">{t('navigation.visits')}</h3>
                <p className="text-muted mb-3">{t('dashboard.scheduleAndTrackVisits')}</p>
                <Link to="/visits" className="btn btn-primary">
                  {t('dashboard.viewVisits')}
                </Link>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">💰</div>
                <h3 className="mb-2">{t('navigation.billing')}</h3>
                <p className="text-muted mb-3">{t('dashboard.manageInvoicesAndPayments')}</p>
                <button className="btn btn-secondary" disabled>
                  {t('dashboard.comingSoon')}
                </button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Body>
                <h4 className="mb-3">{t('dashboard.quickStats')}</h4>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="h2 text-primary mb-1">
                      {stats.loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        stats.totalPatients
                      )}
                    </div>
                    <div className="text-muted">{t('dashboard.totalPatients')}</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-success mb-1">
                      {stats.loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        stats.scheduledVisits
                      )}
                    </div>
                    <div className="text-muted">{t('dashboard.scheduledVisits')}</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-info mb-1">
                      {stats.loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        stats.totalVisits
                      )}
                    </div>
                    <div className="text-muted">{t('dashboard.totalVisits')}</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-warning mb-1">
                      {stats.loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        user?.role === 'ADMIN' ? stats.totalUsers : user?.role || 'N/A'
                      )}
                    </div>
                    <div className="text-muted">{user?.role === 'ADMIN' ? t('dashboard.totalUsers') : t('dashboard.yourRole')}</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default DashboardPage;
