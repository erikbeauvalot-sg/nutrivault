/**
 * MealPlanDetailPage
 * Full detail view of a meal plan with editable day/meal/item structure.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Badge, Spinner, Card, Tab, Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import MealPlanFormModal from '../components/mealPlans/MealPlanFormModal';
import MealPlanDayBuilder from '../components/mealPlans/MealPlanDayBuilder';
import { useAuth } from '../contexts/AuthContext';
import * as mealPlanService from '../services/mealPlanService';

const STATUS_COLORS = {
  draft: 'secondary',
  active: 'success',
  completed: 'primary',
  archived: 'warning'
};

const MealPlanDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const canUpdate = hasPermission('meal_plans.update');
  const canDelete = hasPermission('meal_plans.delete');

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editedDays, setEditedDays] = useState(null);
  const [savingDays, setSavingDays] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mealPlanService.getMealPlanById(id);
      setPlan(data);
      setEditedDays(null);
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleDelete = async () => {
    try {
      await mealPlanService.deleteMealPlan(id);
      toast.success(t('mealPlans.deleteSuccess', 'Meal plan deleted'));
      navigate('/meal-plans');
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    }
  };

  const handleSaveDays = async () => {
    if (!editedDays) return;
    setSavingDays(true);
    try {
      const updated = await mealPlanService.replaceDays(id, editedDays);
      setPlan(updated);
      setEditedDays(null);
      toast.success(t('mealPlans.daysUpdated', 'Schedule updated'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    } finally {
      setSavingDays(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await mealPlanService.updateMealPlan(id, { status: newStatus });
      setPlan(updated);
      toast.success(t('mealPlans.updateSuccess', 'Meal plan updated'));
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      </Layout>
    );
  }

  if (!plan) {
    return (
      <Layout>
        <Container className="py-4 text-center">
          <p className="text-muted">{t('common.notFound', 'Not found')}</p>
          <Button onClick={() => navigate('/meal-plans')}>
            {t('common.back', 'Back')}
          </Button>
        </Container>
      </Layout>
    );
  }

  const currentDays = editedDays !== null ? editedDays : (plan.days || []);

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="align-items-center mb-4">
          <Col>
            <Button variant="link" className="ps-0 text-muted" onClick={() => navigate('/meal-plans')}>
              ← {t('mealPlans.title', 'Meal Plans')}
            </Button>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <h2 className="mb-0">{plan.title}</h2>
              <Badge bg={STATUS_COLORS[plan.status] || 'secondary'} style={{ fontSize: '0.85rem' }}>
                {t(`mealPlans.status.${plan.status}`, plan.status)}
              </Badge>
            </div>
            {plan.patient && (
              <div className="text-muted mt-1">
                {plan.patient.first_name} {plan.patient.last_name}
                {plan.patient.email && ` · ${plan.patient.email}`}
              </div>
            )}
          </Col>
          <Col xs="auto" className="d-flex gap-2 flex-wrap">
            {canUpdate && plan.status === 'draft' && (
              <Button size="sm" variant="success" onClick={() => handleStatusChange('active')}>
                {t('mealPlans.actions.activate', 'Activate')}
              </Button>
            )}
            {canUpdate && plan.status === 'active' && (
              <Button size="sm" variant="primary" onClick={() => handleStatusChange('completed')}>
                {t('mealPlans.actions.complete', 'Mark complete')}
              </Button>
            )}
            {canUpdate && (
              <Button size="sm" variant="outline-secondary" onClick={() => setShowEdit(true)}>
                {t('common.edit', 'Edit')}
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="outline-danger" onClick={() => setShowDelete(true)}>
                {t('common.delete', 'Delete')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Info row */}
        <Row className="mb-4 g-3">
          {plan.description && (
            <Col xs={12}>
              <p className="text-muted">{plan.description}</p>
            </Col>
          )}

          {plan.duration_weeks && (
            <Col xs="auto">
              <small className="text-muted">
                📅 {t('mealPlans.durationWeeks', '{{count}} week(s)', { count: plan.duration_weeks })}
              </small>
            </Col>
          )}
          {plan.start_date && (
            <Col xs="auto">
              <small className="text-muted">
                🗓 {new Date(plan.start_date).toLocaleDateString()} → {plan.end_date ? new Date(plan.end_date).toLocaleDateString() : '...'}
              </small>
            </Col>
          )}
          {plan.creator && (
            <Col xs="auto">
              <small className="text-muted">
                👤 {plan.creator.first_name} {plan.creator.last_name}
              </small>
            </Col>
          )}
        </Row>

        {/* Goals & Restrictions */}
        {((plan.goals || []).length > 0 || (plan.dietary_restrictions || []).length > 0) && (
          <Row className="mb-4 g-2">
            {(plan.goals || []).length > 0 && (
              <Col xs={12}>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <small className="text-muted me-1">{t('mealPlans.goals', 'Goals')}:</small>
                  {plan.goals.map(g => (
                    <Badge key={g} bg="success">{t(`mealPlans.goalsOptions.${g}`, g)}</Badge>
                  ))}
                </div>
              </Col>
            )}
            {(plan.dietary_restrictions || []).length > 0 && (
              <Col xs={12}>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <small className="text-muted me-1">{t('mealPlans.dietaryRestrictions', 'Restrictions')}:</small>
                  {plan.dietary_restrictions.map(r => (
                    <Badge key={r} bg="warning" text="dark">{t(`mealPlans.restrictionOptions.${r}`, r)}</Badge>
                  ))}
                </div>
              </Col>
            )}
          </Row>
        )}

        {plan.notes && (
          <Card className="mb-4 border-0 bg-light">
            <Card.Body>
              <small className="text-muted d-block mb-1">{t('mealPlans.notes', 'Notes')}</small>
              <p className="mb-0">{plan.notes}</p>
            </Card.Body>
          </Card>
        )}

        {/* Days / Schedule */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">{t('mealPlans.days.title', 'Days')}</h5>
          {canUpdate && editedDays !== null && (
            <Button variant="primary" size="sm" onClick={handleSaveDays} disabled={savingDays}>
              {savingDays ? t('common.saving', 'Saving...') : t('mealPlans.actions.saveDays', 'Save schedule')}
            </Button>
          )}
        </div>

        {canUpdate ? (
          <MealPlanDayBuilder
            days={currentDays}
            onChange={setEditedDays}
          />
        ) : (
          // Read-only view
          <div>
            {(plan.days || []).length === 0 ? (
              <p className="text-muted">{t('mealPlans.noPlans', 'No schedule yet')}</p>
            ) : (
              plan.days.map((day, dayIdx) => (
                <Card key={dayIdx} className="mb-3 border-0 shadow-sm">
                  <Card.Header className="d-flex align-items-center gap-2">
                    <Badge bg="primary">
                      {t('mealPlans.days.day', 'Day {{number}}', { number: day.day_number })}
                    </Badge>
                    {day.label && <span>{day.label}</span>}
                  </Card.Header>
                  <Card.Body>
                    {(day.meals || []).length === 0 ? (
                      <p className="text-muted small">{t('mealPlans.days.noMeals', 'No meals')}</p>
                    ) : (
                      day.meals.map((meal, mealIdx) => (
                        <div key={mealIdx} className="mb-3">
                          <div className="fw-semibold mb-1">
                            {t(`mealPlans.mealTypes.${meal.meal_type}`, meal.meal_type)}
                            {meal.label && ` · ${meal.label}`}
                          </div>
                          <ul className="list-unstyled mb-0 ps-2">
                            {(meal.items || []).map((item, itemIdx) => (
                              <li key={itemIdx} className="text-muted small">
                                • {item.name}
                                {item.quantity && ` — ${item.quantity}${item.unit ? ' ' + item.unit : ''}`}
                                {item.notes && ` (${item.notes})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </Card.Body>
                </Card>
              ))
            )}
          </div>
        )}
      </Container>

      {/* Modals */}
      {canUpdate && (
        <MealPlanFormModal
          show={showEdit}
          onHide={() => setShowEdit(false)}
          plan={plan}
          onSaved={(updated) => {
            setPlan(updated);
            setShowEdit(false);
            toast.success(t('mealPlans.updateSuccess', 'Meal plan updated'));
          }}
        />
      )}

      <ConfirmModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('mealPlans.confirmDelete', 'Delete meal plan?')}
        message={`"${plan.title}"`}
        variant="danger"
        confirmLabel={t('common.delete', 'Delete')}
      />
    </Layout>
  );
};

export default MealPlanDetailPage;
