/**
 * Dashboard Page Component
 * Main landing page after login with stats and quick links
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeVisits: 0,
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

      setStats({
        totalPatients,
        activeVisits: 0, // Will be implemented in Phase 15
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
        <h1 className="mb-4">Welcome back, {user?.username}! 👋</h1>

        <Row className="g-4 mb-4">
          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">👥</div>
                <h3 className="mb-2">Patients</h3>
                <p className="text-muted mb-3">Manage patient records</p>
                <Link to="/patients" className="btn btn-primary">
                  View Patients
                </Link>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">📅</div>
                <h3 className="mb-2">Visits</h3>
                <p className="text-muted mb-3">Schedule and track visits</p>
                <button className="btn btn-secondary" disabled>
                  Coming Soon
                </button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="text-center h-100 shadow-sm">
              <Card.Body>
                <div className="display-4 mb-3">💰</div>
                <h3 className="mb-2">Billing</h3>
                <p className="text-muted mb-3">Manage invoices and payments</p>
                <button className="btn btn-secondary" disabled>
                  Coming Soon
                </button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Body>
                <h4 className="mb-3">Quick Stats</h4>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="h2 text-primary mb-1">
                      {stats.loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        stats.totalPatients
                      )}
                    </div>
                    <div className="text-muted">Total Patients</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-success mb-1">{stats.activeVisits}</div>
                    <div className="text-muted">Active Visits</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-warning mb-1">{stats.pendingInvoices}</div>
                    <div className="text-muted">Pending Invoices</div>
                  </Col>
                  <Col md={3}>
                    <div className="h2 text-info mb-1">{user?.role || 'N/A'}</div>
                    <div className="text-muted">Your Role</div>
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
