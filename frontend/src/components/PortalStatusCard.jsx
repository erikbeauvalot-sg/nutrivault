/**
 * Portal Status Card Component
 * Displays portal status and management controls for a patient
 * Used in PatientDetailPage and EditPatientPage
 */

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as patientService from '../services/patientService';

const statusConfig = {
  not_activated: { variant: 'secondary', label: 'portal.statusNotActivated' },
  invitation_pending: { variant: 'warning', label: 'portal.statusInvitationPending' },
  active: { variant: 'success', label: 'portal.statusActive' },
  deactivated: { variant: 'danger', label: 'portal.statusDeactivated' }
};

const PortalStatusCard = ({ patientId, patientEmail }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await patientService.getPortalStatus(patientId);
      setStatus(data);
    } catch (err) {
      setError(t('portal.statusLoadError', 'Erreur lors du chargement du statut portail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchStatus();
    }
  }, [patientId]);

  const handleAction = async (action, successMsg) => {
    try {
      setActionLoading(true);
      setError('');
      const data = await action(patientId);
      setStatus(data);
      toast.success(successMsg);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.error || t('common.error', 'Erreur');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Header>🌐 {t('portal.portalAccess', 'Accès portail patient')}</Card.Header>
        <Card.Body className="text-center py-3">
          <Spinner size="sm" animation="border" />
        </Card.Body>
      </Card>
    );
  }

  const config = statusConfig[status?.status] || statusConfig.not_activated;

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>🌐 {t('portal.portalAccess', 'Accès portail patient')}</span>
        <Badge bg={config.variant}>
          {t(config.label, status?.status || 'Non activé')}
        </Badge>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* Not activated */}
        {status?.status === 'not_activated' && (
          <>
            <p className="text-muted mb-3">
              {patientEmail
                ? t('portal.canActivate', 'Le patient peut recevoir un accès au portail par email.')
                : t('portal.needsEmail', 'Le patient doit avoir une adresse email pour activer le portail.')}
            </p>
            {patientEmail && (
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction(
                  patientService.activatePortal,
                  t('portal.activationSuccess', 'Portail activé. Email d\'invitation envoyé.')
                )}
              >
                {actionLoading ? <Spinner size="sm" animation="border" /> : t('portal.activate', 'Activer le portail')}
              </Button>
            )}
          </>
        )}

        {/* Invitation pending */}
        {status?.status === 'invitation_pending' && (
          <>
            <p className="text-muted mb-2">
              {t('portal.invitationSent', 'Invitation envoyée.')}
              {status.invitation_expires_at && (
                <> {t('portal.expiresAt', 'Expire le')} {new Date(status.invitation_expires_at).toLocaleString('fr-FR')}</>
              )}
            </p>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction(
                  patientService.resendPortalInvitation,
                  t('portal.resendSuccess', 'Invitation renvoyée.')
                )}
              >
                {actionLoading ? <Spinner size="sm" animation="border" /> : t('portal.resend', 'Renvoyer l\'invitation')}
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction(
                  patientService.deactivatePortal,
                  t('portal.deactivated', 'Portail désactivé.')
                )}
              >
                {t('portal.deactivate', 'Désactiver')}
              </Button>
            </div>
          </>
        )}

        {/* Active */}
        {status?.status === 'active' && (
          <>
            <div className="mb-2">
              <small className="text-muted">
                {t('portal.activeSince', 'Actif depuis')} {status.activated_at ? new Date(status.activated_at).toLocaleDateString('fr-FR') : '—'}
              </small>
              {status.portal_user?.last_login && (
                <div>
                  <small className="text-muted">
                    {t('portal.lastLogin', 'Dernière connexion')} : {new Date(status.portal_user.last_login).toLocaleString('fr-FR')}
                  </small>
                </div>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-warning"
                size="sm"
                disabled={actionLoading}
                onClick={() => {
                  if (window.confirm(t('portal.resetPasswordConfirm', 'Envoyer un email de réinitialisation du mot de passe au patient ?'))) {
                    handleAction(
                      patientService.sendPortalPasswordReset,
                      t('portal.resetPasswordSuccess', 'Email de réinitialisation envoyé.')
                    );
                  }
                }}
              >
                {actionLoading ? <Spinner size="sm" animation="border" /> : t('portal.resetPassword', 'Réinitialiser le mot de passe')}
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleAction(
                  patientService.deactivatePortal,
                  t('portal.deactivated', 'Portail désactivé.')
                )}
              >
                {t('portal.deactivate', 'Désactiver le portail')}
              </Button>
            </div>
          </>
        )}

        {/* Deactivated */}
        {status?.status === 'deactivated' && (
          <>
            <p className="text-muted mb-3">
              {t('portal.deactivatedMsg', 'L\'accès portail a été désactivé. Le patient ne peut plus se connecter.')}
            </p>
            <Button
              variant="success"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleAction(
                patientService.reactivatePortal,
                t('portal.reactivated', 'Portail réactivé.')
              )}
            >
              {actionLoading ? <Spinner size="sm" animation="border" /> : t('portal.reactivate', 'Réactiver le portail')}
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default PortalStatusCard;
