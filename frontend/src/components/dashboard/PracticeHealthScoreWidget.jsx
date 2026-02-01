/**
 * Practice Health Score Widget
 * Displays an overall health indicator for the practice
 */

import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getHealthScore } from '../../services/dashboardService';

const PracticeHealthScoreWidget = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      setLoading(true);
      const response = await getHealthScore();
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching health score:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const getLevelLabel = (level) => {
    const labels = {
      excellent: t('dashboard.healthLevel.excellent', 'Excellent'),
      good: t('dashboard.healthLevel.good', 'Bon'),
      average: t('dashboard.healthLevel.average', 'Moyen'),
      needs_improvement: t('dashboard.healthLevel.needsImprovement', 'À améliorer')
    };
    return labels[level] || level;
  };

  const getComponentLabel = (key) => {
    const labels = {
      patientGrowth: t('dashboard.healthComponent.patientGrowth', 'Croissance patients'),
      revenue: t('dashboard.healthComponent.revenue', 'Tendance CA'),
      retention: t('dashboard.healthComponent.retention', 'Rétention'),
      activity: t('dashboard.healthComponent.activity', 'Activité'),
      payments: t('dashboard.healthComponent.payments', 'Paiements')
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <Card className="h-100 border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <h6 className="mb-0">{t('dashboard.practiceHealthScore', 'Santé du cabinet')}</h6>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" variant="primary" />
        </Card.Body>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const scoreColor = getScoreColor(data.totalScore);

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Header className="bg-white border-0">
        <h6 className="mb-0">{t('dashboard.practiceHealthScore', 'Santé du cabinet')}</h6>
      </Card.Header>
      <Card.Body>
        {/* Main Score Circle */}
        <div className="text-center mb-4">
          <div
            className={`d-inline-flex align-items-center justify-content-center rounded-circle border border-3 border-${scoreColor}`}
            style={{ width: 100, height: 100 }}
          >
            <div>
              <h2 className={`mb-0 text-${scoreColor}`}>{data.totalScore}</h2>
              <small className="text-muted">/ {data.maxScore}</small>
            </div>
          </div>
          <p className={`mt-2 mb-0 fw-medium text-${scoreColor}`}>
            {getLevelLabel(data.level)}
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="small">
          {Object.entries(data.components).map(([key, component]) => (
            <div key={key} className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span>{getComponentLabel(key)}</span>
                <span className="text-muted">{component.score}/{component.max}</span>
              </div>
              <ProgressBar
                now={(component.score / component.max) * 100}
                variant={getScoreColor((component.score / component.max) * 100)}
                style={{ height: 6 }}
              />
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default PracticeHealthScoreWidget;
