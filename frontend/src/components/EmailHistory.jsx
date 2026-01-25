/**
 * Email History Component
 * Displays patient email communication history with filters
 */

import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaEye, FaFilter, FaSync, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import emailLogService from '../services/emailLogService';

// Email type configurations
const EMAIL_TYPES = {
  followup: { label: 'Suivi', labelEn: 'Follow-up', color: 'primary', icon: '📧' },
  invoice: { label: 'Facture', labelEn: 'Invoice', color: 'success', icon: '💰' },
  reminder: { label: 'Rappel RDV', labelEn: 'Reminder', color: 'warning', icon: '⏰' },
  payment_reminder: { label: 'Relance', labelEn: 'Payment', color: 'danger', icon: '💳' },
  welcome: { label: 'Bienvenue', labelEn: 'Welcome', color: 'info', icon: '👋' },
  other: { label: 'Autre', labelEn: 'Other', color: 'secondary', icon: '📄' }
};

const EmailHistory = ({ patientId }) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    email_type: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Preview modal
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    if (patientId) {
      fetchEmails();
      fetchStats();
    }
  }, [patientId, filters, page]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await emailLogService.getPatientEmailLogs(patientId, {
        ...filters,
        limit,
        offset: page * limit,
        sortBy: 'sent_at',
        sortOrder: 'DESC'
      });

      setEmails(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(t('emailHistory.fetchError', 'Failed to load email history'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await emailLogService.getPatientEmailStats(patientId);
      setStats(result.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      email_type: 'all',
      status: 'all',
      startDate: '',
      endDate: ''
    });
    setPage(0);
  };

  const handleViewEmail = async (email) => {
    try {
      setLoadingPreview(true);
      setShowPreview(true);

      // If we already have the body, use it
      if (email.body_html) {
        setSelectedEmail(email);
      } else {
        // Fetch full email details
        const result = await emailLogService.getEmailLog(email.id);
        setSelectedEmail(result.data);
      }
    } catch (err) {
      console.error('Error fetching email details:', err);
    } finally {
      setLoadingPreview(false);
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
   * Sanitize HTML content for safe rendering
   */
  const sanitizeHtml = (html) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'src', 'alt', 'width', 'height']
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <FaEnvelope className="me-2" />
          {t('emailHistory.title', 'Historique des communications')}
          {stats && <Badge bg="secondary" className="ms-2">{stats.total}</Badge>}
        </h5>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="me-1" />
            {t('common.filter', 'Filtrer')}
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchEmails}
            disabled={loading}
          >
            <FaSync className={loading ? 'fa-spin' : ''} />
          </Button>
        </div>
      </Card.Header>

      {/* Stats Summary */}
      {stats && stats.total > 0 && (
        <Card.Body className="py-2 border-bottom bg-light">
          <Row className="g-2">
            {Object.entries(EMAIL_TYPES).map(([type, config]) => {
              const typeStats = stats.byType[type];
              if (!typeStats || typeStats.total === 0) return null;

              return (
                <Col key={type} xs="auto">
                  <Badge
                    bg={filters.email_type === type ? config.color : 'light'}
                    text={filters.email_type === type ? 'white' : 'dark'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterChange('email_type', filters.email_type === type ? 'all' : type)}
                  >
                    {config.icon} {isEn ? config.labelEn : config.label}: {typeStats.total}
                  </Badge>
                </Col>
              );
            })}
          </Row>
        </Card.Body>
      )}

      {/* Filters */}
      {showFilters && (
        <Card.Body className="border-bottom bg-light py-3">
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label size="sm">{t('emailHistory.type', 'Type')}</Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.email_type}
                  onChange={(e) => handleFilterChange('email_type', e.target.value)}
                >
                  <option value="all">{t('common.all', 'Tous')}</option>
                  {Object.entries(EMAIL_TYPES).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.icon} {isEn ? config.labelEn : config.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label size="sm">{t('emailHistory.status', 'Statut')}</Form.Label>
                <Form.Select
                  size="sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">{t('common.all', 'Tous')}</option>
                  <option value="sent">{t('emailHistory.sent', 'Envoyé')}</option>
                  <option value="failed">{t('emailHistory.failed', 'Échec')}</option>
                  <option value="queued">{t('emailHistory.queued', 'En attente')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label size="sm">{t('common.startDate', 'Du')}</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label size="sm">{t('common.endDate', 'Au')}</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
                {t('common.reset', 'Réinitialiser')}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      )}

      <Card.Body className="p-0">
        {error && (
          <Alert variant="danger" className="m-3">{error}</Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaEnvelope size={40} className="mb-3 opacity-50" />
            <p>{t('emailHistory.noEmails', 'Aucune communication trouvée')}</p>
          </div>
        ) : (
          <>
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>{t('emailHistory.date', 'Date')}</th>
                  <th style={{ width: '100px' }}>{t('emailHistory.type', 'Type')}</th>
                  <th>{t('emailHistory.subject', 'Objet')}</th>
                  <th style={{ width: '100px' }}>{t('emailHistory.status', 'Statut')}</th>
                  <th style={{ width: '150px' }}>{t('emailHistory.sentBy', 'Envoyé par')}</th>
                  <th style={{ width: '80px' }}></th>
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
                        <span className="text-truncate d-inline-block" style={{ maxWidth: '300px' }}>
                          {email.subject}
                        </span>
                      </td>
                      <td>{getStatusBadge(email.status)}</td>
                      <td className="text-muted small">
                        {email.sender
                          ? `${email.sender.first_name} ${email.sender.last_name}`
                          : '-'}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewEmail(email)}
                          title={t('emailHistory.view', 'Voir')}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center p-3 border-top">
                <small className="text-muted">
                  {t('emailHistory.showing', 'Affichage')} {page * limit + 1} - {Math.min((page + 1) * limit, total)} {t('emailHistory.of', 'sur')} {total}
                </small>
                <div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t('common.previous', 'Précédent')}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t('common.next', 'Suivant')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card.Body>

      {/* Email Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEnvelope className="me-2" />
            {selectedEmail?.subject || t('emailHistory.emailPreview', 'Aperçu de l\'email')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingPreview ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : selectedEmail ? (
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
                    {t('emailHistory.noContentOldEmail', 'Le contenu de cet email n\'a pas été enregistré. Les nouveaux emails envoyés seront visibles ici.')}
                  </p>
                </Alert>
              )}

              {selectedEmail.error_message && (
                <Alert variant="danger" className="mt-3">
                  <strong>{t('emailHistory.error', 'Erreur')}:</strong> {selectedEmail.error_message}
                </Alert>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            {t('common.close', 'Fermer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default EmailHistory;
