/**
 * Dashboard Page
 */

import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import StatCard from '../components/dashboard/StatCard';
import RecentVisits from '../components/dashboard/RecentVisits';
import { getDashboardStats, getRecentVisits, getRecentInvoices, getUpcomingAppointments } from '../services/reportService';

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [_recentInvoices, setRecentInvoices] = useState([]);
  const [_upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all dashboard data in parallel
        const [statsResponse, visitsResponse, _invoicesResponse, _appointmentsResponse] = await Promise.all([
          getDashboardStats(),
          getRecentVisits(5),
          getRecentInvoices(5),
          getUpcomingAppointments(5)
        ]);

        setDashboardData(statsResponse.data);
        setRecentVisits(visitsResponse.data || []);
        setRecentInvoices(_invoicesResponse.data || []);
        setUpcomingAppointments(_appointmentsResponse.data || []);
      } catch (err) {
        console.error('[Dashboard] Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="mb-4">Dashboard</h1>
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>

      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="info-box">
            <span className="info-box-icon bg-info">
              <i className="fas fa-user" />
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Welcome back, {user?.first_name || user?.username}!</span>
              <span className="info-box-number">
                {user?.role?.name || 'User'} • System Status: Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row">
        <div className="col-lg-3 col-6">
          <StatCard
            icon={<i className="fas fa-users" />}
            label="Total Patients"
            value={Number(dashboardData?.patients?.total) || 0}
            loading={loading}
            variant="info"
          />
        </div>

        <div className="col-lg-3 col-6">
          <StatCard
            icon={<i className="fas fa-calendar-check" />}
            label="Visits This Month"
            value={Number(dashboardData?.visits?.total) || 0}
            loading={loading}
            variant="success"
          />
        </div>

        <div className="col-lg-3 col-6">
          <StatCard
            icon={<i className="fas fa-dollar-sign" />}
            label="Revenue This Month"
            value={`$${Number(dashboardData?.billing?.totalRevenue) || 0}`}
            loading={loading}
            variant="warning"
          />
        </div>

        <div className="col-lg-3 col-6">
          <StatCard
            icon={<i className="fas fa-file-invoice-dollar" />}
            label="Pending Invoices"
            value={Number(dashboardData?.billing?.outstanding?.count) || 0}
            loading={loading}
            variant="danger"
          />
        </div>
      </div>

      {/* Dashboard Widgets */}
      <div className="row mt-4">
        <div className="col-lg-6">
          <RecentVisits visits={recentVisits} loading={loading} />
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <a href="/patients/new" className="btn btn-primary btn-block mb-2">
                    <i className="fas fa-plus" /> New Patient
                  </a>
                </div>
                <div className="col-6">
                  <a href="/visits/new" className="btn btn-success btn-block mb-2">
                    <i className="fas fa-calendar-plus" /> New Visit
                  </a>
                </div>
                <div className="col-6">
                  <a href="/billing" className="btn btn-warning btn-block mb-2">
                    <i className="fas fa-file-invoice-dollar" /> View Billing
                  </a>
                </div>
                <div className="col-6">
                  <a href="/reports" className="btn btn-info btn-block mb-2">
                    <i className="fas fa-chart-bar" /> View Reports
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
