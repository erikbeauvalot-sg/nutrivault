/**
 * NotificationPreferences
 * Toggle switches for each notification type.
 * Fetches and updates preferences via backend API.
 * Only renders on native platforms.
 */

import { useState, useEffect } from 'react';
import { Card, Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { isNative } from '../utils/platform';
import * as notificationPreferenceService from '../services/notificationPreferenceService';

const NotificationPreferences = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    appointment_reminders: true,
    new_documents: true,
    measure_alerts: true,
  });

  if (!isNative) return null;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await notificationPreferenceService.getPreferences();
        setPrefs(data);
      } catch {
        // Defaults are fine
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await notificationPreferenceService.updatePreferences({ [key]: updated[key] });
    } catch {
      // Revert on failure
      setPrefs(prefs);
      toast.error(t('portal.updateError', 'Update failed'));
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-3">
          <Spinner size="sm" animation="border" />
        </Card.Body>
      </Card>
    );
  }

  const items = [
    {
      key: 'appointment_reminders',
      label: t('notifications.appointmentReminders', 'Appointment Reminders'),
      description: t('notifications.appointmentRemindersDesc', 'Get notified before your appointments'),
    },
    {
      key: 'new_documents',
      label: t('notifications.newDocuments', 'New Documents'),
      description: t('notifications.newDocumentsDesc', 'Get notified when new documents are shared'),
    },
    {
      key: 'measure_alerts',
      label: t('notifications.measureAlerts', 'Measure Alerts'),
      description: t('notifications.measureAlertsDesc', 'Get notified about measure alerts'),
    },
  ];

  return (
    <Card>
      <Card.Header>
        <FiBell className="me-2" />
        {t('notifications.title', 'Notifications')}
      </Card.Header>
      <Card.Body>
        {items.map((item) => (
          <div key={item.key} className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <strong style={{ fontSize: '0.9rem' }}>{item.label}</strong>
              <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>{item.description}</p>
            </div>
            <Form.Check
              type="switch"
              id={`notif-${item.key}`}
              checked={prefs[item.key]}
              onChange={() => handleToggle(item.key)}
            />
          </div>
        ))}
      </Card.Body>
    </Card>
  );
};

export default NotificationPreferences;
