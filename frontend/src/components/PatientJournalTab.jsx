/**
 * PatientJournalTab Component
 * Dietitian view of a patient's journal entries (excludes private)
 * Allows adding/deleting comments and photos on own entries
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Form, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import * as patientService from '../services/patientService';

const MAX_PHOTOS = 5;

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
  const { user } = useAuth();

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

  // New entry form
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({ content: '', title: '', entry_type: 'note', entry_date: new Date().toISOString().split('T')[0] });
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [newEntryPhotos, setNewEntryPhotos] = useState([]);

  // Edit state
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editData, setEditData] = useState({ content: '', title: '', entry_type: 'note', entry_date: '' });
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  // Photo upload state per entry
  const [uploadingPhotoEntryId, setUploadingPhotoEntryId] = useState(null);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Dropzone for new entry form
  const newEntryDropzone = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/gif': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    disabled: newEntryPhotos.length >= MAX_PHOTOS,
    onDrop: (accepted) => {
      const remaining = MAX_PHOTOS - newEntryPhotos.length;
      if (remaining <= 0) return;
      const toAdd = accepted.slice(0, remaining).map(f => Object.assign(f, { preview: URL.createObjectURL(f) }));
      setNewEntryPhotos(prev => [...prev, ...toAdd]);
    }
  });

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

  // Cleanup new entry photo previews
  useEffect(() => {
    return () => { newEntryPhotos.forEach(f => URL.revokeObjectURL(f.preview)); };
  }, [newEntryPhotos]);

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

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEditData({
      content: entry.content || '',
      title: entry.title || '',
      entry_type: entry.entry_type || 'note',
      entry_date: entry.entry_date || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.content.trim()) return;
    try {
      await patientService.updatePatientJournalEntry(patientId, editingEntryId, {
        content: editData.content.trim(),
        title: editData.title.trim() || undefined,
        entry_type: editData.entry_type,
        entry_date: editData.entry_date
      });
      toast.success(t('journal.entryUpdated', 'Note modifiee'));
      setEditingEntryId(null);
      loadEntries();
    } catch {
      toast.error(t('journal.entryUpdateError', 'Erreur lors de la modification'));
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return;
    try {
      await patientService.deletePatientJournalEntry(patientId, deleteEntryId);
      toast.success(t('journal.entryDeleted', 'Note supprimee'));
      setDeleteEntryId(null);
      loadEntries();
    } catch {
      toast.error(t('journal.entryDeleteError', 'Erreur lors de la suppression'));
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntry.content.trim()) return;
    setSubmittingEntry(true);
    try {
      const created = await patientService.createPatientJournalEntry(patientId, {
        content: newEntry.content.trim(),
        title: newEntry.title.trim() || undefined,
        entry_type: newEntry.entry_type,
        entry_date: newEntry.entry_date
      });

      // Upload photos for the new entry
      if (newEntryPhotos.length > 0 && created.id) {
        try {
          await patientService.uploadJournalPhotos(patientId, created.id, newEntryPhotos);
        } catch {
          toast.error(t('journal.photoUploadError', 'Erreur lors de l\'upload des photos'));
        }
      }

      toast.success(t('journal.entryAdded', 'Note ajoutee au journal'));
      setNewEntry({ content: '', title: '', entry_type: 'note', entry_date: new Date().toISOString().split('T')[0] });
      newEntryPhotos.forEach(f => URL.revokeObjectURL(f.preview));
      setNewEntryPhotos([]);
      setShowNewEntry(false);
      loadEntries();
    } catch {
      toast.error(t('journal.entryError', 'Erreur lors de l\'ajout de la note'));
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleUploadPhotosToEntry = async (entryId, files) => {
    if (!files || files.length === 0) return;
    setUploadingPhotoEntryId(entryId);
    try {
      await patientService.uploadJournalPhotos(patientId, entryId, Array.from(files));
      toast.success(t('journal.photoUploading', 'Photos ajoutees'));
      loadEntries();
    } catch (err) {
      toast.error(err?.response?.data?.error || t('journal.photoUploadError', 'Erreur lors de l\'upload'));
    } finally {
      setUploadingPhotoEntryId(null);
    }
  };

  const handleDeletePhoto = async (entryId, photoId) => {
    try {
      await patientService.deleteJournalPhoto(patientId, entryId, photoId);
      toast.success(t('journal.photoDeleted', 'Photo supprimee'));
      loadEntries();
    } catch {
      toast.error(t('journal.photoUploadError', 'Erreur lors de la suppression'));
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
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{'\uD83D\uDCD3'} {t('journal.tab', 'Journal de suivi')}</h5>
        <Button size="sm" variant={showNewEntry ? 'outline-secondary' : 'primary'} onClick={() => setShowNewEntry(!showNewEntry)}>
          {showNewEntry ? t('common.cancel', 'Annuler') : `+ ${t('journal.addNote', 'Ajouter une note')}`}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* New Entry Form */}
        {showNewEntry && (
          <Card className="mb-3 border-primary">
            <Card.Body>
              <h6 className="mb-3">{'\uD83D\uDCDD'} {t('journal.newNote', 'Nouvelle note dieteticien')}</h6>
              <Row className="g-2 mb-2">
                <Col xs={12} md={4}>
                  <Form.Label className="small mb-1">{t('common.date', 'Date')}</Form.Label>
                  <Form.Control
                    size="sm"
                    type="date"
                    value={newEntry.entry_date}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, entry_date: e.target.value }))}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="small mb-1">{t('portal.journal.entryType', 'Type')}</Form.Label>
                  <Form.Select
                    size="sm"
                    value={newEntry.entry_type}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, entry_type: e.target.value }))}
                  >
                    {ENTRY_TYPES.map(type => (
                      <option key={type} value={type}>{TYPE_ICONS[type]} {t(`portal.journal.type.${type}`, type)}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label className="small mb-1">{t('journal.noteTitle', 'Titre (optionnel)')}</Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder={t('journal.noteTitlePlaceholder', 'Ex: Bilan de la semaine')}
                    value={newEntry.title}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                  />
                </Col>
              </Row>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder={t('journal.noteContentPlaceholder', 'Ecrivez votre note pour le patient...')}
                value={newEntry.content}
                onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                className="mb-2"
              />

              {/* Photos for new entry */}
              <div
                {...newEntryDropzone.getRootProps()}
                style={{
                  border: '2px dashed',
                  borderColor: newEntryDropzone.isDragActive ? '#0d6efd' : '#adb5bd',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: newEntryPhotos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer',
                  opacity: newEntryPhotos.length >= MAX_PHOTOS ? 0.5 : 1,
                  marginBottom: '8px'
                }}
              >
                <input {...newEntryDropzone.getInputProps()} />
                <small className="text-muted">
                  {'\uD83D\uDCF7'} {t('journal.addPhotos', 'Cliquez ou deposez des photos ici (JPEG, PNG, GIF)')} ({newEntryPhotos.length}/{MAX_PHOTOS})
                </small>
              </div>
              {newEntryPhotos.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {newEntryPhotos.map((file, idx) => (
                    <div key={`new-${idx}`} style={{ position: 'relative' }}>
                      <img src={file.preview} alt={file.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px dashed #0d6efd', opacity: 0.8 }} />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(file.preview);
                          setNewEntryPhotos(prev => prev.filter((_, i) => i !== idx));
                        }}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: '11px', lineHeight: '16px', padding: 0, cursor: 'pointer' }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateEntry}
                  disabled={submittingEntry || !newEntry.content.trim()}
                >
                  {submittingEntry ? <Spinner animation="border" size="sm" /> : t('journal.saveNote', 'Enregistrer la note')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

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
            const entryPhotos = entry.photos || [];
            const isOwn = entry.created_by_user_id === user?.id;

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
                      {entry.createdBy && (
                        <Badge bg="info" className="px-2 py-1">
                          {'\uD83E\uDE7A'} {entry.createdBy.first_name} {entry.createdBy.last_name}
                        </Badge>
                      )}
                    </div>
                    {/* Edit/Delete buttons for own entries */}
                    {isOwn && editingEntryId !== entry.id && (
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-secondary" onClick={() => handleEditEntry(entry)} title={t('common.edit', 'Modifier')}>
                          {'\u270F\uFE0F'}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleteEntryId(entry.id)} title={t('common.delete', 'Supprimer')}>
                          &times;
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Inline Edit Form */}
                  {editingEntryId === entry.id ? (
                    <div className="mb-2">
                      <Row className="g-2 mb-2">
                        <Col xs={12} md={4}>
                          <Form.Control size="sm" type="date" value={editData.entry_date} onChange={(e) => setEditData(prev => ({ ...prev, entry_date: e.target.value }))} />
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Select size="sm" value={editData.entry_type} onChange={(e) => setEditData(prev => ({ ...prev, entry_type: e.target.value }))}>
                            {ENTRY_TYPES.map(type => (
                              <option key={type} value={type}>{TYPE_ICONS[type]} {t(`portal.journal.type.${type}`, type)}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Control size="sm" type="text" placeholder={t('journal.noteTitle', 'Titre (optionnel)')} value={editData.title} onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))} />
                        </Col>
                      </Row>
                      <Form.Control as="textarea" rows={3} value={editData.content} onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))} className="mb-2" />
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-secondary" onClick={() => setEditingEntryId(null)}>{t('common.cancel', 'Annuler')}</Button>
                        <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={!editData.content.trim()}>{t('common.save', 'Enregistrer')}</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Title */}
                      {entry.title && <h6 className="mb-2">{entry.title}</h6>}

                      {/* Content */}
                      <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</p>
                    </>
                  )}

                  {/* Photos */}
                  {entryPhotos.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {entryPhotos.map(photo => (
                        <div key={photo.id} style={{ position: 'relative' }}>
                          <img
                            src={patientService.getJournalPhotoUrl(photo.file_path)}
                            alt={photo.file_name}
                            style={{
                              width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                              border: '2px solid #dee2e6', cursor: 'pointer'
                            }}
                            onClick={() => setLightboxPhoto(patientService.getJournalPhotoUrl(photo.file_path))}
                          />
                          {isOwn && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(entry.id, photo.id)}
                              style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#dc3545', color: 'white', border: 'none',
                                borderRadius: '50%', width: 18, height: 18,
                                fontSize: '11px', lineHeight: '16px', padding: 0, cursor: 'pointer'
                              }}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add photos button for own entries */}
                  {isOwn && entryPhotos.length < MAX_PHOTOS && (
                    <div className="mb-2">
                      <label
                        className="btn btn-outline-secondary btn-sm"
                        style={{ cursor: uploadingPhotoEntryId === entry.id ? 'wait' : 'pointer' }}
                      >
                        {uploadingPhotoEntryId === entry.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <>{'\uD83D\uDCF7'} {t('journal.addPhotos', 'Ajouter des photos')}</>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadPhotosToEntry(entry.id, e.target.files)}
                          disabled={uploadingPhotoEntryId === entry.id}
                        />
                      </label>
                    </div>
                  )}

                  {/* Mood + Energy + Tags */}
                  <div className="d-flex gap-3 align-items-center flex-wrap mb-2">
                    {entry.mood && MOOD_EMOJIS[entry.mood] && (
                      <span title={t(`portal.journal.mood.${entry.mood}`, entry.mood)} style={{ fontSize: '1.3rem' }}>
                        {MOOD_EMOJIS[entry.mood]}
                      </span>
                    )}
                    {entry.energy_level && (
                      <span className="text-muted">{'\u26A1'} {entry.energy_level}/5</span>
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
                              {comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : '\u2014'}
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

      <ConfirmModal
        show={!!deleteEntryId}
        onHide={() => setDeleteEntryId(null)}
        onConfirm={handleDeleteEntry}
        title={t('common.delete', 'Supprimer')}
        message={t('journal.deleteConfirm', 'Supprimer cette note ?')}
        confirmLabel={t('common.delete', 'Supprimer')}
      />

      {/* Lightbox Modal */}
      <Modal show={!!lightboxPhoto} onHide={() => setLightboxPhoto(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('journal.viewPhoto', 'Photo')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0">
          {lightboxPhoto && (
            <img
              src={lightboxPhoto}
              alt="Journal photo"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          {lightboxPhoto && (
            <a href={lightboxPhoto} download className="btn btn-outline-primary btn-sm">
              {t('common.download', 'Telecharger')}
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={() => setLightboxPhoto(null)}>
            {t('common.close', 'Fermer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default PatientJournalTab;
