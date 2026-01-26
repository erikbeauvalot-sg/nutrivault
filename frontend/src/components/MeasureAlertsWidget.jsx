/**
 * MeasureAlertsWidget Component
 * Displays measure alerts for out-of-range health values
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

import { useState, useEffect } from 'react';
import { Card, Badge, ListGroup, Spinner, Alert, Button, Collapse } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import measureAlertsService from '../services/measureAlertsService';
import ActionButton from './ActionButton';

const MeasureAlertsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    critical: true,
    warning: false
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);

  useEffect(() => {
    fetchAlerts();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    setAutoRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(prevLoading => {
        // Only show spinner on initial load
        if (alerts === null) return true;
        return prevLoading;
      });

      const response = await measureAlertsService.getAllMeasureAlerts({
        limit: 100
      });

      setAlerts(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error fetching measure alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await measureAlertsService.acknowledgeMeasureAlert(alertId);
      // Refresh alerts after acknowledging
      await fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(t('measureAlerts.acknowledgeError', 'Failed to acknowledge alert'));
    }
  };

  const handleViewPatient = (patientId) => {
    navigate(`/patients/${patientId}`);
  };

  const getSeverityVariant = (severity) => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  };

  const getAlertTypeLabel = (alertType) => {
    switch (alertType) {
      case 'below_critical': return t('measureAlerts.belowCritical', 'Critically Low');
      case 'above_critical': return t('measureAlerts.aboveCritical', 'Critically High');
      case 'below_normal': return t('measureAlerts.belowNormal', 'Below Normal');
      case 'above_normal': return t('measureAlerts.aboveNormal', 'Above Normal');
      default: return alertType;
    }
  };

  if (loading && alerts === null) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">{t('measureAlerts.loading', 'Loading measure alerts...')}</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">📊 {t('measureAlerts.title', 'Measure Alerts')}</h5>
            <Button variant="outline-dark" size="sm" onClick={fetchAlerts}>
              🔄
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            {t('measureAlerts.loadError', 'Failed to load measure alerts')}: {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!alerts || !alerts.data || alerts.data.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">✅ {t('measureAlerts.title', 'Measure Alerts')}</h5>
            <Button variant="outline-light" size="sm" onClick={fetchAlerts}>
              🔄
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <div className="h1 mb-2">🎉</div>
          <p className="text-muted mb-0">
            {t('measureAlerts.noAlerts', 'No active measure alerts! All patient values are within normal ranges.')}
          </p>
        </Card.Body>
      </Card>
    );
  }

  const criticalAlerts = alerts.grouped?.critical || [];
  const warningAlerts = alerts.grouped?.warning || [];
  const totalCount = criticalAlerts.length + warningAlerts.length;

  return (
    <Card className="shadow-sm">
      <Card.Header className={criticalAlerts.length > 0 ? 'bg-danger text-white' : 'bg-warning'}>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {criticalAlerts.length > 0 ? '🚨' : '⚠️'} {t('measureAlerts.title', 'Measure Alerts')}
          </h5>
          <div className="d-flex gap-2 align-items-center">
            {criticalAlerts.length > 0 && (
              <Badge bg="light" text="dark">
                {criticalAlerts.length} {t('measureAlerts.critical', 'critical')}
              </Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge bg="light" text="dark">
                {warningAlerts.length} {t('measureAlerts.warning', 'warning')}
              </Badge>
            )}
            <Button
              variant={criticalAlerts.length > 0 ? 'outline-light' : 'outline-dark'}
              size="sm"
              onClick={fetchAlerts}
              title={t('common.refresh', 'Refresh')}
            >
              🔄
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Critical Alerts Section */}
        {criticalAlerts.length > 0 && (
          <div className="border-bottom">
            <div
              className="p-3 bg-danger bg-opacity-10 d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('critical')}
            >
              <div>
                <strong>🚨 {t('measureAlerts.criticalAlertsSection', 'Critical Alerts')}</strong>
                <Badge bg="danger" className="ms-2">{criticalAlerts.length}</Badge>
              </div>
              <span>{expandedSections.critical ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.critical}>
              <div>
                <ListGroup variant="flush">
                  {criticalAlerts.slice(0, 10).map((alert) => (
                    <ListGroup.Item
                      key={alert.id}
                      action
                      onClick={() => handleViewPatient(alert.patient_id)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ borderLeft: '4px solid #dc3545', cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.patient?.first_name} {alert.patient?.last_name}</strong>
                          <Badge bg="secondary" style={{ fontSize: '0.7em' }}>
                            {alert.patient?.medical_record_number}
                          </Badge>
                          {alert.email_sent && (
                            <Badge bg="info" style={{ fontSize: '0.7em' }}>
                              📧 Email Sent
                            </Badge>
                          )}
                        </div>
                        <div className="mb-1">
                          <Badge bg="danger" className="me-2">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                          <strong>{alert.measureDefinition?.display_name}</strong>: {parseFloat(alert.value).toFixed(2)} {alert.measureDefinition?.unit}
                        </div>
                        <div className="text-muted small">
                          {alert.message}
                        </div>
                        <div className="text-muted small mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        <ActionButton
                          action="acknowledge"
                          onClick={() => handleAcknowledge(alert.id)}
                          title={t('measureAlerts.acknowledge', 'Acknowledge')}
                        />
                      </div>
                    </ListGroup.Item>
                  ))}
                  {criticalAlerts.length > 10 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{criticalAlerts.length - 10} {t('measureAlerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}

        {/* Warning Alerts Section */}
        {warningAlerts.length > 0 && (
          <div className="border-bottom">
            <div
              className="p-3 bg-warning bg-opacity-10 d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('warning')}
            >
              <div>
                <strong>⚠️ {t('measureAlerts.warningAlertsSection', 'Warning Alerts')}</strong>
                <Badge bg="warning" text="dark" className="ms-2">{warningAlerts.length}</Badge>
              </div>
              <span>{expandedSections.warning ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.warning}>
              <div>
                <ListGroup variant="flush">
                  {warningAlerts.slice(0, 10).map((alert) => (
                    <ListGroup.Item
                      key={alert.id}
                      action
                      onClick={() => handleViewPatient(alert.patient_id)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ borderLeft: '4px solid #ffc107', cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.patient?.first_name} {alert.patient?.last_name}</strong>
                          <Badge bg="secondary" style={{ fontSize: '0.7em' }}>
                            {alert.patient?.medical_record_number}
                          </Badge>
                        </div>
                        <div className="mb-1">
                          <Badge bg="warning" text="dark" className="me-2">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                          <strong>{alert.measureDefinition?.display_name}</strong>: {parseFloat(alert.value).toFixed(2)} {alert.measureDefinition?.unit}
                        </div>
                        <div className="text-muted small">
                          {alert.message}
                        </div>
                        <div className="text-muted small mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        <ActionButton
                          action="acknowledge"
                          onClick={() => handleAcknowledge(alert.id)}
                          title={t('measureAlerts.acknowledge', 'Acknowledge')}
                        />
                      </div>
                    </ListGroup.Item>
                  ))}
                  {warningAlerts.length > 10 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{warningAlerts.length - 10} {t('measureAlerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}
      </Card.Body>
      <Card.Footer className="text-muted small text-center">
        {t('measureAlerts.autoRefresh', 'Auto-refreshes every 5 minutes')}
      </Card.Footer>
    </Card>
  );
};

export default MeasureAlertsWidget;
