import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiBell, FiCalendar, FiMessageSquare, FiFile, FiEdit3, FiActivity, FiCheck, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import * as notificationService from '../services/notificationService';
import Layout from '../components/layout/Layout';
import { formatDate } from '../utils/dateUtils';

const ICONS = {
  appointment_reminder: FiCalendar,
  new_message: FiMessageSquare,
  new_document: FiFile,
  journal_comment: FiEdit3,
  measure_alert: FiActivity,
};

const ICON_COLORS = {
  appointment_reminder: '#d69e2e',
  new_message: '#3182ce',
  new_document: '#38a169',
  journal_comment: '#805ad5',
  measure_alert: '#e53e3e',
};

function timeAgo(dateStr, t, language) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.justNow', 'Just now');
  if (mins < 60) return t('notifications.minutesAgo', '{{count}}m ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.hoursAgo', '{{count}}h ago', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', '{{count}}d ago', { count: days });
  return formatDate(dateStr, language);
}

function getNavigationTarget(notification, isPatient) {
  const data = notification.data || {};
  const prefix = isPatient ? '/portal' : '';
  switch (notification.type) {
    case 'appointment_reminder':
      return `${prefix}/visits`;
    case 'new_message':
      return `${prefix}/messages`;
    case 'new_document':
      return `${prefix}/documents`;
    case 'journal_comment':
      return isPatient ? '/portal/journal' : null;
    case 'measure_alert':
      return isPatient ? '/portal/measures' : null;
    default:
      return null;
  }
}

const NotificationItem = ({ notification, isPatient, onRead, onDelete, t, language }) => {
  const navigate = useNavigate();
  const Icon = ICONS[notification.type] || FiBell;
  const iconColor = ICON_COLORS[notification.type] || '#718096';

  const handleClick = async () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    const target = getNavigationTarget(notification, isPatient);
    if (target) navigate(target);
  };

  return (
    <div
      className={`d-flex align-items-start gap-3 p-3 border-bottom notification-item ${!notification.is_read ? 'bg-light' : ''}`}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle"
        style={{ width: 40, height: 40, background: `${iconColor}18`, color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex justify-content-between align-items-start">
          <div className="fw-semibold text-truncate" style={{ fontSize: '0.9rem' }}>
            {!notification.is_read && (
              <span className="d-inline-block rounded-circle me-2" style={{ width: 8, height: 8, background: '#3182ce', verticalAlign: 'middle' }} />
            )}
            {notification.title}
          </div>
          <small className="text-muted flex-shrink-0 ms-2" style={{ fontSize: '0.75rem' }}>
            {timeAgo(notification.created_at, t, language)}
          </small>
        </div>
        {notification.body && (
          <div className="text-muted mt-1" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
            {notification.body}
          </div>
        )}
      </div>
      <button
        className="btn btn-sm btn-link text-muted p-1 flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
        title={t('common.delete', 'Delete')}
      >
        <FiTrash2 size={14} />
      </button>
    </div>
  );
};

const NotificationCenterContent = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { unreadCount, refreshCount, markAllRead } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isPatient = user?.role === 'PATIENT';

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const result = await notificationService.getNotifications({ page: pageNum, limit: 20 });
      if (append) {
        setNotifications(prev => [...prev, ...result.data]);
      } else {
        setNotifications(result.data);
      }
      setHasMore(pageNum < result.pagination.totalPages);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
      refreshCount();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      refreshCount();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchNotifications(page + 1, true);
  };

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: 680 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
          <FiBell size={22} />
          {t('notifications.title', 'Notifications')}
        </h4>
        {unreadCount > 0 && (
          <Button variant="outline-primary" size="sm" onClick={handleMarkAllRead} className="d-flex align-items-center gap-1">
            <FiCheckCircle size={14} />
            {t('notifications.markAllRead', 'Mark all as read')}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-5">
          <FiBell size={48} className="text-muted mb-3" style={{ opacity: 0.3 }} />
          <p className="text-muted">{t('notifications.empty', 'No notifications yet')}</p>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm overflow-hidden">
          {notifications.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              isPatient={isPatient}
              onRead={handleRead}
              onDelete={handleDelete}
              t={t}
              language={i18n.language}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-3">
          <Button variant="outline-secondary" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner size="sm" animation="border" /> : t('notifications.loadMore', 'Load more')}
          </Button>
        </div>
      )}
    </Container>
  );
};

// Wrapper: patient routes already get PatientPortalLayout from PatientProtectedRoute,
// dietitian routes need Layout since ProtectedRoute doesn't provide one.
const NotificationCenterPage = () => {
  const { user } = useAuth();
  const isPatient = user?.role === 'PATIENT';

  if (isPatient) {
    return <NotificationCenterContent />;
  }

  return (
    <Layout>
      <NotificationCenterContent />
    </Layout>
  );
};

export default NotificationCenterPage;
