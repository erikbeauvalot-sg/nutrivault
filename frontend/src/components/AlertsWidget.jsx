/**
 * AlertsWidget Component
 * Displays actionable alerts for urgent tasks
 */

import { useState, useEffect } from 'react';
import { Card, Badge, ListGroup, Spinner, Alert, Button, Collapse } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import alertsService from '../services/alertsService';

const AlertsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    overdue_invoices: true,
    overdue_visits: true,
    visits_without_notes: false,
    patients_followup: false
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertsService.getAlerts();
      setAlerts(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error fetching alerts:', err);
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

  const handleAlertAction = (alert) => {
    switch (alert.action) {
      case 'send_reminder':
        navigate(`/billing/${alert.invoice_id}`);
        break;
      case 'edit_visit':
        navigate(`/visits/${alert.visit_id}/edit`);
        break;
      case 'schedule_visit':
        navigate(`/visits/create?patient_id=${alert.patient_id}`);
        break;
      default:
        break;
    }
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
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📌';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2">{t('alerts.loading', 'Loading alerts...')}</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            {t('alerts.loadError', 'Failed to load alerts')}: {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!alerts || alerts.summary.total_count === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">✅ {t('alerts.title', 'Alerts & Actions')}</h5>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <div className="h1 mb-2">🎉</div>
          <p className="text-muted mb-0">{t('alerts.noAlerts', 'All caught up! No urgent actions required.')}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-warning">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">⚠️ {t('alerts.title', 'Alerts & Actions')}</h5>
          <div>
            {alerts.summary.critical_count > 0 && (
              <Badge bg="danger" className="me-2">
                {alerts.summary.critical_count} {t('alerts.critical', 'critical')}
              </Badge>
            )}
            {alerts.summary.warning_count > 0 && (
              <Badge bg="warning" text="dark" className="me-2">
                {alerts.summary.warning_count} {t('alerts.warning', 'warning')}
              </Badge>
            )}
            <Badge bg="secondary">
              {alerts.summary.total_count} {t('alerts.total', 'total')}
            </Badge>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Overdue Invoices Section */}
        {alerts.overdue_invoices.length > 0 && (
          <div className="border-bottom">
            <div
              className="p-3 bg-light d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('overdue_invoices')}
            >
              <div>
                <strong>💰 {t('alerts.overdueInvoices', 'Overdue Invoices')}</strong>
                <Badge bg="danger" className="ms-2">{alerts.overdue_invoices.length}</Badge>
              </div>
              <span>{expandedSections.overdue_invoices ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.overdue_invoices}>
              <div>
                <ListGroup variant="flush">
                  {alerts.overdue_invoices.slice(0, 5).map((alert, index) => (
                    <ListGroup.Item
                      key={index}
                      action
                      onClick={() => handleAlertAction(alert)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.invoice_number}</strong>
                          <Badge bg="secondary">{alert.patient_name}</Badge>
                        </div>
                        <div className="text-muted small">
                          {alert.message} • {alert.amount_due.toFixed(2)} €
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {alerts.overdue_invoices.length > 5 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{alerts.overdue_invoices.length - 5} {t('alerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}

        {/* Overdue Visits Section */}
        {alerts.overdue_visits && alerts.overdue_visits.length > 0 && (
          <div className="border-bottom">
            <div
              className="p-3 bg-light d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('overdue_visits')}
            >
              <div>
                <strong>⏰ {t('alerts.overdueVisits', 'Overdue Scheduled Visits')}</strong>
                <Badge bg="danger" className="ms-2">{alerts.overdue_visits.length}</Badge>
              </div>
              <span>{expandedSections.overdue_visits ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.overdue_visits}>
              <div>
                <ListGroup variant="flush">
                  {alerts.overdue_visits.slice(0, 5).map((alert, index) => (
                    <ListGroup.Item
                      key={index}
                      action
                      onClick={() => handleAlertAction(alert)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.patient_name}</strong>
                          {alert.visit_type && <Badge bg="secondary">{alert.visit_type}</Badge>}
                        </div>
                        <div className="text-muted small">
                          {t('alerts.overdueBy', 'Overdue by')} {alert.overdue_text}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {alerts.overdue_visits.length > 5 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{alerts.overdue_visits.length - 5} {t('alerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}

        {/* Visits Without Custom Fields Section */}
        {alerts.visits_without_notes.length > 0 && (
          <div className="border-bottom">
            <div
              className="p-3 bg-light d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('visits_without_notes')}
            >
              <div>
                <strong>📋 {t('alerts.visitsWithoutCustomFields', 'Visits Without Custom Field Data')}</strong>
                <Badge bg="warning" text="dark" className="ms-2">{alerts.visits_without_notes.length}</Badge>
              </div>
              <span>{expandedSections.visits_without_notes ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.visits_without_notes}>
              <div>
                <ListGroup variant="flush">
                  {alerts.visits_without_notes.slice(0, 5).map((alert, index) => (
                    <ListGroup.Item
                      key={index}
                      action
                      onClick={() => handleAlertAction(alert)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.patient_name}</strong>
                          {alert.visit_type && <Badge bg="secondary">{alert.visit_type}</Badge>}
                          {alert.missing_fields_count && (
                            <Badge bg="danger">{alert.missing_fields_count} fields empty</Badge>
                          )}
                        </div>
                        <div className="text-muted small">{alert.message}</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {alerts.visits_without_notes.length > 5 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{alerts.visits_without_notes.length - 5} {t('alerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}

        {/* Patients Follow-up Section */}
        {alerts.patients_followup.length > 0 && (
          <div>
            <div
              className="p-3 bg-light d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSection('patients_followup')}
            >
              <div>
                <strong>👥 {t('alerts.patientsFollowup', 'Patients Requiring Follow-up')}</strong>
                <Badge bg="info" className="ms-2">{alerts.patients_followup.length}</Badge>
              </div>
              <span>{expandedSections.patients_followup ? '▼' : '▶'}</span>
            </div>
            <Collapse in={expandedSections.patients_followup}>
              <div>
                <ListGroup variant="flush">
                  {alerts.patients_followup.slice(0, 5).map((alert, index) => (
                    <ListGroup.Item
                      key={index}
                      action
                      onClick={() => handleAlertAction(alert)}
                      className="d-flex justify-content-between align-items-start"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getSeverityIcon(alert.severity)}</span>
                          <strong>{alert.patient_name}</strong>
                        </div>
                        <div className="text-muted small">{alert.message}</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {alerts.patients_followup.length > 5 && (
                    <ListGroup.Item className="text-center text-muted small">
                      +{alerts.patients_followup.length - 5} {t('alerts.more', 'more')}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Collapse>
          </div>
        )}
      </Card.Body>
      <Card.Footer className="text-center">
        <Button variant="link" size="sm" onClick={fetchAlerts}>
          🔄 {t('alerts.refresh', 'Refresh')}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default AlertsWidget;
