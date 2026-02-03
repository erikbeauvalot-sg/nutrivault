import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import * as calendarAdmin from '../services/calendarAdminService';

const CalendarSettingsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dietitians, setDietitians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [statsMap, setStatsMap] = useState({});

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchDietitians();
    }
  }, [user]);

  const fetchDietitians = async () => {
    try {
      setLoading(true);
      const res = await calendarAdmin.getDietitianCalendarStatuses();
      if (res.data.success) {
        setDietitians(res.data.data);
        // Load stats for connected dietitians
        const connected = res.data.data.filter(d => d.connected);
        const stats = {};
        await Promise.all(connected.map(async (d) => {
          try {
            const s = await calendarAdmin.getSyncStatsForDietitian(d.id);
            if (s.data.success) stats[d.id] = s.data.data;
          } catch { /* ignore */ }
        }));
        setStatsMap(stats);
      }
    } catch (error) {
      console.error('Error fetching dietitians:', error);
      toast.error(t('googleCalendar.admin.loadError', 'Failed to load dietitians'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (dietitianId) => {
    try {
      const res = await calendarAdmin.getAuthUrlForDietitian(dietitianId);
      if (res.data.success) {
        const authWindow = window.open(
          res.data.data.authUrl,
          'google-calendar-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        const checkAuth = setInterval(async () => {
          try {
            if (authWindow.closed) {
              clearInterval(checkAuth);
              await fetchDietitians();
              toast.success(t('googleCalendar.admin.connectSuccess', 'Calendar connected'));
            }
          } catch {
            clearInterval(checkAuth);
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkAuth);
          if (!authWindow.closed) authWindow.close();
        }, 300000);
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error(t('googleCalendar.errors.getAuthUrl'));
    }
  };

  const handleSync = async (dietitianId) => {
    try {
      setSyncingId(dietitianId);
      const res = await calendarAdmin.syncForDietitian(dietitianId);
      if (res.data.success) {
        toast.success(t('googleCalendar.admin.syncSuccess', 'Sync completed'));
        // Reload stats for this dietitian
        try {
          const s = await calendarAdmin.getSyncStatsForDietitian(dietitianId);
          if (s.data.success) setStatsMap(prev => ({ ...prev, [dietitianId]: s.data.data }));
        } catch { /* ignore */ }
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error(t('googleCalendar.admin.syncError', 'Sync failed'));
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const res = await calendarAdmin.syncAllDietitians();
      if (res.data.success) {
        toast.success(t('googleCalendar.admin.syncAllSuccess', {
          successful: res.data.data.successful,
          failed: res.data.data.failed
        }));
        await fetchDietitians();
      }
    } catch (error) {
      console.error('Error syncing all:', error);
      toast.error(t('googleCalendar.admin.syncError', 'Sync failed'));
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      await calendarAdmin.disconnectDietitian(disconnectTarget.id);
      toast.success(t('googleCalendar.success.disconnected'));
      setDisconnectTarget(null);
      await fetchDietitians();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error(t('googleCalendar.errors.disconnect'));
    }
  };

  const handleToggleSync = async (dietitianId, currentEnabled) => {
    try {
      await calendarAdmin.updateDietitianSettings(dietitianId, { syncEnabled: !currentEnabled });
      setDietitians(prev => prev.map(d =>
        d.id === dietitianId ? { ...d, sync_enabled: !currentEnabled } : d
      ));
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error(t('googleCalendar.errors.updateSettings'));
    }
  };

  const connectedCount = dietitians.filter(d => d.connected).length;
  const notConnectedCount = dietitians.length - connectedCount;

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">{t('googleCalendar.admin.title', 'Calendar Settings')}</h2>
            <p className="text-muted mb-0">
              {t('googleCalendar.admin.description', 'Manage Google Calendar connections for all dietitians')}
            </p>
          </div>
          <ActionButton
            onClick={handleSyncAll}
            disabled={syncingAll || connectedCount === 0}
            className="btn-primary"
            title={t('googleCalendar.admin.syncAll', 'Sync All')}
          >
            {syncingAll ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('googleCalendar.admin.syncingAll', 'Syncing...')}
              </>
            ) : (
              t('googleCalendar.admin.syncAll', 'Sync All')
            )}
          </ActionButton>
        </div>

        {/* Summary */}
        <Row className="mb-4">
          <Col md={6}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-3">
                <div className="fs-3 fw-bold text-success">{connectedCount}</div>
                <small className="text-muted">{t('googleCalendar.admin.connected', 'Connected')}</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-3">
                <div className="fs-3 fw-bold text-secondary">{notConnectedCount}</div>
                <small className="text-muted">{t('googleCalendar.admin.notConnected', 'Not Connected')}</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Dietitians List */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : dietitians.length === 0 ? (
          <Alert variant="info">
            {t('googleCalendar.admin.noDietitians', 'No dietitians found')}
          </Alert>
        ) : (
          <Row>
            {dietitians.map((d) => {
              const stats = statsMap[d.id];
              const isSyncing = syncingId === d.id;

              return (
                <Col lg={6} xl={4} key={d.id} className="mb-3">
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      {/* Header row */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                            style={{
                              width: 40, height: 40, fontSize: '0.9rem',
                              backgroundColor: d.connected ? 'var(--bs-success)' : 'var(--bs-secondary)'
                            }}
                          >
                            {(d.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold">{d.name}</div>
                            <small className="text-muted">{d.role}</small>
                          </div>
                        </div>
                        <Badge bg={d.connected ? 'success' : 'secondary'} className="px-2 py-1">
                          {d.connected
                            ? t('googleCalendar.admin.connected', 'Connected')
                            : t('googleCalendar.admin.notConnected', 'Not Connected')
                          }
                        </Badge>
                      </div>

                      {/* Details */}
                      {d.connected && (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <small className="text-muted">{t('googleCalendar.admin.autoSync', 'Auto-sync')}</small>
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={d.sync_enabled}
                                onChange={() => handleToggleSync(d.id, d.sync_enabled)}
                              />
                            </div>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">{t('googleCalendar.admin.calendarId', 'Calendar')}</small>
                            <small>{d.calendar_id === 'primary' ? t('googleCalendar.primaryCalendar') : d.calendar_id}</small>
                          </div>
                          {stats && (
                            <>
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">{t('googleCalendar.syncStats.synced', 'Synced')}</small>
                                <small className="text-success fw-bold">{stats.totalWithGoogle || 0}</small>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">{t('googleCalendar.syncStats.pending', 'Pending')}</small>
                                <small className="text-warning fw-bold">{stats.byStatus?.pending_to_google || 0}</small>
                              </div>
                              <div className="d-flex justify-content-between mb-1">
                                <small className="text-muted">{t('googleCalendar.syncStats.issues', 'Issues')}</small>
                                <small className="text-danger fw-bold">{(stats.byStatus?.conflict || 0) + (stats.byStatus?.error || 0)}</small>
                              </div>
                              {stats.lastSyncAt && (
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">{t('googleCalendar.admin.lastSync', 'Last sync')}</small>
                                  <small>{new Date(stats.lastSyncAt).toLocaleString()}</small>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="d-flex gap-2 flex-wrap">
                        {d.connected ? (
                          <>
                            <ActionButton
                              onClick={() => handleSync(d.id)}
                              disabled={isSyncing}
                              className="btn-sm btn-outline-primary flex-fill"
                              title={t('googleCalendar.admin.syncNow', 'Sync Now')}
                            >
                              {isSyncing ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                t('googleCalendar.admin.syncNow', 'Sync Now')
                              )}
                            </ActionButton>
                            <ActionButton
                              onClick={() => setDisconnectTarget(d)}
                              className="btn-sm btn-outline-danger"
                              title={t('googleCalendar.disconnect')}
                            >
                              {t('googleCalendar.disconnect')}
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton
                            onClick={() => handleConnect(d.id)}
                            className="btn-sm btn-outline-success flex-fill"
                            title={t('googleCalendar.admin.connectFor', 'Connect')}
                          >
                            {t('googleCalendar.admin.connectFor', 'Connect')}
                          </ActionButton>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        <ConfirmModal
          show={!!disconnectTarget}
          title={t('googleCalendar.disconnectConfirm.title')}
          message={t('googleCalendar.admin.disconnectConfirm', {
            name: disconnectTarget?.name
          })}
          onConfirm={handleDisconnect}
          onHide={() => setDisconnectTarget(null)}
          confirmLabel={t('googleCalendar.disconnect')}
          cancelLabel={t('common.cancel')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default CalendarSettingsPage;
