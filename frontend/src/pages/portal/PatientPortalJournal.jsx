/**
 * Patient Portal Journal Page
 * Patients can create, edit, delete journal entries with mood, energy, tags, photos
 * Dietitian comments are displayed read-only
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Form, Button, Badge, Spinner, Alert, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import * as portalService from '../../services/portalService';

const MAX_PHOTOS = 5;

const MOOD_OPTIONS = [
  { value: 'very_bad', emoji: '\uD83D\uDE2B', labelKey: 'portal.journal.mood.very_bad', default: 'Tres mal' },
  { value: 'bad', emoji: '\uD83D\uDE1F', labelKey: 'portal.journal.mood.bad', default: 'Mal' },
  { value: 'neutral', emoji: '\uD83D\uDE10', labelKey: 'portal.journal.mood.neutral', default: 'Neutre' },
  { value: 'good', emoji: '\uD83D\uDE42', labelKey: 'portal.journal.mood.good', default: 'Bien' },
  { value: 'very_good', emoji: '\uD83D\uDE04', labelKey: 'portal.journal.mood.very_good', default: 'Tres bien' },
];

const ENTRY_TYPES = [
  { value: 'food', icon: '\uD83C\uDF7D\uFE0F', labelKey: 'portal.journal.type.food', default: 'Alimentation' },
  { value: 'symptom', icon: '\uD83E\uDE7A', labelKey: 'portal.journal.type.symptom', default: 'Symptome' },
  { value: 'mood', icon: '\uD83D\uDCAD', labelKey: 'portal.journal.type.mood', default: 'Humeur' },
  { value: 'activity', icon: '\uD83C\uDFC3', labelKey: 'portal.journal.type.activity', default: 'Activite' },
  { value: 'note', icon: '\uD83D\uDCDD', labelKey: 'portal.journal.type.note', default: 'Note' },
  { value: 'other', icon: '\uD83D\uDCCE', labelKey: 'portal.journal.type.other', default: 'Autre' },
];

const getTypeInfo = (type) => ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[4];
const getMoodInfo = (mood) => MOOD_OPTIONS.find(m => m.value === mood);

const PatientPortalJournal = () => {
  const { t } = useTranslation();

  // List state
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

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'note',
    title: '',
    mood: null,
    energy_level: null,
    tags: [],
    is_private: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Photo state
  const [pendingPhotos, setPendingPhotos] = useState([]); // New files to upload
  const [existingPhotos, setExistingPhotos] = useState([]); // Photos already on server (edit mode)
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const totalPhotoCount = existingPhotos.length + pendingPhotos.length;

  const onDrop = useCallback((acceptedFiles) => {
    const remaining = MAX_PHOTOS - totalPhotoCount;
    if (remaining <= 0) {
      toast.warning(t('journal.maxPhotosReached', `Maximum ${MAX_PHOTOS} photos par entree`));
      return;
    }
    const toAdd = acceptedFiles.slice(0, remaining);
    // Add preview URLs
    const withPreviews = toAdd.map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
    setPendingPhotos(prev => [...prev, ...withPreviews]);
  }, [totalPhotoCount, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/gif': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    disabled: totalPhotoCount >= MAX_PHOTOS,
  });

  const removePendingPhoto = (index) => {
    setPendingPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeExistingPhoto = async (photo) => {
    try {
      await portalService.deleteJournalPhoto(editingId, photo.id);
      setExistingPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success(t('journal.photoDeleted', 'Photo supprimee'));
    } catch {
      toast.error(t('journal.photoUploadError', 'Erreur lors de la suppression de la photo'));
    }
  };

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filterType) params.entry_type = filterType;
      if (filterMood) params.mood = filterMood;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const result = await portalService.getJournalEntries(params);
      setEntries(result.data || []);
      setPagination(result.pagination || null);
    } catch {
      setError(t('portal.journal.loadError', 'Erreur lors du chargement du journal'));
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterMood, filterStartDate, filterEndDate, t]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      pendingPhotos.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [pendingPhotos]);

  const resetForm = () => {
    setFormData({
      content: '',
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'note',
      title: '',
      mood: null,
      energy_level: null,
      tags: [],
      is_private: false,
    });
    setTagInput('');
    setEditingId(null);
    pendingPhotos.forEach(file => URL.revokeObjectURL(file.preview));
    setPendingPhotos([]);
    setExistingPhotos([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : null,
      };

      let entryId;
      if (editingId) {
        await portalService.updateJournalEntry(editingId, payload);
        entryId = editingId;
        toast.success(t('portal.journal.updated', 'Entree mise a jour'));
      } else {
        const created = await portalService.createJournalEntry(payload);
        entryId = created.id;
        toast.success(t('portal.journal.created', 'Entree ajoutee'));
      }

      // Upload pending photos
      if (pendingPhotos.length > 0 && entryId) {
        setUploadingPhotos(true);
        try {
          await portalService.uploadJournalPhotos(entryId, pendingPhotos);
          toast.success(t('journal.photoUploading', 'Photos ajoutees'));
        } catch {
          toast.error(t('journal.photoUploadError', 'Erreur lors de l\'upload des photos'));
        }
        setUploadingPhotos(false);
      }

      resetForm();
      setShowForm(false);
      loadEntries();
    } catch (err) {
      toast.error(err?.response?.data?.error || t('portal.journal.saveError', 'Erreur lors de l\'enregistrement'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      content: entry.content,
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      title: entry.title || '',
      mood: entry.mood || null,
      energy_level: entry.energy_level || null,
      tags: entry.tags || [],
      is_private: entry.is_private,
    });
    setEditingId(entry.id);
    setExistingPhotos(entry.photos || []);
    setPendingPhotos([]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await portalService.deleteJournalEntry(deleteId);
      toast.success(t('portal.journal.deleted', 'Entree supprimee'));
      setDeleteId(null);
      loadEntries();
    } catch {
      toast.error(t('portal.journal.deleteError', 'Erreur lors de la suppression'));
    } finally {
      setDeleting(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterMood('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const hasActiveFilters = filterType || filterMood || filterStartDate || filterEndDate;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
        <h2 className="mb-0" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.75rem)' }}>{t('portal.journal.title', 'Mon journal de suivi')}</h2>
        <Button
          size="sm"
          variant={showForm ? 'outline-secondary' : 'primary'}
          className="text-nowrap"
          onClick={() => {
            if (showForm) { resetForm(); }
            setShowForm(!showForm);
          }}
        >
          {showForm
            ? t('common.cancel', 'Annuler')
            : `+ ${t('portal.journal.newEntry', 'Nouvelle entree')}`
          }
        </Button>
      </div>

      {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-4 border-primary" style={{ borderWidth: '2px' }}>
          <Card.Header className="bg-primary text-white">
            <strong>
              {editingId
                ? t('portal.journal.editEntry', 'Modifier l\'entree')
                : t('portal.journal.newEntry', 'Nouvelle entree')
              }
            </strong>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row className="g-2">
                {/* Date + Type */}
                <Col xs={6} md={4}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.journal.date', 'Date')}</Form.Label>
                    <Form.Control
                      size="sm"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} md={4}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.journal.entryType', 'Type')}</Form.Label>
                    <Form.Select
                      size="sm"
                      value={formData.entry_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, entry_type: e.target.value }))}
                    >
                      {ENTRY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {t(type.labelKey, type.default)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.journal.titleLabel', 'Titre')} <small className="text-muted">({t('common.optional', 'Optionnel')})</small></Form.Label>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder={t('portal.journal.titlePlaceholder', 'Titre court...')}
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      maxLength={255}
                    />
                  </Form.Group>
                </Col>

                {/* Content */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>{t('portal.journal.content', 'Contenu')} *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder={t('portal.journal.contentPlaceholder', 'Decrivez votre journee, vos repas, vos ressentis...')}
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      required
                    />
                  </Form.Group>
                </Col>

                {/* Photos Dropzone */}
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="small mb-1">
                      {t('journal.photos', 'Photos')} <small className="text-muted">({totalPhotoCount}/{MAX_PHOTOS})</small>
                    </Form.Label>
                    <div
                      {...getRootProps()}
                      style={{
                        border: '2px dashed',
                        borderColor: isDragActive ? '#0d6efd' : totalPhotoCount >= MAX_PHOTOS ? '#dee2e6' : '#adb5bd',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        cursor: totalPhotoCount >= MAX_PHOTOS ? 'not-allowed' : 'pointer',
                        backgroundColor: isDragActive ? 'rgba(13,110,253,0.05)' : 'transparent',
                        opacity: totalPhotoCount >= MAX_PHOTOS ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <input {...getInputProps()} />
                      <div style={{ fontSize: '1.5rem' }}>{'\uD83D\uDCF7'}</div>
                      <small className="text-muted">
                        {totalPhotoCount >= MAX_PHOTOS
                          ? t('journal.maxPhotosReached', `Maximum ${MAX_PHOTOS} photos atteint`)
                          : isDragActive
                            ? t('journal.dropPhotos', 'Deposez les photos ici...')
                            : t('journal.addPhotos', 'Cliquez ou deposez des photos ici (JPEG, PNG, GIF)')
                        }
                      </small>
                    </div>

                    {/* Photo thumbnails (existing + pending) */}
                    {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {existingPhotos.map(photo => (
                          <div key={photo.id} style={{ position: 'relative' }}>
                            <img
                              src={portalService.getJournalPhotoUrl(photo.file_path)}
                              alt={photo.file_name}
                              style={{
                                width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                                border: '2px solid #dee2e6', cursor: 'pointer'
                              }}
                              onClick={() => setLightboxPhoto(portalService.getJournalPhotoUrl(photo.file_path))}
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingPhoto(photo)}
                              style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#dc3545', color: 'white', border: 'none',
                                borderRadius: '50%', width: 20, height: 20,
                                fontSize: '12px', lineHeight: '18px', padding: 0, cursor: 'pointer'
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        {pendingPhotos.map((file, idx) => (
                          <div key={`pending-${idx}`} style={{ position: 'relative' }}>
                            <img
                              src={file.preview}
                              alt={file.name}
                              style={{
                                width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                                border: '2px dashed #0d6efd', opacity: 0.8
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removePendingPhoto(idx)}
                              style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#dc3545', color: 'white', border: 'none',
                                borderRadius: '50%', width: 20, height: 20,
                                fontSize: '12px', lineHeight: '18px', padding: 0, cursor: 'pointer'
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                {/* Mood */}
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.journal.moodLabel', 'Humeur')}</Form.Label>
                    <div className="d-flex gap-1 flex-wrap">
                      {MOOD_OPTIONS.map(option => (
                        <OverlayTrigger
                          key={option.value}
                          placement="top"
                          overlay={<Tooltip>{t(option.labelKey, option.default)}</Tooltip>}
                        >
                          <Button
                            variant={formData.mood === option.value ? 'primary' : 'outline-secondary'}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              mood: prev.mood === option.value ? null : option.value
                            }))}
                            style={{ fontSize: '1.3rem', padding: '3px 8px', lineHeight: 1 }}
                          >
                            {option.emoji}
                          </Button>
                        </OverlayTrigger>
                      ))}
                    </div>
                  </Form.Group>
                </Col>

                {/* Energy */}
                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label className="small mb-1">
                      {t('portal.journal.energyLabel', 'Energie')}{' '}
                      {formData.energy_level && (
                        <Badge bg="info">{formData.energy_level}/5</Badge>
                      )}
                    </Form.Label>
                    <div className="d-flex gap-1 align-items-center flex-wrap">
                      {[1, 2, 3, 4, 5].map(level => (
                        <Button
                          key={level}
                          variant={formData.energy_level === level ? 'warning' : 'outline-secondary'}
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            energy_level: prev.energy_level === level ? null : level
                          }))}
                          style={{ minWidth: '32px', padding: '2px 6px' }}
                        >
                          {'\u26A1'.repeat(level > 3 ? 3 : level > 1 ? 2 : 1)}
                        </Button>
                      ))}
                      {formData.energy_level && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-muted p-0"
                          onClick={() => setFormData(prev => ({ ...prev, energy_level: null }))}
                        >
                          {t('common.reset', 'Reset')}
                        </Button>
                      )}
                    </div>
                  </Form.Group>
                </Col>

                {/* Tags */}
                <Col xs={12} md={8}>
                  <Form.Group>
                    <Form.Label className="small mb-1">{t('portal.journal.tags', 'Tags')}</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="text"
                        placeholder={t('portal.journal.tagsPlaceholder', 'Ajouter un tag...')}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                        }}
                      />
                      <Button variant="outline-primary" onClick={addTag} disabled={!tagInput.trim()}>+</Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="mt-2 d-flex flex-wrap gap-1">
                        {formData.tags.map(tag => (
                          <Badge key={tag} bg="light" text="dark" className="d-flex align-items-center gap-1 px-2 py-1">
                            {tag}
                            <span
                              role="button"
                              style={{ cursor: 'pointer', marginLeft: '4px' }}
                              onClick={() => removeTag(tag)}
                            >
                              &times;
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                {/* Private toggle */}
                <Col xs={12} md={4}>
                  <Form.Group className="mt-2 mt-md-4">
                    <Form.Check
                      type="switch"
                      id="is-private"
                      label={t('portal.journal.private', 'Entree privee')}
                      checked={formData.is_private}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
                    />
                    <Form.Text className="text-muted">
                      {t('portal.journal.privateHint', 'Les entrees privees ne sont pas visibles par votre dieteticien(ne)')}
                    </Form.Text>
                  </Form.Group>
                </Col>

                {/* Submit */}
                <Col xs={12} className="text-end">
                  <Button type="submit" variant="primary" disabled={saving || uploadingPhotos || !formData.content.trim()}>
                    {saving || uploadingPhotos ? (
                      <><Spinner animation="border" size="sm" className="me-2" />{uploadingPhotos ? t('journal.photoUploading', 'Upload des photos...') : t('common.saving', 'Enregistrement...')}</>
                    ) : (
                      editingId
                        ? t('common.update', 'Mettre a jour')
                        : t('common.save', 'Enregistrer')
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-3">
        <Card.Body className="py-2">
          <Row className="g-2 align-items-end">
            <Col xs={6} md={3}>
              <Form.Label className="small mb-1">{t('portal.journal.entryType', 'Type')}</Form.Label>
              <Form.Select size="sm" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                <option value="">{t('common.all', 'Tous')}</option>
                {ENTRY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.icon} {t(type.labelKey, type.default)}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={2}>
              <Form.Label className="small mb-1">{t('portal.journal.moodLabel', 'Humeur')}</Form.Label>
              <Form.Select size="sm" value={filterMood} onChange={(e) => { setFilterMood(e.target.value); setPage(1); }}>
                <option value="">{t('common.all', 'Toutes')}</option>
                {MOOD_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.emoji} {t(m.labelKey, m.default)}</option>
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
        </Card.Body>
      </Card>

      {/* Entry List */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <div style={{ fontSize: '3rem' }}>{'\uD83D\uDCD3'}</div>
            <h5 className="mt-3">{t('portal.journal.noEntries', 'Aucune entree dans votre journal')}</h5>
            <p className="text-muted">
              {t('portal.journal.noEntriesHint', 'Commencez a ecrire pour suivre votre alimentation, vos symptomes et votre bien-etre')}
            </p>
            {!showForm && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                + {t('portal.journal.newEntry', 'Nouvelle entree')}
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <>
          {entries.map(entry => {
            const typeInfo = getTypeInfo(entry.entry_type);
            const moodInfo = getMoodInfo(entry.mood);
            const entryTags = entry.tags || [];
            const entryPhotos = entry.photos || [];

            return (
              <Card key={entry.id} className="mb-3" style={entry.is_private ? { borderLeft: '4px solid #dc3545' } : {}}>
                <Card.Body>
                  {/* Header row */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <Badge bg="light" text="dark" className="px-2 py-1">
                        {typeInfo.icon} {t(typeInfo.labelKey, typeInfo.default)}
                      </Badge>
                      <small className="text-muted">
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </small>
                      {entry.is_private && (
                        <Badge bg="danger" className="px-2 py-1">
                          {'\uD83D\uDD12'} {t('portal.journal.private', 'Privee')}
                        </Badge>
                      )}
                    </div>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-primary" onClick={() => handleEdit(entry)} title={t('common.edit', 'Modifier')}>
                        {'\u270F\uFE0F'}
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => setDeleteId(entry.id)} title={t('common.delete', 'Supprimer')}>
                        {'\uD83D\uDDD1\uFE0F'}
                      </Button>
                    </div>
                  </div>

                  {/* Title */}
                  {entry.title && (
                    <h6 className="mb-2">{entry.title}</h6>
                  )}

                  {/* Content */}
                  <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</p>

                  {/* Photos */}
                  {entryPhotos.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {entryPhotos.map(photo => (
                        <img
                          key={photo.id}
                          src={portalService.getJournalPhotoUrl(photo.file_path)}
                          alt={photo.file_name}
                          style={{
                            width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                            border: '2px solid #dee2e6', cursor: 'pointer'
                          }}
                          onClick={() => setLightboxPhoto(portalService.getJournalPhotoUrl(photo.file_path))}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mood + Energy + Tags row */}
                  <div className="d-flex gap-3 align-items-center flex-wrap">
                    {moodInfo && (
                      <span title={t(moodInfo.labelKey, moodInfo.default)} style={{ fontSize: '1.3rem' }}>
                        {moodInfo.emoji}
                      </span>
                    )}
                    {entry.energy_level && (
                      <span className="text-muted" title={t('portal.journal.energyLabel', 'Energie')}>
                        {'\u26A1'} {entry.energy_level}/5
                      </span>
                    )}
                    {entryTags.length > 0 && entryTags.map(tag => (
                      <Badge key={tag} bg="light" text="dark" className="px-2 py-1">#{tag}</Badge>
                    ))}
                  </div>

                  {/* Comments (from dietitian, read-only for patient) */}
                  {entry.comments && entry.comments.length > 0 && (
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted fw-bold d-block mb-2">
                        {'\uD83D\uDCAC'} {t('portal.journal.comments', 'Commentaires')} ({entry.comments.length})
                      </small>
                      {entry.comments.map(comment => (
                        <div key={comment.id} className="mb-2 ps-3" style={{ borderLeft: '3px solid #0d6efd' }}>
                          <div className="d-flex justify-content-between">
                            <small className="fw-bold">
                              {comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : '\u2014'}
                            </small>
                            <small className="text-muted">
                              {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                            </small>
                          </div>
                          <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}

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
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteId} onHide={() => setDeleteId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('portal.journal.deleteConfirm', 'Supprimer cette entree ?')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t('portal.journal.deleteConfirmMessage', 'Cette action est irreversible. Voulez-vous vraiment supprimer cette entree de votre journal ?')}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={deleting}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner animation="border" size="sm" /> : t('common.delete', 'Supprimer')}
          </Button>
        </Modal.Footer>
      </Modal>

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
    </div>
  );
};

export default PatientPortalJournal;
