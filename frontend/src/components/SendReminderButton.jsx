/**
 * Send Reminder Button Component
 * Displays buttons to manually send appointment reminders or calendar invitations
 * Shows on visit detail pages for scheduled appointments
 */

import { useState } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip, Alert } from 'react-bootstrap';
import { FaEnvelope, FaCheckCircle, FaTimesCircle, FaCalendarPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import appointmentReminderService from '../services/appointmentReminderService';
import ConfirmModal from './ConfirmModal';

const SendReminderButton = ({ visit, onReminderSent }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'reminder' | 'invitation'
  const [message, setMessage] = useState(null); // { type: 'success' | 'danger', text: string }
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'reminder' | 'invitation'

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
   * Handle button click - show confirmation modal
   */
  const handleAction = (type) => {
    setActionType(type);
    setShowConfirmModal(true);
  };

  /**
   * Confirm and execute the action
   */
  const confirmAction = async () => {
    setLoading(true);
    setLoadingType(actionType);
    setMessage(null);
    setShowConfirmModal(false);

    try {
      if (actionType === 'reminder') {
        await appointmentReminderService.sendReminderManually(visit.id);
        setMessage({
          type: 'success',
          text: t('appointmentReminders.successMessage', { email: visit.patient.email })
        });
      } else if (actionType === 'invitation') {
        await appointmentReminderService.sendInvitationManually(visit.id);
        setMessage({
          type: 'success',
          text: t('appointmentReminders.invitationSuccessMessage', { email: visit.patient.email })
        });
      }

      // Auto-hide after 5 seconds
      setTimeout(() => setMessage(null), 5000);

      // Trigger callback to refresh visit data
      if (onReminderSent) {
        onReminderSent();
      }
    } catch (error) {
      console.error(`Error sending ${actionType}:`, error);

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
      setLoadingType(null);
      setActionType(null);
    }
  };

  const getConfirmMessage = () => {
    if (actionType === 'invitation') {
      return t('appointmentReminders.confirmSendInvitation', {
        patientName: `${visit?.patient?.first_name} ${visit?.patient?.last_name}`
      });
    }
    return t('appointmentReminders.confirmSend', {
      patientName: `${visit?.patient?.first_name} ${visit?.patient?.last_name}`
    });
  };

  const getConfirmTitle = () => {
    if (actionType === 'invitation') {
      return t('appointmentReminders.sendInvitation', 'Send Invitation');
    }
    return t('appointmentReminders.sendReminder', 'Send Reminder');
  };

  return (
    <>
      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
          className="mb-2 py-2 px-3 w-100"
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

      {/* Button 1: Send Invitation (calendar) */}
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`invitation-tooltip-${visit?.id}`}>{getTooltipMessage()}</Tooltip>}
      >
        <span className="d-inline-block">
          <Button
            variant="info"
            onClick={() => handleAction('invitation')}
            disabled={!canSendReminder || loading}
            style={{ pointerEvents: !canSendReminder || loading ? 'none' : 'auto' }}
          >
            {loadingType === 'invitation' ? (
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
                <FaCalendarPlus className="me-1" />
                {t('appointmentReminders.sendInvitation', 'Invitation')}
              </>
            )}
          </Button>
        </span>
      </OverlayTrigger>

      {/* Button 2: Send Reminder (simple email) */}
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`reminder-tooltip-${visit?.id}`}>{getTooltipMessage()}</Tooltip>}
      >
        <span className="d-inline-block">
          <Button
            variant="light"
            onClick={() => handleAction('reminder')}
            disabled={!canSendReminder || loading}
            style={{ pointerEvents: !canSendReminder || loading ? 'none' : 'auto' }}
          >
            {loadingType === 'reminder' ? (
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
                {t('appointmentReminders.sendReminder', 'Rappel')}
                {visit?.reminders_sent > 0 && ` (${visit.reminders_sent})`}
              </>
            )}
          </Button>
        </span>
      </OverlayTrigger>

      <ConfirmModal
        show={showConfirmModal}
        onHide={() => { setShowConfirmModal(false); setActionType(null); }}
        onConfirm={confirmAction}
        title={t('common.confirmation', 'Confirmation')}
        message={getConfirmMessage()}
        confirmLabel={getConfirmTitle()}
        variant={actionType === 'invitation' ? 'info' : 'secondary'}
      />
    </>
  );
};

export default SendReminderButton;
