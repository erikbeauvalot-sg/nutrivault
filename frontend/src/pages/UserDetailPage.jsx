/**
 * UserDetailPage Component
 * Detailed user view page
 * For dietitians: shows their patients and scheduled visits
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Table, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ActionButton from '../components/ActionButton';
import userService from '../services/userService';
import visitService from '../services/visitService';
import UserModal from '../components/UserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ConfirmModal from '../components/ConfirmModal';
import UserWebsitesManager from '../components/UserWebsitesManager';
import PageViewsAnalytics from '../components/PageViewsAnalytics';
import { toast } from 'react-toastify';
import api from '../services/api';
import * as calendarAdmin from '../services/calendarAdminService';

const UserDetailPage = () => {
  const { t } = useTranslation();
  const { user: currentUser, hasPermission } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dietitian-specific data
  const [dietitianVisits, setDietitianVisits] = useState([]);
  const [dietitianPatients, setDietitianPatients] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  // Supervisor links (for ASSISTANT role)
  const [supervisors, setSupervisors] = useState([]);
  const [allDietitians, setAllDietitians] = useState([]);
  const [selectedDietitianId, setSelectedDietitianId] = useState('');
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);

  // Google Calendar data
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [calendarStats, setCalendarStats] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarList, setCalendarList] = useState([]);

  const currentUserRole = typeof currentUser?.role === 'string' ? currentUser.role : currentUser?.role?.name;
  const isAdmin = currentUserRole === 'ADMIN';
  const isOwnProfile = currentUser?.id === id;
  const canAccess = isAdmin || isOwnProfile || hasPermission('users.read');

  // Redirect if no access
  useEffect(() => {
    if (currentUser && !canAccess) {
      navigate('/dashboard');
    }
  }, [currentUser, canAccess, navigate]);

  useEffect(() => {
    if (id && canAccess) {
      fetchUser();
      if (isAdmin) {
        fetchRoles();
      }
    }
  }, [id, canAccess, isAdmin]);

  // Fetch dietitian data when user is loaded and is a dietitian
  useEffect(() => {
    if (user && user.role?.name === 'DIETITIAN') {
      fetchDietitianData();
      if (isAdmin || isOwnProfile) {
        fetchCalendarStatus();
      }
    }
    // Fetch supervisor links when user is an assistant
    if (user && user.role?.name === 'ASSISTANT' && isAdmin) {
      fetchSupervisors();
      fetchAllDietitians();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await userService.getUserById(id);
      setUser(userData);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('users.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const rolesList = await userService.getRoles();
      setRoles(Array.isArray(rolesList) ? rolesList : []);
    } catch (err) {
      // Error fetching roles
    }
  };

  const fetchSupervisors = async () => {
    try {
      setSupervisorsLoading(true);
      const res = await api.get(`/users/${id}/supervisors`);
      if (res.data.success) {
        setSupervisors(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err);
    } finally {
      setSupervisorsLoading(false);
    }
  };

  const fetchAllDietitians = async () => {
    try {
      const res = await api.get('/users/list/dietitians');
      if (res.data.success) {
        setAllDietitians(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching dietitians:', err);
    }
  };

  const handleAddSupervisor = async () => {
    if (!selectedDietitianId) return;
    try {
      await api.post(`/users/${id}/supervisors`, { dietitian_id: selectedDietitianId });
      toast.success(t('users.supervisorAdded', 'Supervisor link added'));
      setSelectedDietitianId('');
      fetchSupervisors();
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const handleRemoveSupervisor = async (dietitianId) => {
    try {
      await api.delete(`/users/${id}/supervisors/${dietitianId}`);
      toast.success(t('users.supervisorRemoved', 'Supervisor link removed'));
      fetchSupervisors();
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      setCalendarLoading(true);
      let status = null;

      if (isOwnProfile) {
        // Personal endpoints
        const res = await api.get('/calendar/sync-status');
        if (res.data.success) {
          status = {
            connected: res.data.data.google_calendar_sync_enabled || !!res.data.data.google_calendar_id,
            sync_enabled: res.data.data.google_calendar_sync_enabled,
            calendar_id: res.data.data.google_calendar_id || 'primary'
          };
        }
      } else {
        // Admin endpoints
        const res = await calendarAdmin.getDietitianCalendarStatuses();
        if (res.data.success) {
          status = res.data.data.find(d => d.id === id) || null;
        }
      }

      setCalendarStatus(status);

      if (status?.connected) {
        // Fetch stats and calendar list independently
        try {
          const statsRes = isOwnProfile
            ? await api.get('/calendar/sync-stats')
            : await calendarAdmin.getSyncStatsForDietitian(id);
          if (statsRes.data.success) setCalendarStats(statsRes.data.data);
        } catch { /* ignore stats error */ }
        try {
          const calRes = isOwnProfile
            ? await api.get('/calendar/calendars')
            : await calendarAdmin.getCalendarsForDietitian(id);
          if (calRes.data.success) setCalendarList(calRes.data.data || []);
        } catch { /* ignore calendars error */ }
      }
    } catch (err) {
      console.error('Error fetching calendar status:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleCalendarConnect = async () => {
    try {
      const res = isOwnProfile
        ? await api.get('/calendar/auth-url')
        : await calendarAdmin.getAuthUrlForDietitian(id);
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
              await fetchCalendarStatus();
              toast.success(t('googleCalendar.success.connected', 'Calendar connected'));
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
    } catch (err) {
      toast.error(t('googleCalendar.errors.getAuthUrl', 'Failed to get auth URL'));
    }
  };

  const handleCalendarSync = async () => {
    try {
      setCalendarSyncing(true);
      const res = isOwnProfile
        ? await api.post('/calendar/sync-to-calendar', { calendarId: calendarStatus?.calendar_id || 'primary' })
        : await calendarAdmin.syncForDietitian(id);
      if (res.data.success) {
        toast.success(t('googleCalendar.admin.syncSuccess', 'Sync completed'));
        await fetchCalendarStatus();
      }
    } catch (err) {
      toast.error(t('googleCalendar.admin.syncError', 'Sync failed'));
    } finally {
      setCalendarSyncing(false);
    }
  };

  const handleCalendarDisconnect = async () => {
    try {
      if (isOwnProfile) {
        await api.delete('/calendar/disconnect');
      } else {
        await calendarAdmin.disconnectDietitian(id);
      }
      toast.success(t('googleCalendar.success.disconnected', 'Calendar disconnected'));
      setCalendarStatus(prev => prev ? { ...prev, connected: false } : null);
      setCalendarStats(null);
      setCalendarList([]);
    } catch (err) {
      toast.error(t('googleCalendar.errors.disconnect', 'Failed to disconnect'));
    }
  };

  const handleCalendarToggleSync = async () => {
    if (!calendarStatus) return;
    const newSyncEnabled = !calendarStatus.sync_enabled;
    try {
      if (isOwnProfile) {
        await api.put('/calendar/settings', { calendarId: calendarStatus.calendar_id, syncEnabled: newSyncEnabled });
      } else {
        await calendarAdmin.updateDietitianSettings(id, { syncEnabled: newSyncEnabled });
      }
      setCalendarStatus(prev => prev ? { ...prev, sync_enabled: newSyncEnabled } : null);
    } catch (err) {
      toast.error(t('googleCalendar.errors.updateSettings', 'Failed to update settings'));
    }
  };

  const handleCalendarChange = async (calendarId) => {
    try {
      if (isOwnProfile) {
        await api.put('/calendar/settings', { calendarId, syncEnabled: calendarStatus?.sync_enabled });
      } else {
        await calendarAdmin.updateDietitianSettings(id, { calendarId });
      }
      setCalendarStatus(prev => prev ? { ...prev, calendar_id: calendarId } : null);
      toast.success(t('googleCalendar.admin.calendarChanged', 'Calendar updated'));
    } catch (err) {
      toast.error(t('googleCalendar.errors.updateSettings', 'Failed to update settings'));
    }
  };

  const fetchDietitianData = async () => {
    try {
      setVisitsLoading(true);

      // Fetch all visits for this dietitian
      const { data: allVisits } = await visitService.getVisits({
        dietitian_id: id,
        limit: 100
      });

      // Filter scheduled visits (upcoming)
      const scheduledVisits = allVisits.filter(v =>
        v.status === 'SCHEDULED' && new Date(v.visit_date) >= new Date()
      ).sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));

      setDietitianVisits(scheduledVisits);

      // Extract unique patients from all visits
      const patientsMap = new Map();
      allVisits.forEach(visit => {
        if (visit.patient && !patientsMap.has(visit.patient.id)) {
          patientsMap.set(visit.patient.id, {
            ...visit.patient,
            visitCount: 1,
            lastVisit: visit.visit_date
          });
        } else if (visit.patient) {
          const existing = patientsMap.get(visit.patient.id);
          existing.visitCount++;
          if (new Date(visit.visit_date) > new Date(existing.lastVisit)) {
            existing.lastVisit = visit.visit_date;
          }
        }
      });

      setDietitianPatients(Array.from(patientsMap.values()));
    } catch (err) {
      console.error('Error fetching dietitian data:', err);
    } finally {
      setVisitsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (user.id === currentUser.id) {
      alert(t('users.cannotToggleOwnStatus'));
      return;
    }
    try {
      await userService.toggleUserStatus(user.id);
      fetchUser();
    } catch (err) {
      console.error('Error toggling user status:', err);
      alert(err.response?.data?.error || t('users.failedToToggleStatus'));
    }
  };

  const handleDelete = () => {
    if (user.id === currentUser.id) {
      setError(t('users.cannotDeleteOwnAccount'));
      return;
    }

    if (user.is_active) {
      setError(t('users.mustDeactivateBeforeDelete'));
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await userService.deleteUser(user.id);
      navigate('/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || t('users.failedToDelete'));
    }
  };

  const handleEditSave = () => {
    fetchUser();
  };

  const getRoleBadge = (roleName) => {
    const variants = {
      ADMIN: 'danger',
      DIETITIAN: 'primary',
      ASSISTANT: 'info',
      VIEWER: 'secondary'
    };
    return <Badge bg={variants[roleName] || 'secondary'}>{roleName}</Badge>;
  };

  const getStatusBadge = (isActive, lockedUntil) => {
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return <Badge bg="warning">{t('users.locked')}</Badge>;
    }
    return isActive ? (
      <Badge bg="success">{t('users.active')}</Badge>
    ) : (
      <Badge bg="secondary">{t('users.inactive')}</Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisitStatusBadge = (status) => {
    const variants = {
      SCHEDULED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      NO_SHOW: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{t(`visits.${status?.toLowerCase()}`, status)}</Badge>;
  };

  if (currentUser && !canAccess) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">{t('common.loading')}</p>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container className="mt-4">
          <Alert variant="danger">
            {error}
            <div className="mt-3">
              <Button variant="outline-danger" onClick={() => navigate('/users')}>
                {t('common.back')}
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Container className="mt-4">
          <Alert variant="warning">
            {t('users.notFound', 'User not found')}
            <div className="mt-3">
              <Button variant="outline-warning" onClick={() => navigate('/users')}>
                {t('common.back')}
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  const isDietitian = user.role?.name === 'DIETITIAN';
  const isAssistant = user.role?.name === 'ASSISTANT';

  return (
    <Layout>
      <Container fluid className="mt-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => navigate('/users')}
                  className="mb-2"
                >
                  &larr; {t('common.back')}
                </Button>
                <h2 className="mb-1">
                  {user.first_name} {user.last_name}
                  {user.id === currentUser.id && (
                    <Badge bg="info" className="ms-2">{t('users.you')}</Badge>
                  )}
                </h2>
                <div className="text-muted">@{user.username}</div>
              </div>
              <div className="action-buttons">
                {isAdmin && (
                  <ActionButton
                    action="edit"
                    onClick={() => setShowEditModal(true)}
                    title={t('common.edit')}
                  />
                )}
                <ActionButton
                  action="reset-password"
                  onClick={() => setShowPasswordModal(true)}
                  title={t('users.resetPassword')}
                />
                {isAdmin && (
                  <>
                    <ActionButton
                      action={user.is_active ? 'disable' : 'enable'}
                      onClick={handleToggleStatus}
                      disabled={user.id === currentUser.id}
                      title={
                        user.id === currentUser.id
                          ? t('users.cannotToggleOwnStatus')
                          : user.is_active
                          ? t('users.deactivate')
                          : t('users.activate')
                      }
                    />
                    <ActionButton
                      action="delete"
                      onClick={handleDelete}
                      disabled={user.id === currentUser.id || user.is_active}
                      title={
                        user.id === currentUser.id
                          ? t('users.cannotDeleteOwnAccount')
                          : user.is_active
                          ? t('users.mustDeactivateBeforeDelete')
                          : t('users.deleteUser', 'Delete User')
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          {/* Account Information */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0">{t('users.accountInfo')}</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.username')}</Col>
                  <Col sm={8}><strong>{user.username}</strong></Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.email')}</Col>
                  <Col sm={8}>{user.email}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.role')}</Col>
                  <Col sm={8}>{user.role && getRoleBadge(user.role.name)}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.status')}</Col>
                  <Col sm={8}>{getStatusBadge(user.is_active, user.locked_until)}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.languagePreference')}</Col>
                  <Col sm={8}>
                    {user.language_preference === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Personal Information */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0">{t('users.personalInfo')}</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.firstName')}</Col>
                  <Col sm={8}>{user.first_name}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.lastName')}</Col>
                  <Col sm={8}>{user.last_name}</Col>
                </Row>
                <Row className="mb-3">
                  <Col sm={4} className="text-muted">{t('users.phone')}</Col>
                  <Col sm={8}>{user.phone || '-'}</Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Activity Information */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('users.activity')}</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3} className="mb-3">
                    <div className="text-muted small">{t('users.lastLogin')}</div>
                    <div>{user.last_login ? formatDate(user.last_login) : t('users.never')}</div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-muted small">{t('users.failedAttempts')}</div>
                    <div>
                      {user.failed_login_attempts > 0 ? (
                        <Badge bg="warning">{user.failed_login_attempts}</Badge>
                      ) : (
                        '0'
                      )}
                    </div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-muted small">{t('users.lockedUntil')}</div>
                    <div>
                      {user.locked_until && new Date(user.locked_until) > new Date() ? (
                        <Badge bg="danger">{formatDate(user.locked_until)}</Badge>
                      ) : (
                        t('users.notLocked')
                      )}
                    </div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <div className="text-muted small">{t('users.createdAt', 'Created')}</div>
                    <div>{formatDate(user.created_at)}</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Dietitian-specific sections */}
        {isDietitian && (
          <>
            {/* Scheduled Visits */}
            <Row className="mb-4">
              <Col>
                <Card>
                  <Card.Header className="bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        📅 {t('users.scheduledVisits', 'Scheduled Visits')}
                      </h5>
                      <Badge bg="light" text="dark">{dietitianVisits.length}</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {visitsLoading ? (
                      <div className="text-center py-4">
                        <Spinner animation="border" size="sm" />
                      </div>
                    ) : dietitianVisits.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        {t('users.noScheduledVisits', 'No scheduled visits')}
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="d-none d-md-block">
                          <Table hover className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>{t('visits.date')}</th>
                                <th>{t('visits.patient')}</th>
                                <th>{t('visits.type')}</th>
                                <th>{t('visits.status')}</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {dietitianVisits.slice(0, 10).map(visit => (
                                <tr
                                  key={visit.id}
                                  className="clickable-row"
                                  onClick={() => navigate(`/visits/${visit.id}`)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td>{formatDate(visit.visit_date)}</td>
                                  <td>
                                    <strong>{visit.patient?.first_name} {visit.patient?.last_name}</strong>
                                  </td>
                                  <td>{visit.visit_type || '-'}</td>
                                  <td>{getVisitStatusBadge(visit.status)}</td>
                                  <td onClick={e => e.stopPropagation()}>
                                    <ActionButton
                                      action="view"
                                      onClick={() => navigate(`/visits/${visit.id}`)}
                                      title={t('common.view')}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="d-md-none p-3">
                          {dietitianVisits.slice(0, 10).map(visit => (
                            <Card
                              key={visit.id}
                              className="mb-2 clickable-card"
                              onClick={() => navigate(`/visits/${visit.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Card.Body className="py-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <strong>{visit.patient?.first_name} {visit.patient?.last_name}</strong>
                                    <div className="text-muted small">{formatDate(visit.visit_date)}</div>
                                  </div>
                                  {getVisitStatusBadge(visit.status)}
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>

                        {dietitianVisits.length > 10 && (
                          <div className="text-center py-2 border-top">
                            <small className="text-muted">
                              +{dietitianVisits.length - 10} {t('common.more', 'more')}
                            </small>
                          </div>
                        )}
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Patients List */}
            <Row className="mb-4">
              <Col>
                <Card>
                  <Card.Header className="bg-success text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        👥 {t('users.dietitianPatients', 'Patients')}
                      </h5>
                      <Badge bg="light" text="dark">{dietitianPatients.length}</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {visitsLoading ? (
                      <div className="text-center py-4">
                        <Spinner animation="border" size="sm" />
                      </div>
                    ) : dietitianPatients.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        {t('users.noPatients', 'No patients')}
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="d-none d-md-block">
                          <Table hover className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>{t('patients.name')}</th>
                                <th>{t('patients.email')}</th>
                                <th>{t('users.visitCount', 'Visits')}</th>
                                <th>{t('users.lastVisitDate', 'Last Visit')}</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {dietitianPatients.map(patient => (
                                <tr
                                  key={patient.id}
                                  className="clickable-row"
                                  onClick={() => navigate(`/patients/${patient.id}`)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td>
                                    <strong>{patient.first_name} {patient.last_name}</strong>
                                  </td>
                                  <td>{patient.email || '-'}</td>
                                  <td>
                                    <Badge bg="secondary">{patient.visitCount}</Badge>
                                  </td>
                                  <td>{formatDateShort(patient.lastVisit)}</td>
                                  <td onClick={e => e.stopPropagation()}>
                                    <ActionButton
                                      action="view"
                                      onClick={() => navigate(`/patients/${patient.id}`)}
                                      title={t('common.view')}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="d-md-none p-3">
                          {dietitianPatients.map(patient => (
                            <Card
                              key={patient.id}
                              className="mb-2 clickable-card"
                              onClick={() => navigate(`/patients/${patient.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Card.Body className="py-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <strong>{patient.first_name} {patient.last_name}</strong>
                                    <div className="text-muted small">{patient.email || '-'}</div>
                                  </div>
                                  <Badge bg="secondary">{patient.visitCount} {t('visits.title', 'visits')}</Badge>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Google Calendar Section */}
            {(isAdmin || isOwnProfile) && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header className="bg-warning text-dark">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                          📅 {t('googleCalendar.title', 'Google Calendar')}
                        </h5>
                        {calendarStatus && (
                          <Badge bg={calendarStatus.connected ? 'success' : 'secondary'}>
                            {calendarStatus.connected
                              ? t('googleCalendar.admin.connected', 'Connected')
                              : t('googleCalendar.admin.notConnected', 'Not Connected')
                            }
                          </Badge>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {calendarLoading ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : !calendarStatus ? (
                        <div className="text-muted text-center py-3">
                          {t('googleCalendar.admin.noData', 'No calendar data available')}
                        </div>
                      ) : calendarStatus.connected ? (
                        <>
                          <Row className="mb-3">
                            <Col sm={6}>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small">{t('googleCalendar.admin.autoSync', 'Auto-sync')}</span>
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={calendarStatus.sync_enabled}
                                    onChange={handleCalendarToggleSync}
                                  />
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small">{t('googleCalendar.admin.calendarId', 'Calendar')}</span>
                                {calendarList.length > 0 ? (
                                  <Form.Select
                                    size="sm"
                                    style={{ maxWidth: 220 }}
                                    value={calendarStatus.calendar_id || 'primary'}
                                    onChange={(e) => handleCalendarChange(e.target.value)}
                                  >
                                    {calendarList.map((cal) => (
                                      <option key={cal.id} value={cal.id}>
                                        {cal.summary || cal.id}
                                        {cal.primary ? ` (${t('googleCalendar.primaryCalendar', 'Primary')})` : ''}
                                      </option>
                                    ))}
                                  </Form.Select>
                                ) : (
                                  <span className="small">
                                    {calendarStatus.calendar_id === 'primary'
                                      ? t('googleCalendar.primaryCalendar', 'Primary')
                                      : calendarStatus.calendar_id}
                                  </span>
                                )}
                              </div>
                            </Col>
                            <Col sm={6}>
                              {calendarStats && (
                                <>
                                  <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted small">{t('googleCalendar.syncStats.synced', 'Synced')}</span>
                                    <span className="small text-success fw-bold">{calendarStats.totalWithGoogle || 0}</span>
                                  </div>
                                  <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted small">{t('googleCalendar.syncStats.pending', 'Pending')}</span>
                                    <span className="small text-warning fw-bold">{calendarStats.byStatus?.pending_to_google || 0}</span>
                                  </div>
                                  <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted small">{t('googleCalendar.syncStats.issues', 'Issues')}</span>
                                    <span className="small text-danger fw-bold">
                                      {(calendarStats.byStatus?.conflict || 0) + (calendarStats.byStatus?.error || 0)}
                                    </span>
                                  </div>
                                  {calendarStats.lastSyncAt && (
                                    <div className="d-flex justify-content-between">
                                      <span className="text-muted small">{t('googleCalendar.admin.lastSync', 'Last sync')}</span>
                                      <span className="small">{new Date(calendarStats.lastSyncAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </Col>
                          </Row>
                          <div className="d-flex gap-2">
                            <ActionButton
                              onClick={handleCalendarSync}
                              disabled={calendarSyncing}
                              className="btn-sm btn-outline-primary"
                              title={t('googleCalendar.admin.syncNow', 'Sync Now')}
                            >
                              {calendarSyncing ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                t('googleCalendar.admin.syncNow', 'Sync Now')
                              )}
                            </ActionButton>
                            <ActionButton
                              onClick={handleCalendarDisconnect}
                              className="btn-sm btn-outline-danger"
                              title={t('googleCalendar.disconnect', 'Disconnect')}
                            >
                              {t('googleCalendar.disconnect', 'Disconnect')}
                            </ActionButton>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-muted small mb-3">
                            {isOwnProfile
                              ? t('googleCalendar.notConnected', 'Google Calendar is not connected.')
                              : t('googleCalendar.admin.notConnectedDesc', 'Google Calendar is not connected for this dietitian.')}
                          </p>
                          <ActionButton
                            onClick={handleCalendarConnect}
                            className="btn-sm btn-outline-success"
                            title={t('googleCalendar.connect', 'Connect')}
                          >
                            {t('googleCalendar.connect', 'Connect')}
                          </ActionButton>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Websites Section */}
            <Row className="mb-4">
              <Col>
                <Card>
                  <Card.Header className="bg-info text-white">
                    <h5 className="mb-0">
                      🌐 {t('settings.websites.sectionTitle', 'Websites')}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <UserWebsitesManager userId={user.id} readOnly={!isAdmin && !isOwnProfile} />
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Supervisor Links Section — only for ASSISTANT role, admin view */}
            {isAssistant && isAdmin && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header className="bg-primary text-white">
                      <h5 className="mb-0">
                        {t('users.supervisors.title', 'Dietitians linked')}
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <p className="text-muted mb-3">
                        {t('users.supervisors.description', 'This assistant can access data from the following dietitians:')}
                      </p>

                      {supervisorsLoading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>
                          {supervisors.length > 0 ? (
                            <Table size="sm" hover>
                              <thead>
                                <tr>
                                  <th>{t('users.name')}</th>
                                  <th>{t('users.email')}</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {supervisors.map(s => (
                                  <tr key={s.id}>
                                    <td>{s.dietitian?.first_name} {s.dietitian?.last_name}</td>
                                    <td>{s.dietitian?.email}</td>
                                    <td className="text-end">
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleRemoveSupervisor(s.dietitian_id)}
                                      >
                                        {t('common.remove', 'Remove')}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          ) : (
                            <Alert variant="info" className="mb-3">
                              {t('users.supervisors.none', 'No dietitian linked yet. This assistant cannot access any patient data.')}
                            </Alert>
                          )}

                          <div className="d-flex gap-2 align-items-center mt-2">
                            <Form.Select
                              size="sm"
                              value={selectedDietitianId}
                              onChange={(e) => setSelectedDietitianId(e.target.value)}
                              style={{ maxWidth: 300 }}
                            >
                              <option value="">{t('users.supervisors.selectDietitian', '-- Select a dietitian --')}</option>
                              {allDietitians
                                .filter(d => !supervisors.some(s => s.dietitian_id === d.id))
                                .map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.first_name} {d.last_name}
                                  </option>
                                ))}
                            </Form.Select>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleAddSupervisor}
                              disabled={!selectedDietitianId}
                            >
                              {t('common.add', 'Add')}
                            </Button>
                          </div>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Page Analytics Section — only for own profile or admin, and only if user has a landing page */}
            {(isAdmin || isOwnProfile) && user.landing_page_slug && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header className="bg-secondary text-white">
                      <h5 className="mb-0">
                        📊 {t('settings.analytics.sectionTitle', 'Page Analytics')}
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <PageViewsAnalytics pagePath={user.landing_page_slug} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}

        {/* Edit Modal */}
        <UserModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          mode="edit"
          user={user}
          roles={roles}
          onSave={handleEditSave}
        />

        {/* Password Modal */}
        <ChangePasswordModal
          show={showPasswordModal}
          onHide={() => setShowPasswordModal(false)}
          user={user}
          onSuccess={() => {
            setShowPasswordModal(false);
            fetchUser();
          }}
        />

        {/* Delete Confirm Modal */}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDeleteUser}
          title={t('common.confirmation', 'Confirmation')}
          message={t('users.confirmDelete')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default UserDetailPage;
