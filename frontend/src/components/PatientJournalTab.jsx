/**
 * PatientJournalTab Component
 * Dietitian view of a patient's journal entries (excludes private)
 * Allows adding/deleting comments
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Form, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as patientService from '../services/patientService';

const MOOD_EMOJIS = {
  very_bad: '\uD83D\uDE2B',
  bad: '\uD83D\uDE1F',
  neutral: '\uD83D\uDE10',
  good: '\uD83D\uDE42',
  very_good: '\uD83D\uDE04',
};

const TYPE_ICONS = {
  food: '\uD83C\uDF7D\uFE0F',
  symptom: '\uD83E\uDE7A',
  mood: '\uD83D\uDCAD',
  activity: '\uD83C\uDFC3',
  note: '\uD83D\uDCDD',
  other: '\uD83D\uDCCE',
};

const ENTRY_TYPES = ['food', 'symptom', 'mood', 'activity', 'note', 'other'];
const MOOD_OPTIONS = ['very_bad', 'bad', 'neutral', 'good', 'very_good'];

const PatientJournalTab = ({ patientId }) => {
  const { t } = useTranslation();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Comment state per entry
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(null);

  const loadEntries = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filterType) params.entry_type = filterType;
      if (filterMood) params.mood = filterMood;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const result = await patientService.getPatientJournal(patientId, params);
      setEntries(result.data || []);
      setPagination(result.pagination || null);
    } catch {
      setError(t('journal.loadError', 'Erreur lors du chargement du journal'));
    } finally {
      setLoading(false);
    }
  }, [patientId, page, filterType, filterMood, filterStartDate, filterEndDate, t]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAddComment = async (entryId) => {
    const text = commentTexts[entryId]?.trim();
    if (!text) return;

    setSubmittingComment(entryId);
    try {
      await patientService.addJournalComment(patientId, entryId, { content: text });
      setCommentTexts(prev => ({ ...prev, [entryId]: '' }));
      toast.success(t('journal.commentAdded', 'Commentaire ajoute'));
      loadEntries();
    } catch {
      toast.error(t('journal.commentError', 'Erreur lors de l\'ajout du commentaire'));
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await patientService.deleteJournalComment(patientId, commentId);
      toast.success(t('journal.commentDeleted', 'Commentaire supprime'));
      loadEntries();
    } catch {
      toast.error(t('journal.commentDeleteError', 'Erreur lors de la suppression'));
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterMood('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const hasActiveFilters = filterType || filterMood || filterStartDate || filterEndDate;

  if (loading && entries.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">{t('common.loading', 'Chargement...')}</p>
      </div>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{'\uD83D\uDCD3'} {t('journal.tab', 'Journal de suivi')}</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* Filters */}
        <Row className="g-2 mb-3 align-items-end">
          <Col xs={6} md={3}>
            <Form.Label className="small mb-1">{t('portal.journal.entryType', 'Type')}</Form.Label>
            <Form.Select size="sm" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">{t('common.all', 'Tous')}</option>
              {ENTRY_TYPES.map(type => (
                <option key={type} value={type}>{TYPE_ICONS[type]} {t(`portal.journal.type.${type}`, type)}</option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Label className="small mb-1">{t('portal.journal.moodLabel', 'Humeur')}</Form.Label>
            <Form.Select size="sm" value={filterMood} onChange={(e) => { setFilterMood(e.target.value); setPage(1); }}>
              <option value="">{t('common.all', 'Toutes')}</option>
              {MOOD_OPTIONS.map(m => (
                <option key={m} value={m}>{MOOD_EMOJIS[m]} {t(`portal.journal.mood.${m}`, m)}</option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Label className="small mb-1">{t('common.startDate', 'Du')}</Form.Label>
            <Form.Control size="sm" type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} />
          </Col>
          <Col xs={6} md={3}>
            <Form.Label className="small mb-1">{t('common.endDate', 'Au')}</Form.Label>
            <Form.Control size="sm" type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} />
          </Col>
          <Col xs={12} md={1}>
            {hasActiveFilters && (
              <Button size="sm" variant="outline-secondary" onClick={clearFilters} className="w-100">
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '3rem' }}>{'\uD83D\uDCD3'}</div>
            <h6>{t('journal.noEntries', 'Aucune entree dans le journal de ce patient')}</h6>
            <p className="small">{t('journal.noEntriesHint', 'Le patient n\'a pas encore ecrit dans son journal, ou toutes les entrees sont privees.')}</p>
          </div>
        ) : (
          entries.map(entry => {
            const entryTags = entry.tags || [];

            return (
              <Card key={entry.id} className="mb-3">
                <Card.Body>
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <Badge bg="light" text="dark" className="px-2 py-1">
                        {TYPE_ICONS[entry.entry_type] || '\uD83D\uDCDD'} {t(`portal.journal.type.${entry.entry_type}`, entry.entry_type)}
                      </Badge>
                      <small className="text-muted">
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </small>
                    </div>
                  </div>

                  {/* Title */}
                  {entry.title && <h6 className="mb-2">{entry.title}</h6>}

                  {/* Content */}
                  <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</p>

                  {/* Mood + Energy + Tags */}
                  <div className="d-flex gap-3 align-items-center flex-wrap mb-2">
                    {entry.mood && MOOD_EMOJIS[entry.mood] && (
                      <span title={t(`portal.journal.mood.${entry.mood}`, entry.mood)} style={{ fontSize: '1.3rem' }}>
                        {MOOD_EMOJIS[entry.mood]}
                      </span>
                    )}
                    {entry.energy_level && (
                      <span className="text-muted">{'⚡'} {entry.energy_level}/5</span>
                    )}
                    {entryTags.length > 0 && entryTags.map(tag => (
                      <Badge key={tag} bg="light" text="dark" className="px-2 py-1">#{tag}</Badge>
                    ))}
                  </div>

                  {/* Existing Comments */}
                  {entry.comments && entry.comments.length > 0 && (
                    <div className="mt-2 pt-2 border-top">
                      <small className="text-muted fw-bold d-block mb-2">
                        {'\uD83D\uDCAC'} {t('portal.journal.comments', 'Commentaires')} ({entry.comments.length})
                      </small>
                      {entry.comments.map(comment => (
                        <div key={comment.id} className="mb-2 ps-3 d-flex justify-content-between align-items-start" style={{ borderLeft: '3px solid #0d6efd' }}>
                          <div>
                            <small className="fw-bold">
                              {comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : '—'}
                            </small>
                            <small className="text-muted ms-2">
                              {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                            </small>
                            <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="link"
                            className="text-danger p-0 ms-2"
                            onClick={() => handleDeleteComment(comment.id)}
                            title={t('common.delete', 'Supprimer')}
                          >
                            &times;
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Form */}
                  <div className="mt-3 pt-2 border-top">
                    <div className="d-flex gap-2">
                      <Form.Control
                        as="textarea"
                        rows={1}
                        size="sm"
                        placeholder={t('journal.addComment', 'Ajouter un commentaire...')}
                        value={commentTexts[entry.id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [entry.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(entry.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAddComment(entry.id)}
                        disabled={submittingComment === entry.id || !commentTexts[entry.id]?.trim()}
                      >
                        {submittingComment === entry.id ? <Spinner animation="border" size="sm" /> : t('common.save', 'Envoyer')}
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline-primary"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              {t('common.previous', 'Precedent')}
            </Button>
            <span className="align-self-center text-muted">
              {page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline-primary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              {t('common.next', 'Suivant')}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PatientJournalTab;
