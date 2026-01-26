/**
 * Send Reminder Button Component
 * Displays a button to manually send appointment reminders
 * Shows on visit detail pages for scheduled appointments
 */

import { useState } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import { FaEnvelope, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import appointmentReminderService from '../services/appointmentReminderService';
import ConfirmModal from './ConfirmModal';

const SendReminderButton = ({ visit, onReminderSent }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'danger', text: string }
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
  const handleSendReminder = () => {
    setShowConfirmModal(true);
  };

  const confirmSendReminder = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await appointmentReminderService.sendReminderManually(visit.id);

      // Show success message
      setMessage({
        type: 'success',
        text: t('appointmentReminders.successMessage', { email: visit.patient.email })
      });

      // Auto-hide after 5 seconds
      setTimeout(() => setMessage(null), 5000);

      // Trigger callback to refresh visit data
      if (onReminderSent) {
        onReminderSent();
      }
    } catch (error) {
      console.error('Error sending reminder:', error);

      // Show error message
      const errorMessage = error.response?.data?.error || t('appointmentReminders.errorMessage');
      setMessage({
        type: 'danger',
        text: errorMessage
      });

      // Auto-hide after 8 seconds
      setTimeout(() => setMessage(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-inline-block">
      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
          className="mb-2 py-2 px-3"
          style={{ fontSize: '0.9rem' }}
        >
          {message.type === 'success' ? (
            <FaCheckCircle className="me-2" />
          ) : (
            <FaTimesCircle className="me-2" />
          )}
          {message.text}
        </Alert>
      )}
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`reminder-tooltip-${visit?.id}`}>{getTooltipMessage()}</Tooltip>}
      >
        <span className="d-inline-block">
          <Button
            variant="warning"
            onClick={handleSendReminder}
            disabled={!canSendReminder || loading}
            style={{ pointerEvents: canSendReminder && !loading ? 'auto' : 'none', whiteSpace: 'nowrap' }}
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
                {visit?.reminders_sent > 0 && ` (${visit.reminders_sent})`}
              </>
            )}
          </Button>
        </span>
      </OverlayTrigger>

      <ConfirmModal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        onConfirm={confirmSendReminder}
        title={t('common.confirmation', 'Confirmation')}
        message={t('appointmentReminders.confirmSend', { patientName: `${visit?.patient?.first_name} ${visit?.patient?.last_name}` })}
        confirmLabel={t('appointmentReminders.sendReminder', 'Send Reminder')}
        variant="warning"
      />
    </div>
  );
};

export default SendReminderButton;
