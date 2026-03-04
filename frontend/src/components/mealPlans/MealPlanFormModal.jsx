/**
 * MealPlanFormModal
 * Create or edit a meal plan's basic metadata.
 */

import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as mealPlanService from '../../services/mealPlanService';
import * as patientService from '../../services/patientService';

const GOALS_OPTIONS = [
  'weight_loss', 'weight_gain', 'balanced_diet', 'muscle_building',
  'heart_health', 'diabetes_management', 'digestive_health', 'energy_boost', 'cholesterol'
];

const RESTRICTION_OPTIONS = [
  'gluten_free', 'lactose_free', 'vegetarian', 'vegan', 'nut_free',
  'egg_free', 'shellfish_free', 'low_sugar', 'low_sodium', 'low_fat', 'high_protein'
];

const MealPlanFormModal = ({ show, onHide, onSaved, plan = null }) => {
  const { t } = useTranslation();
  const isEdit = !!plan;

  const [form, setForm] = useState({
    patient_id: '',
    title: '',
    description: '',
    status: 'draft',
    goals: [],
    dietary_restrictions: [],
    notes: '',
    duration_weeks: '',
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [patientSearching, setPatientSearching] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm({
        patient_id: plan.patient_id || '',
        title: plan.title || '',
        description: plan.description || '',
        status: plan.status || 'draft',
        goals: plan.goals || [],
        dietary_restrictions: plan.dietary_restrictions || [],
        notes: plan.notes || '',
        duration_weeks: plan.duration_weeks || '',
        start_date: plan.start_date || '',
        end_date: plan.end_date || ''
      });
      if (plan.patient) setSelectedPatient(plan.patient);
    } else {
      setForm({
        patient_id: '', title: '', description: '', status: 'draft',
        goals: [], dietary_restrictions: [], notes: '',
        duration_weeks: '', start_date: '', end_date: ''
      });
      setSelectedPatient(null);
    }
    setErrors({});
  }, [plan, show]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const searchPatients = async (query) => {
    if (!query || query.length < 2) { setPatientResults([]); return; }
    setPatientSearching(true);
    try {
      const result = await patientService.getPatients({ search: query, limit: 10 });
      setPatientResults(result.data || []);
    } catch (_) {
      setPatientResults([]);
    } finally {
      setPatientSearching(false);
    }
  };

  const toggleArrayItem = (field, item) => {
    setForm(prev => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
      };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.patient_id) errs.patient_id = t('mealPlans.patient', 'Patient') + ' requis';
    if (!form.title.trim()) errs.title = t('common.required', 'Required');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null
      };
      let saved;
      if (isEdit) {
        saved = await mealPlanService.updateMealPlan(plan.id, payload);
      } else {
        saved = await mealPlanService.createMealPlan(payload);
      }
      onSaved(saved);
    } catch (err) {
      setErrors({ submit: err.message || t('common.error', 'Error') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEdit ? t('mealPlans.edit', 'Edit Plan') : t('mealPlans.create', 'Create Meal Plan')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {errors.submit && (
            <div className="alert alert-danger mb-3">{errors.submit}</div>
          )}

          {/* Patient */}
          {!isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>{t('mealPlans.patient', 'Patient')} *</Form.Label>
              {selectedPatient ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </span>
                  <Button size="sm" variant="outline-secondary" onClick={() => {
                    setSelectedPatient(null);
                    set('patient_id', '');
                    setPatientSearch('');
                  }}>×</Button>
                </div>
              ) : (
                <div className="position-relative">
                  <Form.Control
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value); }}
                    placeholder={t('common.search', 'Search') + '...'}
                    isInvalid={!!errors.patient_id}
                  />
                  {patientSearching && <small className="text-muted">...</small>}
                  {patientResults.length > 0 && (
                    <div className="border rounded bg-white shadow-sm position-absolute w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                      {patientResults.map(p => (
                        <div
                          key={p.id}
                          className="px-3 py-2"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                          onClick={() => {
                            setSelectedPatient(p);
                            set('patient_id', p.id);
                            setPatientResults([]);
                            setPatientSearch('');
                          }}
                        >
                          {p.first_name} {p.last_name}
                          {p.email && <small className="text-muted ms-2">{p.email}</small>}
                        </div>
                      ))}
                    </div>
                  )}
                  <Form.Control.Feedback type="invalid">{errors.patient_id}</Form.Control.Feedback>
                </div>
              )}
            </Form.Group>
          )}

          {/* Title */}
          <Form.Group className="mb-3">
            <Form.Label>{t('common.title', 'Title')} *</Form.Label>
            <Form.Control
              value={form.title}
              onChange={e => set('title', e.target.value)}
              isInvalid={!!errors.title}
              placeholder={t('mealPlans.title', 'Meal Plan')}
            />
            <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label>{t('mealPlans.description', 'Description')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t('mealPlans.descriptionPlaceholder', 'Description...')}
            />
          </Form.Group>

          <Row className="g-2 mb-3">
            {/* Status */}
            <Col md={4}>
              <Form.Label>{t('mealPlans.status.label', 'Status')}</Form.Label>
              <Form.Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">{t('mealPlans.status.draft', 'Draft')}</option>
                <option value="active">{t('mealPlans.status.active', 'Active')}</option>
                <option value="completed">{t('mealPlans.status.completed', 'Completed')}</option>
                <option value="archived">{t('mealPlans.status.archived', 'Archived')}</option>
              </Form.Select>
            </Col>

            {/* Duration */}
            <Col md={2}>
              <Form.Label>{t('mealPlans.duration', 'Duration')}</Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={form.duration_weeks}
                onChange={e => set('duration_weeks', e.target.value)}
                placeholder="4"
              />
            </Col>

            {/* Start date */}
            <Col md={3}>
              <Form.Label>{t('mealPlans.startDate', 'Start date')}</Form.Label>
              <Form.Control
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </Col>

            {/* End date */}
            <Col md={3}>
              <Form.Label>{t('mealPlans.endDate', 'End date')}</Form.Label>
              <Form.Control
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </Col>
          </Row>

          {/* Goals */}
          <Form.Group className="mb-3">
            <Form.Label>{t('mealPlans.goals', 'Goals')}</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {GOALS_OPTIONS.map(goal => (
                <Badge
                  key={goal}
                  bg={form.goals.includes(goal) ? 'success' : 'outline-secondary'}
                  style={{
                    cursor: 'pointer',
                    border: form.goals.includes(goal) ? 'none' : '1px solid #6c757d',
                    color: form.goals.includes(goal) ? '#fff' : '#6c757d',
                    backgroundColor: form.goals.includes(goal) ? undefined : 'transparent',
                    padding: '0.4em 0.8em',
                    fontSize: '0.82rem'
                  }}
                  onClick={() => toggleArrayItem('goals', goal)}
                >
                  {t(`mealPlans.goalsOptions.${goal}`, goal)}
                </Badge>
              ))}
            </div>
          </Form.Group>

          {/* Dietary Restrictions */}
          <Form.Group className="mb-3">
            <Form.Label>{t('mealPlans.dietaryRestrictions', 'Dietary restrictions')}</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {RESTRICTION_OPTIONS.map(r => (
                <Badge
                  key={r}
                  style={{
                    cursor: 'pointer',
                    border: form.dietary_restrictions.includes(r) ? 'none' : '1px solid #fd7e14',
                    color: form.dietary_restrictions.includes(r) ? '#fff' : '#fd7e14',
                    backgroundColor: form.dietary_restrictions.includes(r) ? '#fd7e14' : 'transparent',
                    padding: '0.4em 0.8em',
                    fontSize: '0.82rem'
                  }}
                  onClick={() => toggleArrayItem('dietary_restrictions', r)}
                >
                  {t(`mealPlans.restrictionOptions.${r}`, r)}
                </Badge>
              ))}
            </div>
          </Form.Group>

          {/* Notes */}
          <Form.Group className="mb-3">
            <Form.Label>{t('mealPlans.notes', 'Notes')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={t('mealPlans.notesPlaceholder', 'Notes...')}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MealPlanFormModal;
