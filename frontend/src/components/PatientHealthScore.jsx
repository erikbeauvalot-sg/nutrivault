/**
 * PatientHealthScore Component
 * Sprint 6: US-5.6.4 - Displays patient health score
 */

import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getPatientHealthScore } from '../services/analyticsService';

const getRiskColor = (riskLevel) => {
  switch (riskLevel) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    case 'critical': return 'dark';
    default: return 'secondary';
  }
};

const getScoreColor = (score) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'info';
  if (score >= 40) return 'warning';
  return 'danger';
};

function PatientHealthScore({ patientId }) {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchHealthScore();
    }
  }, [patientId]);

  const fetchHealthScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPatientHealthScore(patientId);
      setHealthData(result.data);
    } catch (err) {
      setError(err.response?.data?.error || t('healthScore.fetchError', 'Failed to load health score'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" size="sm" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-100">
        <Card.Body>
          <Alert variant="warning" className="mb-0 py-2">
            <small>{error}</small>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  const { score, riskLevel, components, details } = healthData;

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body className="py-2">
        <div className="d-flex align-items-center gap-3">
          {/* Score Circle */}
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip id="health-score-tooltip">
                <div className="text-start">
                  <strong>{t('healthScore.components', 'Components')}:</strong>
                  <br />
                  {t('healthScore.measureCompliance', 'Measure compliance')}: {components.measureCompliance}%
                  <br />
                  {t('healthScore.outOfRange', 'Out of range')}: {components.outOfRangePercent}%
                  <br />
                  {t('healthScore.visitCompliance', 'Visit compliance')}: {components.visitCompliance}%
                  <br />
                  {t('healthScore.noShowRate', 'No-show rate')}: {components.noShowRate}%
                </div>
              </Tooltip>
            }
          >
            <div
              className="d-flex flex-column align-items-center justify-content-center"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: `var(--bs-${getScoreColor(score)})`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'help'
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: '0.6rem' }}>/100</span>
            </div>
          </OverlayTrigger>

          {/* Score Details */}
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-bold">{t('healthScore.title', 'Health Score')}</span>
              <span className={`badge bg-${getRiskColor(riskLevel)}`}>
                {t(`healthScore.risk.${riskLevel}`, riskLevel)}
              </span>
            </div>
            <ProgressBar
              now={score}
              variant={getScoreColor(score)}
              style={{ height: '6px' }}
            />
            <div className="d-flex justify-content-between mt-1">
              <small className="text-muted">
                {t('healthScore.measuresSummary', '{{count}} measures', { count: details.measuresLogged })}
              </small>
              <small className="text-muted">
                {t('healthScore.visitsSummary', '{{count}} visits', { count: details.completedVisits })}
              </small>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default PatientHealthScore;
