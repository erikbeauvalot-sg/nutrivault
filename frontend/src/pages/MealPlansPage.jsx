/**
 * MealPlansPage
 * List of meal plans with filters and creation modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Form, InputGroup, Badge, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import MealPlanFormModal from '../components/mealPlans/MealPlanFormModal';
import { useAuth } from '../contexts/AuthContext';
import * as mealPlanService from '../services/mealPlanService';

const STATUS_COLORS = {
  draft: 'secondary',
  active: 'success',
  completed: 'primary',
  archived: 'warning'
};

const MealPlansPage = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const canCreate = hasPermission('meal_plans.create');
  const canDelete = hasPermission('meal_plans.delete');

  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      const result = await mealPlanService.getMealPlans(filters);
      setPlans(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleCreated = (plan) => {
    setShowForm(false);
    toast.success(t('mealPlans.createSuccess', 'Meal plan created'));
    navigate(`/meal-plans/${plan.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mealPlanService.deleteMealPlan(deleteTarget.id);
      toast.success(t('mealPlans.deleteSuccess', 'Meal plan deleted'));
      setDeleteTarget(null);
      loadPlans();
    } catch (err) {
      toast.error(err.message || t('common.error', 'Error'));
    }
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="align-items-center mb-4">
          <Col>
            <h2 className="mb-0">{t('mealPlans.title', 'Meal Plans')}</h2>
          </Col>
          <Col xs="auto">
            {canCreate && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                + {t('mealPlans.new', 'New Plan')}
              </Button>
            )}
          </Col>
        </Row>

        {/* Filters */}
        <Row className="mb-4 g-2">
          <Col md={6} lg={4}>
            <InputGroup>
              <Form.Control
                placeholder={t('mealPlans.search', 'Search plans...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={4} lg={3}>
            <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">{t('mealPlans.allStatuses', 'All statuses')}</option>
              <option value="draft">{t('mealPlans.status.draft', 'Draft')}</option>
              <option value="active">{t('mealPlans.status.active', 'Active')}</option>
              <option value="completed">{t('mealPlans.status.completed', 'Completed')}</option>
              <option value="archived">{t('mealPlans.status.archived', 'Archived')}</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <div style={{ fontSize: '3rem' }}>📅</div>
            <p className="mt-2">
              {search || statusFilter
                ? t('mealPlans.noResults', 'No plans match your filters')
                : t('mealPlans.noPlans', 'No meal plans yet')}
            </p>
            {canCreate && !search && !statusFilter && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                {t('mealPlans.createFirst', 'Create the first meal plan')}
              </Button>
            )}
          </div>
        ) : (
          <Row className="g-3">
            {plans.map(plan => (
              <Col key={plan.id} xs={12} sm={6} lg={4} xl={3}>
                <Card
                  className="h-100 shadow-sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/meal-plans/${plan.id}`)}
                >
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div style={{ fontSize: '1.5rem' }}>📅</div>
                      <Badge bg={STATUS_COLORS[plan.status] || 'secondary'}>
                        {t(`mealPlans.status.${plan.status}`, plan.status)}
                      </Badge>
                    </div>
                    <Card.Title className="fs-6 mb-1">{plan.title}</Card.Title>
                    {plan.patient && (
                      <small className="text-muted mb-2">
                        {plan.patient.first_name} {plan.patient.last_name}
                      </small>
                    )}
                    {plan.description && (
                      <Card.Text className="text-muted small mt-1 flex-grow-1" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {plan.description}
                      </Card.Text>
                    )}
                    {plan.duration_weeks && (
                      <small className="text-muted mt-2">
                        {t('mealPlans.durationWeeks', '{{count}} week(s)', { count: plan.duration_weeks })}
                      </small>
                    )}
                    {canDelete && (
                      <div className="mt-2 text-end">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(plan); }}
                        >
                          {t('common.delete', 'Delete')}
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Modals */}
        {canCreate && (
          <MealPlanFormModal
            show={showForm}
            onHide={() => setShowForm(false)}
            onSaved={handleCreated}
          />
        )}

        <ConfirmModal
          show={!!deleteTarget}
          onHide={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={t('mealPlans.confirmDelete', 'Delete meal plan?')}
          message={deleteTarget ? `"${deleteTarget.title}"` : ''}
          variant="danger"
          confirmLabel={t('common.delete', 'Delete')}
        />
      </Container>
    </Layout>
  );
};

export default MealPlansPage;
