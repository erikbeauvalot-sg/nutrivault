import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ActionButton from './ActionButton';
import ConfirmModal from './ConfirmModal';

/**
 * Google Calendar Settings Component
 *
 * Allows users to connect/disconnect Google Calendar and manage sync settings
 */
const GoogleCalendarSettings = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncAllDietitians, setSyncAllDietitians] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Load current sync status on component mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  // Load calendars when user becomes connected
  useEffect(() => {
    if (isConnected) {
      loadCalendars();
    }
  }, [isConnected]);

  const loadSyncStatus = async () => {
    try {
      const response = await api.get('/calendar/sync-status');
      if (response.data.success) {
        setIsConnected(response.data.data.google_calendar_sync_enabled);
        setSyncEnabled(response.data.data.google_calendar_sync_enabled);
        setSelectedCalendar(response.data.data.google_calendar_id || 'primary');
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadCalendars = async () => {
    try {
      const response = await api.get('/calendar/calendars');
      if (response.data.success) {
        setCalendars(response.data.data);
      }
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error(t('googleCalendar.errors.loadCalendars'));
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/calendar/auth-url');

      if (response.data.success) {
        // Open Google OAuth in a new window
        const authWindow = window.open(
          response.data.data.authUrl,
          'google-calendar-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Poll for completion
        const checkAuth = setInterval(async () => {
          try {
            if (authWindow.closed) {
              clearInterval(checkAuth);
              await loadSyncStatus();
              if (isConnected) {
                await loadCalendars();
                toast.success(t('googleCalendar.success.connected'));
              }
            }
          } catch (error) {
            clearInterval(checkAuth);
            console.error('Error checking auth status:', error);
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkAuth);
          if (!authWindow.closed) {
            authWindow.close();
            toast.error(t('googleCalendar.errors.authTimeout'));
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error(t('googleCalendar.errors.getAuthUrl'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.put('/calendar/settings', {
        calendarId: selectedCalendar,
        syncEnabled
      });

      if (response.data.success) {
        toast.success(t('googleCalendar.success.settingsUpdated'));
        await loadSyncStatus();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(t('googleCalendar.errors.updateSettings'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToCalendar = async () => {
    try {
      setIsLoading(true);
      const response = await api.post('/calendar/sync-to-calendar', {
        calendarId: selectedCalendar,
        syncAllDietitians: isAdmin && syncAllDietitians
      });

      if (response.data.success) {
        toast.success(t('googleCalendar.success.syncToCalendar', {
          count: response.data.data.synced
        }));
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error(t('googleCalendar.errors.syncToCalendar'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromCalendar = async () => {
    try {
      setIsLoading(true);
      const response = await api.post('/calendar/sync-from-calendar', {
        calendarId: selectedCalendar
      });

      if (response.data.success) {
        toast.success(t('googleCalendar.success.syncFromCalendar', {
          count: response.data.data.synced
        }));
      }
    } catch (error) {
      console.error('Error syncing from calendar:', error);
      toast.error(t('googleCalendar.errors.syncFromCalendar'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const response = await api.delete('/calendar/disconnect');

      if (response.data.success) {
        setIsConnected(false);
        setSyncEnabled(false);
        setCalendars([]);
        setSelectedCalendar('primary');
        toast.success(t('googleCalendar.success.disconnected'));
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error(t('googleCalendar.errors.disconnect'));
    } finally {
      setIsLoading(false);
      setShowDisconnectModal(false);
    }
  };

  return (
    <div className="google-calendar-settings">
      <h3>{t('googleCalendar.title')}</h3>
      <p className="text-muted">{t('googleCalendar.description')}</p>

      {!isConnected ? (
        <div className="connection-section">
          <p>{t('googleCalendar.notConnected')}</p>
          <ActionButton
            onClick={handleConnect}
            disabled={isLoading}
            className="btn-primary"
            title={t('googleCalendar.connect')}
          >
            {isLoading ? t('common.loading') : t('googleCalendar.connect')}
          </ActionButton>
        </div>
      ) : (
        <div className="settings-section">
          <div className="status-indicator">
            <span className="badge badge-success">
              {t('googleCalendar.connected')}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="calendar-select">
              {t('googleCalendar.selectCalendar')}
            </label>
            <select
              id="calendar-select"
              value={selectedCalendar}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className="form-control"
            >
              <option value="primary">{t('googleCalendar.primaryCalendar')}</option>
              {calendars.map(calendar => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div className="form-check">
              <input
                type="checkbox"
                id="sync-enabled"
                checked={syncEnabled}
                onChange={(e) => setSyncEnabled(e.target.checked)}
                className="form-check-input"
              />
              <label htmlFor="sync-enabled" className="form-check-label">
                {t('googleCalendar.enableAutoSync')}
              </label>
            </div>
            <small className="form-text text-muted">
              {t('googleCalendar.autoSyncDescription')}
            </small>
          </div>

          {isAdmin && (
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="sync-all-dietitians"
                  checked={syncAllDietitians}
                  onChange={(e) => setSyncAllDietitians(e.target.checked)}
                  className="form-check-input"
                />
                <label htmlFor="sync-all-dietitians" className="form-check-label">
                  {t('googleCalendar.syncAllDietitians')}
                </label>
              </div>
              <small className="form-text text-muted">
                {t('googleCalendar.syncAllDietitiansDescription')}
              </small>
            </div>
          )}

          {isConnected && (
            <div className="alert alert-info">
              <small>
                <i className="bi bi-info-circle me-2"></i>
                {syncEnabled
                  ? t('googleCalendar.autoSyncEnabled')
                  : t('googleCalendar.autoSyncDisabled')
                }
              </small>
            </div>
          )}

          <div className="button-group">
            <ActionButton
              onClick={handleUpdateSettings}
              disabled={isLoading}
              className="btn-secondary"
              title={t('googleCalendar.updateSettings')}
            >
              {t('googleCalendar.updateSettings')}
            </ActionButton>

            <ActionButton
              onClick={handleSyncToCalendar}
              disabled={isLoading}
              className="btn-info"
              title={t('googleCalendar.syncToCalendar')}
            >
              {t('googleCalendar.syncToCalendar')}
            </ActionButton>

            <ActionButton
              onClick={handleSyncFromCalendar}
              disabled={isLoading}
              className="btn-info"
              title={t('googleCalendar.syncFromCalendar')}
            >
              {t('googleCalendar.syncFromCalendar')}
            </ActionButton>

            <ActionButton
              onClick={() => setShowDisconnectModal(true)}
              disabled={isLoading}
              className="btn-danger"
              title={t('googleCalendar.disconnect')}
            >
              {t('googleCalendar.disconnect')}
            </ActionButton>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDisconnectModal}
        title={t('googleCalendar.disconnectConfirm.title')}
        message={t('googleCalendar.disconnectConfirm.message')}
        onConfirm={handleDisconnect}
        onCancel={() => setShowDisconnectModal(false)}
        confirmText={t('googleCalendar.disconnect')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

export default GoogleCalendarSettings;