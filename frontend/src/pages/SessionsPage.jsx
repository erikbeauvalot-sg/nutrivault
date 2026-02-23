/**
 * SessionsPage — Admin session management
 * Solarpunk aesthetic · RBAC: sessions.read / sessions.revoke
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table,
  Button, Badge, Form, InputGroup, Spinner
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { PageHeader, PageError, LoadingSpinner, EmptyState, Pagination } from '../components/common';
import { useIsMobile } from '../hooks';
import ConfirmModal from '../components/ConfirmModal';
import { getSessions, getStats, revokeSession, revokeUserSessions } from '../services/sessionService';
import './SessionsPage.css';

/* ─── helpers ────────────────────────────────────────────────────────────── */

function getInitials(u) {
  if (!u) return '?';
  const fn = u.first_name || '';
  const ln = u.last_name  || '';
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  if (fn) return fn[0].toUpperCase();
  return (u.username?.[0] || '?').toUpperCase();
}

function getFullName(u) {
  if (!u) return '';
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : u.username;
}

function roleBadgeVariant(role) {
  if (role === 'ADMIN')     return 'danger';
  if (role === 'DIETITIAN') return 'success';
  if (role === 'ASSISTANT') return 'info';
  if (role === 'PATIENT')   return 'secondary';
  return 'secondary';
}

function deviceIcon(deviceName) {
  if (!deviceName) return '💻';
  const dn = deviceName.toLowerCase();
  if (dn.includes('iphone') || dn.includes('android phone')) return '📱';
  if (dn.includes('ipad') || dn.includes('tablet'))          return '📟';
  if (dn.includes('mac'))   return '🖥️';
  if (dn.includes('mobile app')) return '📱';
  return '💻';
}

function formatUA(ua) {
  if (!ua) return '—';
  // Extract browser + OS from UA string (rough simplification)
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|OPR)[\/\s][\d.]+/i);
  const browser = m ? m[0].split('/')[0] : null;
  const osParts = ua.match(/\(([^)]+)\)/);
  const os = osParts ? osParts[1].split(';')[0].trim() : null;
  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  return ua.slice(0, 60);
}

