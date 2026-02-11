/**
 * NotificationPreferences
 * Toggle switches for each notification type + configurable reminder times.
 * Fetches and updates preferences via backend API.
 * Only renders on native platforms.
 */

import { useState, useEffect } from 'react';
import { Card, Form, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { isNative } from '../utils/platform';
import * as notificationPreferenceService from '../services/notificationPreferenceService';

const REMINDER_OPTIONS = [
  { hours: 1, labelEn: '1 hour', labelFr: '1 heure' },
  { hours: 2, labelEn: '2 hours', labelFr: '2 heures' },
  { hours: 4, labelEn: '4 hours', labelFr: '4 heures' },
  { hours: 12, labelEn: '12 hours', labelFr: '12 heures' },
  { hours: 24, labelEn: '24 hours', labelFr: '24 heures' },
  { hours: 48, labelEn: '48 hours', labelFr: '48 heures' },
  { hours: 168, labelEn: '1 week', labelFr: '1 semaine' },
];

const NotificationPreferences = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    appointment_reminders: true,
    new_documents: true,
    measure_alerts: true,
    journal_comments: true,
    new_messages: true,
    reminder_times_hours: null,
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
      setPrefs(prefs);
      toast.error(t('portal.updateError', 'Update failed'));
    }
  };

  const handleReminderTimeToggle = async (hours) => {
    const current = prefs.reminder_times_hours || [1, 24]; // default
    const isSelected = current.includes(hours);
    const updated = isSelected
      ? current.filter(h => h !== hours)
      : [...current, hours].sort((a, b) => a - b);

    const newPrefs = { ...prefs, reminder_times_hours: updated.length > 0 ? updated : null };
    setPrefs(newPrefs);
    try {
      await notificationPreferenceService.updatePreferences({
        reminder_times_hours: updated.length > 0 ? updated : null,
      });
    } catch {
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

  const isFr = i18n.language?.startsWith('fr');

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
    {
      key: 'journal_comments',
      label: t('notifications.journalComments', 'Journal Comments'),
      description: t('notifications.journalCommentsDesc', 'Get notified when someone comments on your journal'),
    },
    {
      key: 'new_messages',
      label: t('notifications.newMessages', 'New Messages'),
      description: t('notifications.newMessagesDesc', 'Get notified when you receive a new message'),
    },
  ];

  const activeReminderTimes = prefs.reminder_times_hours || [1, 24];

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

        {/* Configurable reminder times */}
        {prefs.appointment_reminders && (
          <div className="mt-2 pt-3 border-top">
            <strong style={{ fontSize: '0.9rem' }}>
              {t('notifications.reminderTimes', 'Reminder timing')}
            </strong>
            <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
              {t('notifications.reminderTimesDesc', 'Choose when to be notified before appointments')}
            </p>
            <div className="d-flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map(opt => {
                const isActive = activeReminderTimes.includes(opt.hours);
                return (
                  <Badge
                    key={opt.hours}
                    bg={isActive ? 'primary' : 'light'}
                    text={isActive ? 'white' : 'dark'}
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '6px 12px',
                      border: isActive ? 'none' : '1px solid #dee2e6',
                    }}
                    onClick={() => handleReminderTimeToggle(opt.hours)}
                  >
                    {isFr ? opt.labelFr : opt.labelEn}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NotificationPreferences;
