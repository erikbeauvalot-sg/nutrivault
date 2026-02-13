/**
 * Revenue Chart Widget
 * Displays revenue trends over time
 */

import React, { useState, useEffect } from 'react';
import { Card, Spinner, ButtonGroup, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { getRevenueChart } from '../../services/dashboardService';

const RevenueChartWidget = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getRevenueChart(period);
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching revenue chart:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const entry = payload[0]?.payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="mb-1 fw-bold">{label}</p>
          <p className="mb-0 text-primary">
            {formatCurrency(payload[0].value)}
          </p>
          <small className="text-muted">
            {entry?.invoices} {t('dashboard.invoices', 'factures')}
          </small>
          {entry?.quoteValue > 0 && (
            <>
              <hr className="my-1" />
              <p className="mb-0 small" style={{ color: '#198754' }}>
                {t('dashboard.quoteValue', 'Devis')}: {formatCurrency(entry.quoteValue)}
              </p>
              <small className="text-muted">
                {entry.quotesCount} {t('dashboard.quotesLabel', 'devis')}
              </small>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">{t('dashboard.revenueChart', 'Évolution du CA')}</h6>
        <ButtonGroup size="sm">
          <Button
            variant={period === 'monthly' ? 'primary' : 'outline-primary'}
            onClick={() => setPeriod('monthly')}
          >
            {t('dashboard.monthly', 'Mensuel')}
          </Button>
          <Button
            variant={period === 'quarterly' ? 'primary' : 'outline-primary'}
            onClick={() => setPeriod('quarterly')}
          >
            {t('dashboard.quarterly', 'Trimestriel')}
          </Button>
        </ButtonGroup>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: 250 }}>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 250 }}>
            {t('dashboard.noData', 'Aucune donnée disponible')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d6efd" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorQuotes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#198754" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#198754" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={period === 'monthly' ? 'month' : 'period'}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {data.some(d => d.quoteValue > 0) && <Legend />}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0d6efd"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name={t('dashboard.revenue', 'CA')}
              />
              {data.some(d => d.quoteValue > 0) && (
                <Area
                  type="monotone"
                  dataKey="quoteValue"
                  stroke="#198754"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorQuotes)"
                  name={t('dashboard.quoteValue', 'Devis')}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
};

export default RevenueChartWidget;