function formatDate(dateStr, locale) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ─── stat card ──────────────────────────────────────────────────────────── */
function StatCard({ icon, value, label, color }) {
  return (
    <Card className={`sessions-stat-card sessions-stat-${color}`}>
      <Card.Body>
        <div className="sessions-stat-icon">{icon}</div>
        <div className="sessions-stat-value">{value ?? <Spinner animation="border" size="sm" />}</div>
        <div className="sessions-stat-label">{label}</div>
      </Card.Body>
    </Card>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */
const SessionsPage = () => {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [sessions, setSessions]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]             = useState(null);
  const [pagination, setPagination]   = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters]         = useState({ search: '', status: 'active', page: 1, limit: 20 });

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, variant: 'danger' });

  const canRead   = hasPermission('sessions.read');
  const canRevoke = hasPermission('sessions.revoke');
  const locale    = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  // ── redirect if no access ──────────────────────────────────────────────
  useEffect(() => {
    if (user && !canRead) navigate('/dashboard');
  }, [user, canRead, navigate]);

  // ── fetch sessions ─────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSessions(filters);
      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch {
      setError(t('sessions.errorLoading', 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  // ── fetch stats ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getStats();
      setStats(data);
    } catch {
      // stats non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && canRead) {
      fetchSessions();
      fetchStats();
    }
  }, [user, canRead, fetchSessions, fetchStats]);

  // ── filter handlers ────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setFilters(f => ({ ...f, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e) => {
    setFilters(f => ({ ...f, status: e.target.value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(f => ({ ...f, page: newPage }));
  };

  // ── revoke single session ─────────────────────────────────────────────
  const handleRevokeSession = (session) => {
    setConfirmModal({
      show:    true,
      title:   t('sessions.revokeTitle', 'Revoke Session'),
      message: t('sessions.revokeConfirm', 'Are you sure you want to revoke this session? The user will be logged out immediately.'),
      variant: 'danger',
      onConfirm: async () => {
        await revokeSession(session.id);
        fetchSessions();
        fetchStats();
      }
    });
  };

  // ── revoke all sessions for user ──────────────────────────────────────
  const handleRevokeUser = (u) => {
    setConfirmModal({
      show:    true,
      title:   t('sessions.revokeUserTitle', 'Revoke All Sessions'),
      message: t('sessions.revokeUserConfirm', 'This will log {{name}} out of all active sessions.', { name: getFullName(u) }),
      variant: 'warning',
      onConfirm: async () => {
        await revokeUserSessions(u.id);
        fetchSessions();
        fetchStats();
      }
    });
  };

  // ── render ─────────────────────────────────────────────────────────────
  if (error) return (
    <Layout>
      <PageError message={error} onRetry={() => { fetchSessions(); fetchStats(); }} />
    </Layout>
  );

  return (
    <Layout>
      <div className="sessions-page">
        <Container fluid className="sessions-container">
          <PageHeader
            title={t('sessions.title', 'Session Management')}
            subtitle={t('sessions.subtitle', 'Monitor and manage active user sessions')}
          />

          {/* ── stat cards ────────────────────────────────────────────── */}
          <Row className="sessions-stats-row g-3 mb-4">
            <Col xs={6} md={3}>
              <StatCard
                icon="🟢"
                color="green"
                value={statsLoading ? null : stats?.activeSessions ?? 0}
                label={t('sessions.stats.activeSessions', 'Active Sessions')}
              />
            </Col>
            <Col xs={6} md={3}>
              <StatCard
                icon="👥"
                color="blue"
                value={statsLoading ? null : stats?.activeUsers ?? 0}
                label={t('sessions.stats.activeUsers', 'Users Connected')}
              />
            </Col>
            <Col xs={6} md={3}>
              <StatCard
                icon="🔑"
                color="amber"
                value={statsLoading ? null : stats?.loginsLast24h ?? 0}
                label={t('sessions.stats.logins24h', 'Logins (24h)')}
              />
            </Col>
            <Col xs={6} md={3}>
              <StatCard
                icon="🚫"
                color="red"
                value={statsLoading ? null : stats?.revokedToday ?? 0}
                label={t('sessions.stats.revokedToday', 'Revoked Today')}
              />
            </Col>
          </Row>

          {/* ── filters ───────────────────────────────────────────────── */}
          <Card className="sessions-filters-card mb-3">
            <Card.Body>
              <Row className="g-2 align-items-end">
                <Col xs={12} md={6}>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      placeholder={t('sessions.searchPlaceholder', 'Search by username or email…')}
                      value={filters.search}
                      onChange={handleSearchChange}
                    />
                  </InputGroup>
                </Col>
                <Col xs={12} md={3}>
                  <Form.Select value={filters.status} onChange={handleStatusChange}>
                    <option value="active">{t('sessions.filter.active', 'Active')}</option>
                    <option value="revoked">{t('sessions.filter.revoked', 'Revoked')}</option>
                    <option value="all">{t('sessions.filter.all', 'All')}</option>
                  </Form.Select>
                </Col>
                <Col xs={12} md={3} className="d-flex justify-content-end">
                  <Button variant="outline-secondary" size="sm" onClick={() => { fetchSessions(); fetchStats(); }}>
                    ↺ {t('common.refresh', 'Refresh')}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* ── content ───────────────────────────────────────────────── */}
          {loading ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon="🔑"
              title={t('sessions.empty.title', 'No sessions found')}
              description={t('sessions.empty.description', 'No sessions match your current filters.')}
            />
          ) : isMobile ? (
            /* ── mobile cards ──────────────────────────────────────── */
            <div className="sessions-cards-list">
              {sessions.map(session => (
                <Card key={session.id} className={`sessions-card mb-3 ${!session.is_active ? 'sessions-card--revoked' : ''}`}>
                  <Card.Body>
                    <div className="sessions-card-header">
                      <div className="sessions-avatar" aria-hidden="true">
                        {getInitials(session.user)}
                      </div>
                      <div className="sessions-user-info">
                        <div className="sessions-user-name">{getFullName(session.user)}</div>
                        <div className="sessions-user-email">{session.user.email}</div>
                        {session.user.role && (
                          <Badge bg={roleBadgeVariant(session.user.role)} className="sessions-role-badge">
                            {session.user.role}
                          </Badge>
                        )}
                      </div>
                      <Badge bg={session.is_active ? 'success' : 'secondary'} className="sessions-status-badge">
                        {session.is_active
                          ? t('sessions.status.active', 'Active')
                          : t('sessions.status.revoked', 'Revoked')}
                      </Badge>
                    </div>

                    <div className="sessions-card-meta">
                      <span className="sessions-meta-item">
                        {deviceIcon(session.device_name)} {session.device_name}
                      </span>
                      <span className="sessions-meta-item">
                        🌐 {session.ip_address || '—'}
                      </span>
                    </div>

                    <div className="sessions-card-ua">
                      {formatUA(session.user_agent)}
                    </div>

                    <div className="sessions-card-dates">
                      <span>↗ {formatDate(session.created_at, locale)}</span>
                      <span>⏱ {formatDate(session.expires_at, locale)}</span>
                    </div>

                    {canRevoke && session.is_active && (
                      <div className="sessions-card-actions mt-2">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRevokeSession(session)}
                          className="me-2"
                        >
                          {t('sessions.revokeSession', 'Revoke')}
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => handleRevokeUser(session.user)}
                        >
                          {t('sessions.revokeAll', 'Revoke All')}
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          ) : (
            /* ── desktop table ─────────────────────────────────────── */
            <Card className="sessions-table-card">
              <div className="table-responsive">
                <Table hover className="sessions-table mb-0">
                  <thead>
                    <tr>
                      <th>{t('sessions.col.user', 'User')}</th>
                      <th>{t('sessions.col.device', 'Device')}</th>
                      <th>{t('sessions.col.ip', 'IP Address')}</th>
                      <th>{t('sessions.col.started', 'Started')}</th>
                      <th>{t('sessions.col.expires', 'Expires')}</th>
                      <th>{t('sessions.col.status', 'Status')}</th>
                      {canRevoke && <th className="text-end">{t('sessions.col.actions', 'Actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id} className={!session.is_active ? 'sessions-row-revoked' : ''}>
                        {/* user */}
                        <td>
                          <div className="sessions-user-cell">
                            <div className="sessions-avatar sessions-avatar--sm" aria-hidden="true">
                              {getInitials(session.user)}
                            </div>
                            <div>
                              <div className="sessions-user-name">{getFullName(session.user)}</div>
                              <div className="sessions-user-email">{session.user.email}</div>
                              {session.user.role && (
                                <Badge bg={roleBadgeVariant(session.user.role)} className="sessions-role-badge">
                                  {session.user.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* device */}
                        <td>
                          <div className="sessions-device-cell">
                            <span className="sessions-device-icon" aria-hidden="true">
                              {deviceIcon(session.device_name)}
                            </span>
                            <div>
                              <div className="sessions-device-name">{session.device_name}</div>
                              <div className="sessions-ua-short">{formatUA(session.user_agent)}</div>
                            </div>
                          </div>
                        </td>

                        {/* IP */}
                        <td>
                          <code className="sessions-ip">{session.ip_address || '—'}</code>
                        </td>

                        {/* started */}
                        <td className="sessions-date">{formatDate(session.created_at, locale)}</td>

                        {/* expires */}
                        <td className="sessions-date">{formatDate(session.expires_at, locale)}</td>

                        {/* status */}
                        <td>
                          <Badge bg={session.is_active ? 'success' : 'secondary'}>
                            {session.is_active
                              ? t('sessions.status.active', 'Active')
                              : session.is_revoked
                                ? t('sessions.status.revoked', 'Revoked')
                                : t('sessions.status.expired', 'Expired')}
                          </Badge>
                        </td>

                        {/* actions */}
                        {canRevoke && (
                          <td className="text-end">
                            {session.is_active && (
                              <>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="me-1"
                                  onClick={() => handleRevokeSession(session)}
                                  title={t('sessions.revokeSession', 'Revoke session')}
                                >
                                  🚫
                                </Button>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => handleRevokeUser(session.user)}
                                  title={t('sessions.revokeAll', 'Revoke all sessions for this user')}
                                >
                                  ⚠️
                                </Button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}

          {/* ── pagination ────────────────────────────────────────────── */}
          {!loading && pagination.totalPages > 1 && (
            <div className="sessions-pagination mt-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </Container>
      </div>

      {/* ── confirm modal ─────────────────────────────────────────────── */}
      <ConfirmModal
        show={confirmModal.show}
        onHide={() => setConfirmModal(m => ({ ...m, show: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={t('common.confirm', 'Confirm')}
        cancelLabel={t('common.cancel', 'Cancel')}
      />
    </Layout>
  );
};

export default SessionsPage;
