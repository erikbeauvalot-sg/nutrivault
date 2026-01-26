import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getHealthTrends, getFinancialMetrics, getCommunicationEffectiveness } from '../services/analyticsService';
import Layout from '../components/layout/Layout';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const RISK_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#dc3545'
};

function AnalyticsDashboardPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('health');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Health trends state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  // Financial metrics state
  const [financialData, setFinancialData] = useState(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState(null);

  // Communication state
  const [commData, setCommData] = useState(null);
  const [commLoading, setCommLoading] = useState(false);
  const [commError, setCommError] = useState(null);

  // Fetch health trends
  const fetchHealthTrends = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const result = await getHealthTrends(dateRange);
      setHealthData(result.data);
    } catch (err) {
      setHealthError(err.response?.data?.error || t('analytics.fetchError', 'Failed to load data'));
    } finally {
      setHealthLoading(false);
    }
  };

  // Fetch financial metrics
  const fetchFinancialMetrics = async () => {
    setFinancialLoading(true);
    setFinancialError(null);
    try {
      const result = await getFinancialMetrics(dateRange);
      setFinancialData(result.data);
    } catch (err) {
      setFinancialError(err.response?.data?.error || t('analytics.fetchError', 'Failed to load data'));
    } finally {
      setFinancialLoading(false);
    }
  };

  // Fetch communication effectiveness
  const fetchCommunication = async () => {
    setCommLoading(true);
    setCommError(null);
    try {
      const result = await getCommunicationEffectiveness(dateRange);
      setCommData(result.data);
    } catch (err) {
      setCommError(err.response?.data?.error || t('analytics.fetchError', 'Failed to load data'));
    } finally {
      setCommLoading(false);
    }
  };

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'health' && !healthData) {
      fetchHealthTrends();
    } else if (activeTab === 'financial' && !financialData) {
      fetchFinancialMetrics();
    } else if (activeTab === 'communication' && !commData) {
      fetchCommunication();
    }
  }, [activeTab]);

  // Refresh when date range changes
  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    if (activeTab === 'health') {
      fetchHealthTrends();
    } else if (activeTab === 'financial') {
      fetchFinancialMetrics();
    } else if (activeTab === 'communication') {
      fetchCommunication();
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  // Render Health Trends Tab
  const renderHealthTrends = () => {
    if (healthLoading) {
      return <div className="text-center py-5"><Spinner animation="border" /></div>;
    }
    if (healthError) {
      return <Alert variant="danger">{healthError}</Alert>;
    }
    if (!healthData) {
      return null;
    }

    const { topMeasures, measureStats, riskDistribution, monthlyTrends } = healthData;

    // Prepare risk distribution for pie chart
    const riskPieData = [
      { name: t('analytics.lowRisk', 'Low Risk'), value: riskDistribution?.low || 0 },
      { name: t('analytics.mediumRisk', 'Medium Risk'), value: riskDistribution?.medium || 0 },
      { name: t('analytics.highRisk', 'High Risk'), value: riskDistribution?.high || 0 }
    ].filter(d => d.value > 0);

    return (
      <>
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-primary">{measureStats?.totalMeasures || 0}</h2>
                <small className="text-muted">{t('analytics.totalMeasures', 'Total Measures')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-info">{measureStats?.uniquePatients || 0}</h2>
                <small className="text-muted">{t('analytics.patientsTracked', 'Patients Tracked')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-warning">{measureStats?.outOfRange || 0}</h2>
                <small className="text-muted">{t('analytics.outOfRange', 'Out of Range')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-success">
                  {measureStats?.complianceRate ? `${measureStats.complianceRate.toFixed(1)}%` : 'N/A'}
                </h2>
                <small className="text-muted">{t('analytics.complianceRate', 'Compliance Rate')}</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          {/* Top Tracked Measures */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.topMeasures', 'Top Tracked Measures')}</Card.Header>
              <Card.Body>
                {topMeasures && topMeasures.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMeasures} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0088FE" name={t('analytics.recordings', 'Recordings')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Risk Distribution */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.riskDistribution', 'Patient Risk Distribution')}</Card.Header>
              <Card.Body>
                {riskPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={RISK_COLORS.low} />
                        <Cell fill={RISK_COLORS.medium} />
                        <Cell fill={RISK_COLORS.high} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Monthly Trends */}
        <Row>
          <Col>
            <Card>
              <Card.Header>{t('analytics.monthlyTrends', 'Monthly Measure Trends')}</Card.Header>
              <Card.Body>
                {monthlyTrends && monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#0088FE"
                        name={t('analytics.measureCount', 'Measure Count')}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="uniquePatients"
                        stroke="#00C49F"
                        name={t('analytics.uniquePatients', 'Unique Patients')}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  // Render Financial Metrics Tab
  const renderFinancialMetrics = () => {
    if (financialLoading) {
      return <div className="text-center py-5"><Spinner animation="border" /></div>;
    }
    if (financialError) {
      return <Alert variant="danger">{financialError}</Alert>;
    }
    if (!financialData) {
      return null;
    }

    const { revenueByStatus, monthlyRevenue, paymentMethods, summary } = financialData;

    // Prepare revenue by status for pie chart
    const statusPieData = revenueByStatus?.map(item => ({
      name: t(`invoiceStatus.${item.status}`, item.status),
      value: parseFloat(item.totalAmount) || 0
    })).filter(d => d.value > 0) || [];

    // Prepare payment methods for pie chart
    const paymentPieData = paymentMethods?.map(item => ({
      name: t(`paymentMethod.${item.method}`, item.method),
      value: parseFloat(item.totalAmount) || 0
    })).filter(d => d.value > 0) || [];

    return (
      <>
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-success">{formatCurrency(summary?.totalRevenue)}</h2>
                <small className="text-muted">{t('analytics.totalRevenue', 'Total Revenue')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-primary">{formatCurrency(summary?.paidAmount)}</h2>
                <small className="text-muted">{t('analytics.paidAmount', 'Paid Amount')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-warning">{formatCurrency(summary?.pendingAmount)}</h2>
                <small className="text-muted">{t('analytics.pendingAmount', 'Pending Amount')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-info">{summary?.totalInvoices || 0}</h2>
                <small className="text-muted">{t('analytics.totalInvoices', 'Total Invoices')}</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          {/* Revenue by Status */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.revenueByStatus', 'Revenue by Status')}</Card.Header>
              <Card.Body>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Payment Methods */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.paymentMethods', 'Payment Methods')}</Card.Header>
              <Card.Body>
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Monthly Revenue Trend */}
        <Row>
          <Col>
            <Card>
              <Card.Header>{t('analytics.monthlyRevenue', 'Monthly Revenue Trend')}</Card.Header>
              <Card.Body>
                {monthlyRevenue && monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${value}€`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        fill="#0088FE"
                        name={t('analytics.revenue', 'Revenue')}
                      />
                      <Bar
                        dataKey="invoiceCount"
                        fill="#00C49F"
                        name={t('analytics.invoices', 'Invoices')}
                        yAxisId="right"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  // Render Communication Tab
  const renderCommunication = () => {
    if (commLoading) {
      return <div className="text-center py-5"><Spinner animation="border" /></div>;
    }
    if (commError) {
      return <Alert variant="danger">{commError}</Alert>;
    }
    if (!commData) {
      return null;
    }

    const { emailsByType, monthlyVolume, noShowRates, reminderEffectiveness, summary } = commData;

    // Prepare emails by type for bar chart
    const emailTypeData = emailsByType?.map(item => ({
      type: t(`emailType.${item.type}`, item.type),
      sent: parseInt(item.sent) || 0,
      delivered: parseInt(item.delivered) || 0,
      opened: parseInt(item.opened) || 0
    })) || [];

    return (
      <>
        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-primary">{summary?.totalEmailsSent || 0}</h2>
                <small className="text-muted">{t('analytics.emailsSent', 'Emails Sent')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-success">
                  {summary?.deliveryRate ? `${summary.deliveryRate.toFixed(1)}%` : 'N/A'}
                </h2>
                <small className="text-muted">{t('analytics.deliveryRate', 'Delivery Rate')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className="text-info">
                  {summary?.openRate ? `${summary.openRate.toFixed(1)}%` : 'N/A'}
                </h2>
                <small className="text-muted">{t('analytics.openRate', 'Open Rate')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h2 className={noShowRates?.overall > 10 ? 'text-danger' : 'text-success'}>
                  {noShowRates?.overall ? `${noShowRates.overall.toFixed(1)}%` : 'N/A'}
                </h2>
                <small className="text-muted">{t('analytics.noShowRate', 'No-Show Rate')}</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          {/* Emails by Type */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.emailsByType', 'Emails by Type')}</Card.Header>
              <Card.Body>
                {emailTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={emailTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sent" fill="#0088FE" name={t('analytics.sent', 'Sent')} />
                      <Bar dataKey="delivered" fill="#00C49F" name={t('analytics.delivered', 'Delivered')} />
                      <Bar dataKey="opened" fill="#FFBB28" name={t('analytics.opened', 'Opened')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Reminder Effectiveness */}
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>{t('analytics.reminderEffectiveness', 'Reminder Effectiveness')}</Card.Header>
              <Card.Body>
                {reminderEffectiveness ? (
                  <div className="py-4">
                    <Row className="mb-3">
                      <Col xs={6}>
                        <div className="text-center">
                          <h4 className="text-success">{reminderEffectiveness.withReminder?.attended || 0}</h4>
                          <small>{t('analytics.attendedWithReminder', 'Attended (with reminder)')}</small>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="text-center">
                          <h4 className="text-warning">{reminderEffectiveness.withReminder?.noShow || 0}</h4>
                          <small>{t('analytics.noShowWithReminder', 'No-show (with reminder)')}</small>
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs={6}>
                        <div className="text-center">
                          <h4 className="text-info">{reminderEffectiveness.withoutReminder?.attended || 0}</h4>
                          <small>{t('analytics.attendedNoReminder', 'Attended (no reminder)')}</small>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="text-center">
                          <h4 className="text-danger">{reminderEffectiveness.withoutReminder?.noShow || 0}</h4>
                          <small>{t('analytics.noShowNoReminder', 'No-show (no reminder)')}</small>
                        </div>
                      </Col>
                    </Row>
                    <hr />
                    <div className="text-center">
                      <Badge bg={reminderEffectiveness.reductionRate > 0 ? 'success' : 'secondary'} className="fs-6">
                        {reminderEffectiveness.reductionRate > 0
                          ? t('analytics.noShowReduction', 'No-show reduction: {{rate}}%', { rate: reminderEffectiveness.reductionRate.toFixed(1) })
                          : t('analytics.noReductionData', 'Not enough data')}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Monthly Email Volume */}
        <Row>
          <Col>
            <Card>
              <Card.Header>{t('analytics.monthlyEmailVolume', 'Monthly Email Volume')}</Card.Header>
              <Card.Body>
                {monthlyVolume && monthlyVolume.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyVolume}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sent"
                        stroke="#0088FE"
                        name={t('analytics.sent', 'Sent')}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="delivered"
                        stroke="#00C49F"
                        name={t('analytics.delivered', 'Delivered')}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-5">{t('analytics.noData', 'No data available')}</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h1>{t('analytics.title', 'Analytics Dashboard')}</h1>
          </Col>
        </Row>

      {/* Date Range Filter */}
      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t('analytics.startDate', 'Start Date')}</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t('analytics.endDate', 'End Date')}</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <button className="btn btn-primary" onClick={handleRefresh}>
            {t('analytics.refresh', 'Refresh')}
          </button>
        </Col>
      </Row>

      {/* Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="health">
              {t('analytics.healthTrends', 'Health Trends')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="financial">
              {t('analytics.financialMetrics', 'Financial Metrics')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="communication">
              {t('analytics.communicationTab', 'Communication')}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="health">
            {activeTab === 'health' && renderHealthTrends()}
          </Tab.Pane>
          <Tab.Pane eventKey="financial">
            {activeTab === 'financial' && renderFinancialMetrics()}
          </Tab.Pane>
          <Tab.Pane eventKey="communication">
            {activeTab === 'communication' && renderCommunication()}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
      </Container>
    </Layout>
  );
}

export default AnalyticsDashboardPage;
