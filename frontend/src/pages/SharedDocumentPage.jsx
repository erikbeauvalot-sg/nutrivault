/**
 * SharedDocumentPage Component
 * Public page for accessing shared documents via share link
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as publicDocService from '../services/publicDocumentService';

const SharedDocumentPage = () => {
  const { token } = useParams();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState(null);
  const [error, setError] = useState(null);

  // Password state
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);

  // Load share info on mount
  useEffect(() => {
    loadShareInfo();
  }, [token]);

  const loadShareInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await publicDocService.getShareInfo(token);

      if (!data) {
        setError(t('sharedDocument.linkNotFound', 'This share link was not found or has been removed.'));
        return;
      }

      setShareInfo(data);
      setPasswordRequired(data.is_password_protected && !passwordVerified);

      if (!data.is_accessible) {
        if (!data.is_active) {
          setError(t('sharedDocument.linkRevoked', 'This share link has been revoked.'));
        } else if (data.is_expired) {
          setError(t('sharedDocument.linkExpired', 'This share link has expired.'));
        } else if (data.has_reached_limit) {
          setError(t('sharedDocument.limitReached', 'This share link has reached its download limit.'));
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError(t('sharedDocument.linkNotFound', 'This share link was not found or has been removed.'));
      } else {
        setError(err.response?.data?.error || err.message || t('sharedDocument.loadError', 'Failed to load document information.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();

    if (!password) {
      setPasswordError(t('sharedDocument.enterPassword', 'Please enter the password.'));
      return;
    }

    setVerifyingPassword(true);
    setPasswordError(null);

    try {
      await publicDocService.verifyPassword(token, password);
      setPasswordVerified(true);
      setPasswordRequired(false);
    } catch (err) {
      if (err.response?.status === 429) {
        setPasswordError(t('sharedDocument.tooManyAttempts', 'Too many attempts. Please try again later.'));
      } else if (err.response?.status === 401) {
        setPasswordError(t('sharedDocument.wrongPassword', 'Incorrect password. Please try again.'));
      } else {
        setPasswordError(err.response?.data?.error || t('sharedDocument.verifyError', 'Failed to verify password.'));
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);

    try {
      const blob = await publicDocService.downloadDocument(
        token,
        shareInfo?.is_password_protected ? password : null
      );
      publicDocService.triggerFileDownload(blob, shareInfo?.document?.file_name || 'document');

      // Refresh share info to update download count
      await loadShareInfo();
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordRequired(true);
        setPasswordVerified(false);
        setPasswordError(t('sharedDocument.passwordExpired', 'Please re-enter the password.'));
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.error || t('sharedDocument.accessDenied', 'Access denied.'));
      } else {
        setError(err.response?.data?.error || t('sharedDocument.downloadError', 'Failed to download document.'));
      }
    } finally {
      setDownloading(false);
    }
  };

  const getPreviewUrl = () => {
    return publicDocService.getPreviewUrl(
      token,
      shareInfo?.is_password_protected && passwordVerified ? password : null
    );
  };

  const canPreview = () => {
    return publicDocService.canPreviewFile(shareInfo?.document?.mime_type);
  };

  const formatFileSize = (bytes) => {
    return publicDocService.formatFileSize(bytes || 0);
  };

  const getFileIcon = () => {
    const iconName = publicDocService.getFileTypeIcon(shareInfo?.document?.mime_type);
    const iconMap = {
      'file-image': '🖼️',
      'file-pdf': '📄',
      'file-word': '📝',
      'file-text': '📃',
      'file': '📎'
    };
    return iconMap[iconName] || '📎';
  };

  // Loading state
  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p>{t('sharedDocument.loading', 'Loading document...')}</p>
        </div>
      </Container>
    );
  }

  // Error state or share not found
  if (error || !shareInfo) {
    return (
      <Container className="py-5" style={{ maxWidth: '600px' }}>
        <Card className="text-center">
          <Card.Body className="py-5">
            <div className="mb-4" style={{ fontSize: '4rem' }}>🔒</div>
            <h4 className="mb-3">{t('sharedDocument.unavailable', 'Document Unavailable')}</h4>
            <Alert variant="warning" className="mb-0">
              {error || t('sharedDocument.linkNotFound', 'This share link was not found or has been removed.')}
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Password prompt
  if (passwordRequired && !passwordVerified) {
    return (
      <Container className="py-5" style={{ maxWidth: '500px' }}>
        <Card>
          <Card.Body className="py-4">
            <div className="text-center mb-4">
              <div style={{ fontSize: '3rem' }} className="mb-2">🔐</div>
              <h4>{t('sharedDocument.passwordRequired', 'Password Required')}</h4>
              <p className="text-muted">
                {t('sharedDocument.passwordPrompt', 'This document is password protected. Please enter the password to access it.')}
              </p>
            </div>

            {/* Document preview info */}
            {shareInfo?.document && (
              <Card className="mb-4 bg-light">
                <Card.Body className="py-2">
                  <div className="d-flex align-items-center">
                    <span className="me-3" style={{ fontSize: '2rem' }}>{getFileIcon()}</span>
                    <div>
                      <strong>{shareInfo.document.file_name}</strong>
                      <br />
                      <small className="text-muted">
                        {formatFileSize(shareInfo.document.file_size)}
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            <Form onSubmit={handleVerifyPassword}>
              {passwordError && (
                <Alert variant="danger" className="mb-3">
                  {passwordError}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>{t('common.password')}</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('sharedDocument.enterPasswordPlaceholder', 'Enter password')}
                  autoFocus
                  disabled={verifyingPassword}
                />
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                className="w-100"
                disabled={verifyingPassword || !password}
              >
                {verifyingPassword ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('sharedDocument.verifying', 'Verifying...')}
                  </>
                ) : (
                  t('sharedDocument.unlock', 'Unlock Document')
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Main document view
  return (
    <Container className="py-5" style={{ maxWidth: '800px' }}>
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center">
              <span className="me-3" style={{ fontSize: '3rem' }}>{getFileIcon()}</span>
              <div>
                <h4 className="mb-1">{shareInfo?.document?.file_name}</h4>
                <div className="text-muted">
                  <span>{formatFileSize(shareInfo?.document?.file_size)}</span>
                  {shareInfo?.document?.description && (
                    <span className="ms-2">• {shareInfo.document.description}</span>
                  )}
                </div>
              </div>
            </div>
            {shareInfo?.is_password_protected && passwordVerified && (
              <Badge bg="success">
                {t('sharedDocument.unlocked', 'Unlocked')}
              </Badge>
            )}
          </div>
        </Card.Header>

        <Card.Body>
          {/* Shared with info */}
          {shareInfo?.patient && (
            <div className="mb-4 p-3 bg-light rounded">
              <small className="text-muted">{t('sharedDocument.sharedWith', 'Shared with')}:</small>
              <div className="fw-bold">
                {shareInfo.patient.first_name} {shareInfo.patient.last_name}
              </div>
            </div>
          )}

          {/* Download info */}
          <div className="row mb-4">
            {shareInfo?.expires_at && (
              <div className="col-6">
                <small className="text-muted">{t('sharedDocument.expiresAt', 'Expires')}:</small>
                <div>{new Date(shareInfo.expires_at).toLocaleDateString(i18n.language)}</div>
              </div>
            )}
            {shareInfo?.max_downloads && (
              <div className="col-6">
                <small className="text-muted">{t('sharedDocument.downloadsRemaining', 'Downloads remaining')}:</small>
                <div>{shareInfo.max_downloads - shareInfo.download_count}</div>
              </div>
            )}
          </div>

          {/* Preview for images and PDFs */}
          {canPreview() && passwordVerified && (
            <div className="mb-4">
              <div className="border rounded overflow-hidden" style={{ maxHeight: '500px' }}>
                {shareInfo?.document?.mime_type === 'application/pdf' ? (
                  <iframe
                    src={getPreviewUrl()}
                    title={shareInfo?.document?.file_name}
                    width="100%"
                    height="500"
                    style={{ border: 'none' }}
                  />
                ) : shareInfo?.document?.mime_type?.startsWith('image/') ? (
                  <img
                    src={getPreviewUrl()}
                    alt={shareInfo?.document?.file_name}
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                    className="d-block mx-auto"
                  />
                ) : null}
              </div>
            </div>
          )}

          {/* Preview placeholder for password-protected files before unlock */}
          {canPreview() && shareInfo?.is_password_protected && !passwordVerified && (
            <div className="mb-4 p-5 bg-light rounded text-center">
              <div style={{ fontSize: '3rem' }} className="mb-2">🔒</div>
              <p className="text-muted mb-0">
                {t('sharedDocument.previewLocked', 'Preview available after password verification')}
              </p>
            </div>
          )}

          {/* Download button */}
          <div className="d-grid">
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownload}
              disabled={downloading || !shareInfo?.is_accessible}
            >
              {downloading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('sharedDocument.downloading', 'Downloading...')}
                </>
              ) : (
                <>
                  {t('common.download')} {shareInfo?.document?.file_name}
                </>
              )}
            </Button>
          </div>
        </Card.Body>

        <Card.Footer className="bg-white text-center py-3">
          <small className="text-muted">
            {t('sharedDocument.poweredBy', 'Powered by NutriVault')}
          </small>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default SharedDocumentPage;
