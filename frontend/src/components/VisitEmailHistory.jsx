/**
 * Visit Email History Component
 * Displays email communications related to a specific visit
 * Note: Uses DOMPurify for HTML sanitization to prevent XSS attacks
 */

import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Alert, Modal, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaCheckCircle, FaTimesCircle, FaClock, FaEye } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { useIsMobile } from '../hooks';
import ActionButton from './ActionButton';

// Email type configurations
const EMAIL_TYPES = {
  followup: { label: 'Suivi', labelEn: 'Follow-up', color: 'primary', icon: '📧' },
  invoice: { label: 'Facture', labelEn: 'Invoice', color: 'success', icon: '💰' },
  reminder: { label: 'Rappel RDV', labelEn: 'Reminder', color: 'warning', icon: '⏰' },
  payment_reminder: { label: 'Relance', labelEn: 'Payment', color: 'danger', icon: '💳' },
  welcome: { label: 'Bienvenue', labelEn: 'Welcome', color: 'info', icon: '👋' },
  other: { label: 'Autre', labelEn: 'Other', color: 'secondary', icon: '📄' }
};

const VisitEmailHistory = ({ visitId, refreshKey = 0 }) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const isMobile = useIsMobile();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Preview modal
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (visitId) {
      fetchEmails();
    }
  }, [visitId, refreshKey]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/visits/${visitId}/email-logs`);
      setEmails(response.data?.data || []);
    } catch (err) {
      setError(t('emailHistory.fetchError', 'Failed to load email history'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmailTypeConfig = (type) => {
    return EMAIL_TYPES[type] || EMAIL_TYPES.other;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge bg="success"><FaCheckCircle className="me-1" />{t('emailHistory.sent', 'Envoyé')}</Badge>;
      case 'failed':
        return <Badge bg="danger"><FaTimesCircle className="me-1" />{t('emailHistory.failed', 'Échec')}</Badge>;
      case 'queued':
        return <Badge bg="warning"><FaClock className="me-1" />{t('emailHistory.queued', 'En attente')}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  /**
   * Sanitize HTML content using DOMPurify to prevent XSS attacks
   */
  const sanitizeHtml = (html) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'src', 'alt', 'width', 'height']
    });
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header className="bg-info text-white">
          <h6 className="mb-0">
            <FaEnvelope className="me-2" />
            {t('emailHistory.visitCommunications', 'Communications de cette visite')}
            <Badge bg="light" text="dark" className="ms-2">{emails.length}</Badge>
          </h6>
        </Card.Header>
        <Card.Body className="p-0">
          {error && (
            <Alert variant="danger" className="m-3">{error}</Alert>
          )}

          {emails.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaEnvelope size={30} className="mb-2 opacity-50" />
              <p className="mb-0">{t('emailHistory.noVisitEmails', 'Aucune communication pour cette visite')}</p>
            </div>
          ) : isMobile ? (
            /* Mobile Card View */
            <div className="p-2">
              {emails.map((email) => {
                const typeConfig = getEmailTypeConfig(email.email_type);
                return (
                  <Card
                    key={email.id}
                    className="mb-2 email-card"
                    onClick={() => {
                      setSelectedEmail(email);
                      setShowPreview(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg={typeConfig.color}>
                          {typeConfig.icon} {isEn ? typeConfig.labelEn : typeConfig.label}
                        </Badge>
                        {getStatusBadge(email.status)}
                      </div>
                      <div className="fw-medium mb-1" style={{ fontSize: '0.9rem' }}>
                        {email.subject}
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">{formatDate(email.sent_at)}</small>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmail(email);
                            setShowPreview(true);
                          }}
                        >
                          <FaEye className="me-1" />
                          {t('emailHistory.view', 'Voir')}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Desktop Table View */
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>{t('emailHistory.date', 'Date')}</th>
                  <th>{t('emailHistory.type', 'Type')}</th>
                  <th>{t('emailHistory.subject', 'Objet')}</th>
                  <th>{t('emailHistory.status', 'Statut')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => {
                  const typeConfig = getEmailTypeConfig(email.email_type);
                  return (
                    <tr key={email.id}>
                      <td className="text-muted small">{formatDate(email.sent_at)}</td>
                      <td>
                        <Badge bg={typeConfig.color}>
                          {typeConfig.icon} {isEn ? typeConfig.labelEn : typeConfig.label}
                        </Badge>
                      </td>
                      <td>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                          {email.subject}
                        </span>
                      </td>
                      <td>{getStatusBadge(email.status)}</td>
                      <td>
                        <ActionButton
                          action="preview"
                          onClick={() => {
                            setSelectedEmail(email);
                            setShowPreview(true);
                          }}
                          title={t('emailHistory.view', 'Voir')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Email Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEnvelope className="me-2" />
            {selectedEmail?.subject || t('emailHistory.emailPreview', 'Aperçu de l\'email')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmail && (
            <>
              <div className="mb-3 pb-3 border-bottom">
                <Row>
                  <Col sm={3}><strong>{t('emailHistory.to', 'À')}:</strong></Col>
                  <Col sm={9}>{selectedEmail.sent_to}</Col>
                </Row>
                <Row className="mt-2">
                  <Col sm={3}><strong>{t('emailHistory.date', 'Date')}:</strong></Col>
                  <Col sm={9}>{formatDate(selectedEmail.sent_at)}</Col>
                </Row>
                <Row className="mt-2">
                  <Col sm={3}><strong>{t('emailHistory.type', 'Type')}:</strong></Col>
                  <Col sm={9}>
                    <Badge bg={getEmailTypeConfig(selectedEmail.email_type).color}>
                      {getEmailTypeConfig(selectedEmail.email_type).icon}{' '}
                      {isEn
                        ? getEmailTypeConfig(selectedEmail.email_type).labelEn
                        : getEmailTypeConfig(selectedEmail.email_type).label}
                    </Badge>
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col sm={3}><strong>{t('emailHistory.status', 'Statut')}:</strong></Col>
                  <Col sm={9}>{getStatusBadge(selectedEmail.status)}</Col>
                </Row>
              </div>

              {selectedEmail.body_html ? (
                <div
                  className="email-preview-content p-3 bg-light rounded"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.body_html) }}
                />
              ) : (
                <Alert variant="info" className="text-center">
                  <FaEnvelope className="mb-2" size={24} />
                  <p className="mb-0">
                    {t('emailHistory.noContentOldEmail', 'Le contenu de cet email n\'a pas été enregistré.')}
                  </p>
                </Alert>
              )}

              {selectedEmail.error_message && (
                <Alert variant="danger" className="mt-3">
                  <strong>{t('emailHistory.error', 'Erreur')}:</strong> {selectedEmail.error_message}
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            {t('common.close', 'Fermer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default VisitEmailHistory;
