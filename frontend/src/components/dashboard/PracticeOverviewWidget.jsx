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
  FaArrowDown,
  FaFileInvoice,
  FaCheckCircle,
  FaReceipt,
  FaBalanceScale
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

  const quoteKpis = (data.pendingQuotesCount > 0 || data.acceptedQuotesThisMonth > 0) ? [
    {
      icon: <FaFileInvoice size={24} />,
      color: 'info',
      title: t('dashboard.pendingQuotes', 'Devis en attente'),
      value: data.pendingQuotesCount || 0,
      subtitle: data.pendingQuotesAmount > 0
        ? formatCurrency(data.pendingQuotesAmount)
        : t('dashboard.noPendingQuotes', 'Aucun devis en attente'),
      noChange: true
    },
    {
      icon: <FaCheckCircle size={24} />,
      color: 'success',
      title: t('dashboard.acceptedQuotesMonth', 'Devis acceptés ce mois'),
      value: data.acceptedQuotesThisMonth || 0,
      subtitle: data.acceptedQuotesAmount > 0
        ? formatCurrency(data.acceptedQuotesAmount)
        : '-',
      noChange: true
    }
  ] : [];

  const financeKpis = (data.expensesThisMonth > 0 || data.netProfitThisMonth !== undefined) ? [
    {
      icon: <FaReceipt size={24} />,
      color: 'danger',
      title: t('dashboard.expensesThisMonth', 'Dépenses ce mois'),
      value: formatCurrency(data.expensesThisMonth || 0),
      subtitle: t('dashboard.vsLastMonth', 'vs mois dernier'),
      change: data.expensesChange || 0,
      isCurrency: true,
      isPositiveGood: false
    },
    {
      icon: <FaBalanceScale size={24} />,
      color: data.netProfitThisMonth >= 0 ? 'success' : 'danger',
      title: t('dashboard.netProfitMonth', 'Profit net ce mois'),
      value: formatCurrency(data.netProfitThisMonth || 0),
      subtitle: data.adjustmentsThisMonth
        ? `${formatCurrency(data.adjustmentsThisMonth)} ${t('dashboard.inAdjustments', 'ajustements')}`
        : t('dashboard.noAdjustments', 'Aucun ajustement'),
      noChange: true
    }
  ] : [];

  const renderKpiCard = (kpi, index) => (
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
            {!kpi.noChange && !kpi.isCurrency && renderChange(kpi.change, kpi.isPositiveGood !== false)}
            {!kpi.noChange && kpi.isCurrency && renderCurrencyChange(kpi.change, kpi.isPositiveGood !== false)}
          </h3>
          <small className="text-muted">{kpi.subtitle}</small>
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <>
      <Row className="mb-4">
        {kpis.map(renderKpiCard)}
      </Row>
      {quoteKpis.length > 0 && (
        <Row className="mb-4">
          {quoteKpis.map((kpi, i) => renderKpiCard(kpi, i + kpis.length))}
        </Row>
      )}
      {financeKpis.length > 0 && (
        <Row className="mb-4">
          {financeKpis.map((kpi, i) => renderKpiCard(kpi, i + kpis.length + quoteKpis.length))}
        </Row>
      )}
    </>
  );
};

export default PracticeOverviewWidget;
