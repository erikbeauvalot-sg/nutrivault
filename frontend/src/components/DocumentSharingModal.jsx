/**
 * DocumentSharingModal Component
 * Modal for creating and managing document share links
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Card, Badge, InputGroup, ListGroup, Accordion, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';
import ConfirmModal from './ConfirmModal';

const DocumentSharingModal = ({
  show,
  onHide,
  document,
  patients = [],
  onShareCreated
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [existingShares, setExistingShares] = useState([]);

  // Form state for new share
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [notes, setNotes] = useState('');

  // Copied link feedback
  const [copiedShareId, setCopiedShareId] = useState(null);

  // Confirm revoke modal state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [shareToRevoke, setShareToRevoke] = useState(null);

  // Load existing shares when modal opens
  useEffect(() => {
    if (show && document?.id) {
      loadExistingShares();
    }
  }, [show, document?.id]);

  const loadExistingShares = async () => {
    setSharesLoading(true);
    try {
      const response = await documentService.getSharesWithLogs(document.id);
      setExistingShares(response.data || []);
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setSharesLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedPatientId) {
      setError(t('documentSharing.selectPatient', 'Please select a patient'));
      return;
    }

    if (usePassword && (!password || password.length < 4)) {
      setError(t('documentSharing.passwordTooShort', 'Password must be at least 4 characters'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const options = {
        patient_id: selectedPatientId,
        notes: notes || null
      };

      if (expiresAt) {
        options.expires_at = new Date(expiresAt).toISOString();
      }

      if (usePassword && password) {
        options.password = password;
      }

      if (maxDownloads) {
        options.max_downloads = parseInt(maxDownloads, 10);
      }

      const response = await documentService.createShareLink(document.id, options);

      setSuccess(t('documentSharing.linkCreated', 'Share link created successfully'));

      // Reset form
      setSelectedPatientId('');
      setExpiresAt('');
      setUsePassword(false);
      setPassword('');
      setMaxDownloads('');
      setNotes('');

      // Reload shares
      await loadExistingShares();

      if (onShareCreated) {
        onShareCreated(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documentSharing.createError', 'Failed to create share link'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (shareId) => {
    setShareToRevoke(shareId);
    setShowRevokeConfirm(true);
  };

  const handleRevokeConfirm = async () => {
    if (!shareToRevoke) return;

    try {
      await documentService.revokeShareLink(shareToRevoke);
      await loadExistingShares();
      setSuccess(t('documentSharing.linkRevoked', 'Share link revoked'));
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documentSharing.revokeError', 'Failed to revoke share link'));
    } finally {
      setShareToRevoke(null);
    }
  };

  const handleCopyLink = async (shareUrl, shareId) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareId(shareId);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedShareId(shareId);
      setTimeout(() => setCopiedShareId(null), 2000);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(null);
      setSelectedPatientId('');
      setExpiresAt('');
      setUsePassword(false);
      setPassword('');
      setMaxDownloads('');
      setNotes('');
      onHide();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getShareStatus = (share) => {
    if (!share.is_active) return { variant: 'danger', text: t('documentSharing.revoked', 'Revoked') };
    if (share.is_expired) return { variant: 'warning', text: t('documentSharing.expired', 'Expired') };
    if (share.has_reached_limit) return { variant: 'secondary', text: t('documentSharing.limitReached', 'Limit Reached') };
    return { variant: 'success', text: t('documentSharing.active', 'Active') };
  };

  // Filter out shares with tokens (link shares) for display
  const linkShares = existingShares.filter(s => s.share_token);

  // Don't render if no document is selected
  if (!document) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('documentSharing.title', 'Share Document')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Document Info */}
        <Card className="mb-3 bg-light">
          <Card.Body className="py-2">
            <div className="d-flex align-items-center">
              <span className="me-2">{documentService.getFileTypeIcon(document.mime_type)}</span>
              <div>
                <strong>{document.file_name}</strong>
                <br />
                <small className="text-muted">
                  {documentService.formatFileSize(document.file_size || 0)}
                </small>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Create New Share Link */}
        <Card className="mb-3">
          <Card.Header>
            <h6 className="mb-0">{t('documentSharing.createNewLink', 'Create New Share Link')}</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('documentSharing.selectPatient', 'Select Patient')} *</Form.Label>
              <Form.Select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={loading}
              >
                <option value="">{t('documentSharing.choosePatient', '-- Choose a patient --')}</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                    {patient.email ? ` (${patient.email})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('documentSharing.expirationDate', 'Expiration Date')} ({t('common.optional')})</Form.Label>
              <Form.Control
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                {t('documentSharing.expirationHelp', 'Leave empty for no expiration')}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="use-password"
                label={t('documentSharing.passwordProtect', 'Password protect this link')}
                checked={usePassword}
                onChange={(e) => {
                  setUsePassword(e.target.checked);
                  if (!e.target.checked) setPassword('');
                }}
                disabled={loading}
              />
            </Form.Group>

            {usePassword && (
              <Form.Group className="mb-3">
                <Form.Label>{t('common.password')} *</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('documentSharing.enterPassword', 'Enter password (min 4 characters)')}
                  minLength={4}
                  disabled={loading}
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>{t('documentSharing.maxDownloads', 'Maximum Downloads')} ({t('common.optional')})</Form.Label>
              <Form.Control
                type="number"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder={t('documentSharing.unlimited', 'Unlimited')}
                min={1}
                max={1000}
                disabled={loading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('documentSharing.notes', 'Notes')} ({t('common.optional')})</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('documentSharing.notesPlaceholder', 'Add a note about this share...')}
                maxLength={500}
                disabled={loading}
              />
            </Form.Group>

            <Button
              variant="primary"
              onClick={handleCreateShare}
              disabled={loading || !selectedPatientId}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('documentSharing.creating', 'Creating...')}
                </>
              ) : (
                t('documentSharing.createLink', 'Create Share Link')
              )}
            </Button>
          </Card.Body>
        </Card>

        {/* Existing Shares */}
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">{t('documentSharing.existingLinks', 'Existing Share Links')}</h6>
            {sharesLoading && <Spinner animation="border" size="sm" />}
          </Card.Header>
          <Card.Body className="p-0">
            {linkShares.length === 0 ? (
              <div className="p-3 text-center text-muted">
                {t('documentSharing.noLinks', 'No share links created yet')}
              </div>
            ) : (
              <Accordion>
                {linkShares.map((share, index) => {
                  const status = getShareStatus(share);
                  return (
                    <Accordion.Item key={share.id} eventKey={index.toString()}>
                      <Accordion.Header>
                        <div className="d-flex align-items-center w-100 me-3">
                          <Badge bg={status.variant} className="me-2">{status.text}</Badge>
                          <span className="flex-grow-1">
                            {share.patient?.first_name} {share.patient?.last_name}
                          </span>
                          <small className="text-muted">
                            {t('documentSharing.downloads', 'Downloads')}: {share.download_count}
                            {share.max_downloads ? `/${share.max_downloads}` : ''}
                          </small>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <strong>{t('documentSharing.shareUrl', 'Share URL')}:</strong>
                          <InputGroup className="mt-1">
                            <Form.Control
                              type="text"
                              value={share.share_url || ''}
                              readOnly
                              className="bg-light"
                            />
                            <Button
                              variant={copiedShareId === share.id ? 'success' : 'outline-secondary'}
                              onClick={() => handleCopyLink(share.share_url, share.id)}
                            >
                              {copiedShareId === share.id
                                ? t('documentSharing.copied', 'Copied!')
                                : t('documentSharing.copy', 'Copy')
                              }
                            </Button>
                          </InputGroup>
                        </div>

                        <div className="row mb-3">
                          <div className="col-6">
                            <small className="text-muted">{t('documentSharing.createdAt', 'Created')}:</small>
                            <br />
                            {formatDate(share.sent_at)}
                          </div>
                          <div className="col-6">
                            <small className="text-muted">{t('documentSharing.expiresAt', 'Expires')}:</small>
                            <br />
                            {share.expires_at ? formatDate(share.expires_at) : t('documentSharing.never', 'Never')}
                          </div>
                        </div>

                        <div className="row mb-3">
                          <div className="col-6">
                            <small className="text-muted">{t('documentSharing.lastAccessed', 'Last Accessed')}:</small>
                            <br />
                            {share.last_accessed_at ? formatDate(share.last_accessed_at) : t('documentSharing.never', 'Never')}
                          </div>
                          <div className="col-6">
                            <small className="text-muted">{t('documentSharing.passwordProtected', 'Password Protected')}:</small>
                            <br />
                            {share.is_password_protected ? t('common.yes') : t('common.no')}
                          </div>
                        </div>

                        {share.notes && (
                          <div className="mb-3">
                            <small className="text-muted">{t('documentSharing.notes', 'Notes')}:</small>
                            <br />
                            {share.notes}
                          </div>
                        )}

                        {/* Access Logs */}
                        {share.accessLogs && share.accessLogs.length > 0 && (
                          <div className="mb-3">
                            <small className="text-muted">{t('documentSharing.recentActivity', 'Recent Activity')}:</small>
                            <ListGroup variant="flush" className="mt-1">
                              {share.accessLogs.slice(0, 5).map((log, logIndex) => (
                                <ListGroup.Item key={logIndex} className="py-1 px-0 border-0">
                                  <small>
                                    <Badge bg={log.success ? 'light' : 'danger'} text={log.success ? 'dark' : 'white'} className="me-1">
                                      {log.action}
                                    </Badge>
                                    {formatDate(log.created_at)}
                                    {log.ip_address && <span className="text-muted"> - {log.ip_address}</span>}
                                  </small>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </div>
                        )}

                        {share.is_active && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRevokeClick(share.id)}
                          >
                            {t('documentSharing.revokeLink', 'Revoke Link')}
                          </Button>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Card.Body>
        </Card>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {t('common.close')}
        </Button>
      </Modal.Footer>

      {/* Confirm Revoke Modal */}
      <ConfirmModal
        show={showRevokeConfirm}
        onHide={() => {
          setShowRevokeConfirm(false);
          setShareToRevoke(null);
        }}
        onConfirm={handleRevokeConfirm}
        title={t('documentSharing.revokeTitle', 'Revoke Share Link')}
        message={t('documentSharing.confirmRevoke', 'Are you sure you want to revoke this share link? The recipient will no longer be able to access the document.')}
        confirmLabel={t('documentSharing.revokeLink', 'Revoke Link')}
        variant="danger"
      />
    </Modal>
  );
};

export default DocumentSharingModal;
