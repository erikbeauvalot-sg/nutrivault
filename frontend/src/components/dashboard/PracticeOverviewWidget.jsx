/**
 * Practice Overview Widget
 * Displays key performance indicators for the practice
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaUsers,
  FaCalendarCheck,
  FaEuroSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { getOverview } from '../../services/dashboardService';

const PracticeOverviewWidget = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await getOverview();
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderChange = (change, isPositiveGood = true) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    const isGood = isPositiveGood ? isPositive : !isPositive;

    return (
      <small className={`ms-2 ${isGood ? 'text-success' : 'text-danger'}`}>
        {isPositive ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
        {' '}{Math.abs(change)}
      </small>
    );
  };

  const renderCurrencyChange = (change, isPositiveGood = true) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    const isGood = isPositiveGood ? isPositive : !isPositive;

    return (
      <small className={`ms-2 ${isGood ? 'text-success' : 'text-danger'}`}>
        {isPositive ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
        {' '}{formatCurrency(Math.abs(change))}
      </small>
    );
  };

  if (loading) {
    return (
      <Row className="mb-4">
        {[1, 2, 3, 4].map(i => (
          <Col key={i} md={6} lg={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center py-4">
                <Spinner animation="border" size="sm" variant="primary" />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (error || !data) {
    return null;
  }

  const kpis = [
    {
      icon: <FaUsers size={24} />,
      color: 'primary',
      title: t('dashboard.totalPatients', 'Patients actifs'),
      value: data.totalPatients,
      subtitle: `+${data.newPatientsThisMonth} ${t('dashboard.thisMonth', 'ce mois')}`,
      change: data.patientsChange
    },
    {
      icon: <FaCalendarCheck size={24} />,
      color: 'success',
      title: t('dashboard.visitsThisMonth', 'Visites ce mois'),
      value: data.visitsThisMonth,
      subtitle: t('dashboard.vsLastMonth', 'vs mois dernier'),
      change: data.visitsChange
    },
    {
      icon: <FaEuroSign size={24} />,
      color: 'info',
      title: t('dashboard.revenueThisMonth', 'CA ce mois'),
      value: formatCurrency(data.revenueThisMonth),
      subtitle: t('dashboard.vsLastMonth', 'vs mois dernier'),
      change: data.revenueChange,
      isCurrency: true
    },
    {
      icon: <FaChartLine size={24} />,
      color: 'warning',
      title: t('dashboard.retentionRate', 'Taux de rétention'),
      value: `${data.retentionRate}%`,
      subtitle: data.outstandingAmount > 0
        ? `${formatCurrency(data.outstandingAmount)} ${t('dashboard.outstanding', 'impayés')}`
        : t('dashboard.noOutstanding', 'Aucun impayé'),
      noChange: true
    }
  ];

  return (
    <Row className="mb-4">
      {kpis.map((kpi, index) => (
        <Col key={index} md={6} lg={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className={`rounded-circle p-2 bg-${kpi.color} bg-opacity-10 text-${kpi.color}`}>
                  {kpi.icon}
                </div>
                <span className="ms-auto text-muted small">{kpi.title}</span>
              </div>
              <h3 className="mb-1">
                {kpi.value}
                {!kpi.noChange && !kpi.isCurrency && renderChange(kpi.change)}
                {!kpi.noChange && kpi.isCurrency && renderCurrencyChange(kpi.change)}
              </h3>
              <small className="text-muted">{kpi.subtitle}</small>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default PracticeOverviewWidget;
