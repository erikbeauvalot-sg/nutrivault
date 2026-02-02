import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Spinner, Alert, Form, Badge } from 'react-bootstrap';
import { getPageViewStats, getRecentPageViews } from '../services/analyticsService';

/**
 * PageViewsAnalytics Component
 * Displays analytics for public landing pages like /mariondiet
 */
const PageViewsAnalytics = ({ pagePath = '/mariondiet' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentViews, setRecentViews] = useState([]);
  const [period, setPeriod] = useState('day');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAnalytics();
  }, [pagePath, period, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        getPageViewStats({
          page_path: pagePath,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
          period
        }),
        getRecentPageViews({
          page_path: pagePath,
          limit: 20
        })
      ]);

      setStats(statsResponse.data);
      setRecentViews(recentResponse.data || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(t('analytics.loadError', 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
        <p className="mt-2">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  return (
    <div className="page-views-analytics">
      <h4 className="mb-3">
        {t('analytics.pageViews.title', 'Page Analytics')}
      </h4>
      <p className="text-muted mb-4">
        {t('analytics.pageViews.description', 'Track visits to your public landing page')}
      </p>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t('analytics.startDate', 'Start Date')}</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t('analytics.endDate', 'End Date')}</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t('analytics.period', 'Group by')}</Form.Label>
            <Form.Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="hour">{t('analytics.hourly', 'Hourly')}</option>
              <option value="day">{t('analytics.daily', 'Daily')}</option>
              <option value="week">{t('analytics.weekly', 'Weekly')}</option>
              <option value="month">{t('analytics.monthly', 'Monthly')}</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="mb-0">{stats?.totalViews || 0}</h2>
              <p className="text-muted mb-0">
                {t('analytics.totalViews', 'Total Views')}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="mb-0">{stats?.uniqueVisitors || 0}</h2>
              <p className="text-muted mb-0">
                {t('analytics.uniqueVisitors', 'Unique Visitors')}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h2 className="mb-0">
                {stats?.totalViews && stats?.uniqueVisitors
                  ? (stats.totalViews / stats.uniqueVisitors).toFixed(1)
                  : '0'}
              </h2>
              <p className="text-muted mb-0">
                {t('analytics.avgViewsPerVisitor', 'Views/Visitor')}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Device Distribution */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">{t('analytics.deviceTypes', 'Devices')}</h5>
            </Card.Header>
            <Card.Body>
              {stats?.viewsByDevice?.length > 0 ? (
                <div>
                  {stats.viewsByDevice.map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                      <span>
                        {getDeviceIcon(item.device_type)} {item.device_type || 'Unknown'}
                      </span>
                      <Badge bg="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">{t('analytics.noData', 'No data available')}</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">{t('analytics.browsers', 'Browsers')}</h5>
            </Card.Header>
            <Card.Body>
              {stats?.viewsByBrowser?.length > 0 ? (
                <div>
                  {stats.viewsByBrowser.slice(0, 5).map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                      <span>{item.browser || 'Unknown'}</span>
                      <Badge bg="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">{t('analytics.noData', 'No data available')}</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Referrers & Top IPs */}
      <Row className="mb-4">
        {stats?.topReferrers?.length > 0 && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0">{t('analytics.topReferrers', 'Top Referrers')}</h5>
              </Card.Header>
              <Card.Body>
                {stats.topReferrers.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-truncate" style={{ maxWidth: '70%' }}>
                      {item.referrer || 'Direct'}
                    </span>
                    <Badge bg="primary">{item.count}</Badge>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        )}
        {stats?.topIPs?.length > 0 && (
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0">{t('analytics.topIPs', 'Top IPs')}</h5>
              </Card.Header>
              <Card.Body>
                {stats.topIPs.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="font-monospace">
                      {item.ip_address}
                    </span>
                    <div>
                      <Badge bg="secondary" className="me-1" title="Hits">
                        {item.count} hits
                      </Badge>
                      <Badge bg="info" title="Unique visitors">
                        {item.unique_visitors} vis.
                      </Badge>
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Recent Views */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">{t('analytics.recentViews', 'Recent Views')}</h5>
        </Card.Header>
        <Card.Body>
          {recentViews.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('analytics.date', 'Date')}</th>
                    <th>{t('analytics.device', 'Device')}</th>
                    <th>{t('analytics.browser', 'Browser')}</th>
                    <th>{t('analytics.referrer', 'Referrer')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentViews.map((view, index) => (
                    <tr key={index}>
                      <td>{formatDate(view.created_at)}</td>
                      <td>{getDeviceIcon(view.device_type)}</td>
                      <td>{view.browser || '-'}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>
                        {view.referrer || t('analytics.direct', 'Direct')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted mb-0">{t('analytics.noRecentViews', 'No recent views')}</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PageViewsAnalytics;
