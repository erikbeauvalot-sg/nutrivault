/**
 * PatientGoalsTab
 * Dietitian-side component to manage structured goals for a patient
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Form, Row, Col, Spinner, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../services/api';

const DIRECTION_OPTIONS = [
  { value: 'increase', labelKey: 'goals.directionIncrease', defaultLabel: 'Augmenter' },
  { value: 'decrease', labelKey: 'goals.directionDecrease', defaultLabel: 'Diminuer' },
  { value: 'reach', labelKey: 'goals.directionReach', defaultLabel: 'Atteindre' },
  { value: 'maintain', labelKey: 'goals.directionMaintain', defaultLabel: 'Maintenir' }
];

const STATUS_BADGE = {
  active: { bg: '#2d6a4f', text: '#fff' },
  completed: { bg: '#1b4332', text: '#fff' },
  abandoned: { bg: '#6c757d', text: '#fff' }
};

function progressColor(pct) {
  if (pct === null || pct === undefined) return '#adb5bd';
  if (pct >= 100) return '#1b4332';
  if (pct >= 75) return '#2d6a4f';
  if (pct >= 50) return '#52b788';
  return '#74c69d';
}

const EMPTY_FORM = {
  title: '',
  description: '',
  measure_definition_id: '',
  direction: 'reach',
  start_value: '',
  target_value: '',
  start_date: '',
  target_date: '',
  notes: '',
  status: 'active'
};

const PatientGoalsTab = ({ patientId }) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [measureDefs, setMeasureDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState(null);

  // Achievements state
  const [achievements, setAchievements] = useState([]);
  const [showDeleteAchievementId, setShowDeleteAchievementId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      // Load goals and achievements in parallel — both critical
      const [goalsRes, achRes] = await Promise.all([
        api.get(`/patients/${patientId}/goals`),
        api.get(`/patients/${patientId}/achievements`)
      ]);
      setGoals(goalsRes.data?.data || []);
      setAchievements(achRes.data?.data || []);

      // Load measure definitions independently — non-blocking
      api.get('/measures').then(defsRes => {
        const defs = defsRes.data?.data || [];
        setMeasureDefs(defs.filter(d => d.measure_type === 'numeric' || d.measure_type === 'calculated'));
      }).catch(() => {
        // measures.read permission may not be available — goals still work without it
      });
    } catch (err) {
      toast.error(t('goals.loadError', 'Erreur lors du chargement des objectifs'));
    } finally {
      setLoading(false);
    }
  }, [patientId, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      measure_definition_id: goal.measure_definition_id || '',
      direction: goal.direction || 'reach',
      start_value: goal.start_value !== null && goal.start_value !== undefined ? String(goal.start_value) : '',
      target_value: goal.target_value !== null && goal.target_value !== undefined ? String(goal.target_value) : '',
      start_date: goal.start_date || '',
      target_date: goal.target_date || '',
      notes: goal.notes || '',
      status: goal.status || 'active'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(t('goals.titleRequired', 'Le titre est obligatoire'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        measure_definition_id: form.measure_definition_id || null,
        direction: form.direction,
        start_value: form.start_value !== '' ? parseFloat(form.start_value) : null,
        target_value: form.target_value !== '' ? parseFloat(form.target_value) : null,
        start_date: form.start_date || null,
        target_date: form.target_date || null,
        notes: form.notes || null,
        status: form.status
      };

      if (editingGoal) {
        await api.put(`/patients/${patientId}/goals/${editingGoal.id}`, payload);
        toast.success(t('goals.updated', 'Objectif mis à jour'));
      } else {
        await api.post(`/patients/${patientId}/goals`, payload);
        toast.success(t('goals.created', 'Objectif créé'));
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || t('goals.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId) => {
    try {
      await api.delete(`/patients/${patientId}/goals/${goalId}`);
      toast.success(t('goals.deleted', 'Objectif supprimé'));
      setShowDeleteId(null);
      await loadData();
    } catch (err) {
      toast.error(t('goals.deleteError', 'Erreur lors de la suppression'));
    }
  };

  const handleDeleteAchievement = async (achievementId) => {
    try {
      await api.delete(`/patients/${patientId}/achievements/${achievementId}`);
      toast.success(t('goals.achievementDeleted', 'Récompense supprimée'));
      setShowDeleteAchievementId(null);
      setAchievements(prev => prev.filter(a => a.id !== achievementId));
    } catch (err) {
      toast.error(t('goals.achievementDeleteError', 'Erreur lors de la suppression de la récompense'));
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" style={{ color: '#2d6a4f' }} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', color: '#1b2d1f' }}>
            🎯 {t('goals.title', 'Objectifs de santé')}
          </h5>
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
            {t('goals.subtitle', 'Définissez des objectifs mesurables liés aux mesures du patient')}
          </p>
        </div>
        <Button
          onClick={openCreate}
          style={{ background: '#2d6a4f', border: 'none', borderRadius: '20px', fontSize: '0.85rem' }}
        >
          + {t('goals.addGoal', 'Ajouter un objectif')}
        </Button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="border-0 text-center py-5" style={{ background: '#f0faf4', borderRadius: '16px' }}>
          <Card.Body>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>🌿</div>
            <p className="text-muted mb-2">{t('goals.noGoals', 'Aucun objectif défini pour ce patient.')}</p>
            <Button
              onClick={openCreate}
              size="sm"
              style={{ background: '#2d6a4f', border: 'none', borderRadius: '20px' }}
            >
              {t('goals.defineFirst', 'Définir le premier objectif')}
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {goals.map(goal => {
            const pct = goal.progress_pct;
            const color = progressColor(pct);
            const statusStyle = STATUS_BADGE[goal.status] || STATUS_BADGE.active;
            return (
              <Col key={goal.id} xs={12} md={6} xl={4}>
                <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ height: '4px', background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <Card.Body className="p-3">
                    {/* Title + status */}
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#1b2d1f', lineHeight: 1.3 }}>
                        {goal.title}
                      </span>
                      <span
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          marginLeft: '8px',
                          flexShrink: 0,
                          fontWeight: '600'
                        }}
                      >
                        {goal.status === 'completed' ? t('goals.statusCompleted', 'Atteint') :
                          goal.status === 'abandoned' ? t('goals.statusAbandoned', 'Abandonné') :
                          t('goals.statusActive', 'En cours')}
                      </span>
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <p style={{ fontSize: '0.78rem', color: '#666', marginBottom: '8px' }}>{goal.description}</p>
                    )}

                    {/* Measure info */}
                    {goal.measureDefinition && (
                      <div style={{ fontSize: '0.78rem', color: '#52b788', marginBottom: '8px' }}>
                        📏 {goal.measureDefinition.display_name || goal.measureDefinition.name}
                        {goal.target_value !== null && goal.target_value !== undefined && (
                          <span style={{ color: '#2d6a4f', fontWeight: '600' }}>
                            {' → '}{goal.target_value} {goal.measureDefinition.unit || ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress */}
                    {pct !== null && (
                      <div className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ fontSize: '0.72rem', color: '#74c69d' }}>{t('goals.progress', 'Progression')}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color }}>{pct}%</span>
                        </div>
                        <div style={{ height: '5px', borderRadius: '10px', background: '#e9f5ee', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '10px' }} />
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    {goal.target_date && (
                      <div style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                        📅 {t('goals.targetDate', 'Échéance')} : {new Date(goal.target_date).toLocaleDateString('fr-FR')}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="d-flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        style={{ borderRadius: '10px', fontSize: '0.75rem', flex: 1 }}
                        onClick={() => openEdit(goal)}
                      >
                        ✏️ {t('common.edit', 'Modifier')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        style={{ borderRadius: '10px', fontSize: '0.75rem' }}
                        onClick={() => setShowDeleteId(goal.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Achievements Section */}
      <div className="mt-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', color: '#1b2d1f' }}>
              🏆 {t('goals.achievementsTitle', 'Récompenses obtenues')}
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
              {t('goals.achievementsSubtitle', 'Badges et points gagnés par le patient')}
            </p>
          </div>
          {achievements.length > 0 && (
            <span style={{
              background: '#fff3cd',
              color: '#856404',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}>
              {achievements.reduce((s, a) => s + (a.reward_points || 0), 0)} {t('goals.achievementPoints', 'pts')}
            </span>
          )}
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-4" style={{ background: '#fffdf0', borderRadius: '14px', border: '1px dashed #ffd60a44' }}>
            <div style={{ fontSize: '2rem', opacity: 0.4, marginBottom: '8px' }}>🏅</div>
            <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
              {t('goals.noAchievements', 'Aucune récompense pour ce patient.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {achievements.map(ach => (
              <div
                key={ach.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#fff',
                  border: '1px solid #e9f5ee',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  minWidth: '220px',
                  maxWidth: '320px',
                  flex: '1 0 220px'
                }}
              >
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{ach.badge_icon || '🏅'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1b2d1f', lineHeight: 1.2 }}>
                    {ach.title}
                  </div>
                  {ach.description && (
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', lineHeight: 1.3 }}>
                      {ach.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{
                      background: '#d8f3dc',
                      color: '#2d6a4f',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      padding: '1px 7px',
                      fontWeight: '700'
                    }}>
                      +{ach.reward_points || 0} {t('goals.achievementPoints', 'pts')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#adb5bd' }}>
                      {ach.earned_at ? new Date(ach.earned_at).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteAchievementId(ach.id)}
                  title={t('goals.deleteAchievement', 'Supprimer la récompense')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#adb5bd',
                    padding: '4px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc3545'}
                  onMouseLeave={e => e.currentTarget.style.color = '#adb5bd'}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: '#f0faf4', borderBottom: '2px solid #b7e4c7' }}>
          <Modal.Title style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', color: '#1b2d1f', fontSize: '1.1rem' }}>
            {editingGoal ? t('goals.editGoal', 'Modifier l\'objectif') : t('goals.newGoal', 'Nouvel objectif')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Row className="g-3">
            <Col xs={12}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.titleLabel', 'Titre')} *</Form.Label>
              <Form.Control
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('goals.titlePlaceholder', 'Ex: Atteindre un poids de 70 kg')}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={12}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.descriptionLabel', 'Description')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={12} md={6}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.linkedMeasure', 'Mesure liée')}</Form.Label>
              <Form.Select
                value={form.measure_definition_id}
                onChange={e => setForm(f => ({ ...f, measure_definition_id: e.target.value }))}
                style={{ borderRadius: '10px' }}
              >
                <option value="">{t('goals.noMeasure', '— Aucune mesure liée —')}</option>
                {measureDefs.map(d => (
                  <option key={d.id} value={d.id}>{d.display_name || d.name} {d.unit ? `(${d.unit})` : ''}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.direction', 'Direction')}</Form.Label>
              <Form.Select
                value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                style={{ borderRadius: '10px' }}
              >
                {DIRECTION_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{t(d.labelKey, d.defaultLabel)}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={3}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.startValue', 'Valeur de départ')}</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={form.start_value}
                onChange={e => setForm(f => ({ ...f, start_value: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.targetValue', 'Valeur cible')}</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                value={form.target_value}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.startDate', 'Début')}</Form.Label>
              <Form.Control
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            <Col xs={6} md={3}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.targetDate', 'Échéance')}</Form.Label>
              <Form.Control
                type="date"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
            {editingGoal && (
              <Col xs={12} md={4}>
                <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.status', 'Statut')}</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ borderRadius: '10px' }}
                >
                  <option value="active">{t('goals.statusActive', 'En cours')}</option>
                  <option value="completed">{t('goals.statusCompleted', 'Atteint')}</option>
                  <option value="abandoned">{t('goals.statusAbandoned', 'Abandonné')}</option>
                </Form.Select>
              </Col>
            )}
            <Col xs={12}>
              <Form.Label style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('goals.notes', 'Notes')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ borderRadius: '10px' }}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer style={{ background: '#f0faf4', borderTop: '1px solid #b7e4c7' }}>
          <Button variant="outline-secondary" style={{ borderRadius: '20px' }} onClick={() => setShowModal(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#2d6a4f', border: 'none', borderRadius: '20px' }}
          >
            {saving ? <Spinner size="sm" /> : (editingGoal ? t('common.save', 'Sauvegarder') : t('goals.create', 'Créer'))}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Goal Confirm Modal */}
      <Modal show={!!showDeleteId} onHide={() => setShowDeleteId(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>{t('goals.deleteConfirmTitle', 'Supprimer l\'objectif')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('goals.deleteConfirm', 'Êtes-vous sûr de vouloir supprimer cet objectif ? Cette action est irréversible.')}</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" style={{ borderRadius: '20px' }} onClick={() => setShowDeleteId(null)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="danger" size="sm" style={{ borderRadius: '20px' }} onClick={() => handleDelete(showDeleteId)}>
            {t('common.delete', 'Supprimer')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Achievement Confirm Modal */}
      <Modal show={!!showDeleteAchievementId} onHide={() => setShowDeleteAchievementId(null)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '1rem' }}>🏅 {t('goals.deleteAchievement', 'Supprimer la récompense')}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: '0.9rem' }}>
          {t('goals.deleteAchievementConfirm', 'Supprimer cette récompense ? Le patient ne la verra plus dans son portail.')}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" style={{ borderRadius: '20px' }} onClick={() => setShowDeleteAchievementId(null)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="danger" size="sm" style={{ borderRadius: '20px' }} onClick={() => handleDeleteAchievement(showDeleteAchievementId)}>
            {t('common.delete', 'Supprimer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PatientGoalsTab;
