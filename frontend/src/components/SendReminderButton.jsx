/**
 * Send Reminder Button Component
 * Displays a button to manually send appointment reminders
 * Shows on visit detail pages for scheduled appointments
 */

import { useState } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaEnvelope } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import appointmentReminderService from '../services/appointmentReminderService';

const SendReminderButton = ({ visit, onReminderSent }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Determine if reminder can be sent
  const canSendReminder =
    visit?.status === 'SCHEDULED' &&
    visit?.visit_date &&
    new Date(visit.visit_date) > new Date() &&
    visit?.patient?.email &&
    visit?.patient?.appointment_reminders_enabled !== false;

  // Get tooltip message
  const getTooltipMessage = () => {
    if (!visit) return t('appointmentReminders.tooltips.dataUnavailable');
    if (visit.status !== 'SCHEDULED') return t('appointmentReminders.tooltips.notScheduled');
    if (!visit.visit_date || new Date(visit.visit_date) <= new Date()) {
      return t('appointmentReminders.tooltips.inPast');
    }
    if (!visit.patient?.email) return t('appointmentReminders.tooltips.noEmail');
    if (visit.patient?.appointment_reminders_enabled === false) {
      return t('appointmentReminders.tooltips.optedOut');
    }
    return t('appointmentReminders.tooltips.available');
  };

  /**
   * Handle send reminder button click
   */
  const handleSendReminder = async () => {
    const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
    if (!window.confirm(t('appointmentReminders.confirmSend', { patientName }))) {
      return;
    }

    setLoading(true);
    try {
      const response = await appointmentReminderService.sendReminderManually(visit.id);

      // Show success message
      alert(`✅ ${t('appointmentReminders.successMessage', { email: visit.patient.email })}`);

      // Trigger callback to refresh visit data
      if (onReminderSent) {
        onReminderSent();
      }
    } catch (error) {
      console.error('Error sending reminder:', error);

      // Show error message
      const errorMessage = error.response?.data?.error || t('appointmentReminders.errorMessage');
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`reminder-tooltip-${visit?.id}`}>{getTooltipMessage()}</Tooltip>}
    >
      <span className="d-inline-block">
        <Button
          variant="outline-primary"
          onClick={handleSendReminder}
          disabled={!canSendReminder || loading}
          style={{ pointerEvents: canSendReminder && !loading ? 'auto' : 'none' }}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-1"
              />
              {t('appointmentReminders.sending')}
            </>
          ) : (
            <>
              <FaEnvelope className="me-1" />
              {t('appointmentReminders.sendReminder')}
              {visit?.reminders_sent > 0 && ` (${t('appointmentReminders.remindersSent', { count: visit.reminders_sent })})`}
            </>
          )}
        </Button>
      </span>
    </OverlayTrigger>
  );
};

export default SendReminderButton;
