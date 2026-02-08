/**
 * IngredientsTab Component
 * Manages ingredients table, filters, pagination, CRUD, and nutrition SlidePanel
 */

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ActionButton from '../ActionButton';
import NutritionDisplay from '../NutritionDisplay';
import IngredientModal from '../IngredientModal';
import ConfirmModal from '../ConfirmModal';
import SlidePanel from '../ui/SlidePanel';
import * as ingredientService from '../../services/ingredientService';
import * as ingredientCategoryService from '../../services/ingredientCategoryService';

// Check if user has admin or dietitian role
const isAdminOrDietitian = (user) => {
  const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
  return role === 'ADMIN' || role === 'DIETITIAN';
};

const IngredientsTab = ({ canCreate, canUpdate, canDelete, canManageIngredients }) => {
  const { t } = useTranslation();

  const [ingredients, setIngredients] = useState([]);
  const [ingredientCategories, setIngredientCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals / panels
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [deletingIngredient, setDeletingIngredient] = useState(null);
  const [viewingNutrition, setViewingNutrition] = useState(null);

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: 20,
        search: search || undefined,
        category: selectedCategory || undefined
      };

      const { data, pagination: pag } = await ingredientService.getIngredients(filters);
      setIngredients(data);
      setPagination(pag);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error(t('ingredients.loadError', 'Failed to load ingredients'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedCategory, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await ingredientCategoryService.getCategories();
      setIngredientCategories(data);
    } catch (error) {
      console.error('Error loading ingredient categories:', error);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
    loadCategories();
  }, [loadIngredients, loadCategories]);

  const getIngredientCategoryDisplay = (ingredient) => {
    if (ingredient.ingredientCategory) {
      return {
        icon: ingredient.ingredientCategory.icon,
        name: ingredient.ingredientCategory.name,
        color: ingredient.ingredientCategory.color
      };
    }
    if (ingredient.category_id) {
      const cat = ingredientCategories.find(c => c.id === ingredient.category_id);
      if (cat) {
        return { icon: cat.icon, name: cat.name, color: cat.color };
      }
    }
    if (ingredient.category) {
      const legacyLabels = {
        proteins: { icon: '🥩', name: t('ingredients.categories.proteins', 'Proteins') },
        grains: { icon: '🌾', name: t('ingredients.categories.grains', 'Grains') },
        vegetables: { icon: '🥬', name: t('ingredients.categories.vegetables', 'Vegetables') },
        fruits: { icon: '🍎', name: t('ingredients.categories.fruits', 'Fruits') },
        dairy: { icon: '🧀', name: t('ingredients.categories.dairy', 'Dairy') },
        oils: { icon: '🫒', name: t('ingredients.categories.oils', 'Oils & Fats') },
        nuts: { icon: '🥜', name: t('ingredients.categories.nuts', 'Nuts & Seeds') },
        legumes: { icon: '🫘', name: t('ingredients.categories.legumes', 'Legumes') },
        spices: { icon: '🌿', name: t('ingredients.categories.spices', 'Spices & Herbs') },
        condiments: { icon: '🧂', name: t('ingredients.categories.condiments', 'Condiments') },
        beverages: { icon: '🥤', name: t('ingredients.categories.beverages', 'Beverages') },
        other: { icon: '📦', name: t('ingredients.categories.other', 'Other') }
      };
      return legacyLabels[ingredient.category] || { icon: '📦', name: ingredient.category };
    }
    return null;
  };

  const getUnitLabel = (unit) => {
    if (!unit) return '-';
    return t(`ingredients.units.${unit}`, unit);
  };

  const handleDuplicate = async (ingredient) => {
    try {
      await ingredientService.duplicateIngredient(ingredient.id);
      toast.success(t('ingredients.duplicated', 'Ingredient duplicated successfully'));
      loadIngredients();
    } catch (error) {
      console.error('Error duplicating ingredient:', error);
      toast.error(t('ingredients.duplicateError', 'Failed to duplicate ingredient'));
    }
  };

  const confirmDelete = async () => {
    if (!deletingIngredient) return;
    try {
      await ingredientService.deleteIngredient(deletingIngredient.id);
      toast.success(t('ingredients.deleted', 'Ingredient deleted successfully'));
      setDeletingIngredient(null);
      loadIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast.error(t('ingredients.deleteError', 'Failed to delete ingredient'));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || selectedCategory;

  return (
    <>
      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text>
                  <span role="img" aria-label="search">🔍</span>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={t('ingredients.search', 'Search ingredients...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              >
                <option value="">{t('ingredients.allCategories', 'All Categories')}</option>
                {ingredientCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="d-flex gap-2">
                {hasActiveFilters && (
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    {t('common.clearSearch', 'Clear')}
                  </Button>
                )}
                {canCreate && (
                  <Button variant="primary" onClick={() => { setEditingIngredient(null); setShowIngredientModal(true); }}>
                    {t('ingredients.create', 'New Ingredient')}
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Ingredients Table */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">{t('common.loading', 'Loading...')}</p>
        </div>
      ) : ingredients.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-3">
              {hasActiveFilters
                ? t('ingredients.noResults', 'No ingredients found')
                : t('ingredients.noIngredients', 'No ingredients yet')
              }
            </p>
            {canCreate && !hasActiveFilters && (
              <Button variant="primary" onClick={() => { setEditingIngredient(null); setShowIngredientModal(true); }}>
                {t('ingredients.createFirst', 'Add your first ingredient')}
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>{t('ingredients.name', 'Name')}</th>
                    <th>{t('ingredients.category', 'Category')}</th>
                    <th>{t('ingredients.unit', 'Unit')}</th>
                    <th>{t('ingredients.nutrition', 'Nutrition')}</th>
                    <th>{t('ingredients.allergens', 'Allergens')}</th>
                    {canManageIngredients && (
                      <th className="text-end">{t('common.actions', 'Actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ingredient => (
                    <tr
                      key={ingredient.id}
                      onClick={() => setViewingNutrition(ingredient)}
                      style={{ cursor: 'pointer' }}
                      className="ingredient-row"
                    >
                      <td>
                        <strong>{ingredient.name}</strong>
                      </td>
                      <td>
                        {(() => {
                          const catDisplay = getIngredientCategoryDisplay(ingredient);
                          return catDisplay ? (
                            <Badge
                              style={{ backgroundColor: catDisplay.color || '#9e9e9e' }}
                              className="text-white"
                            >
                              {catDisplay.icon} {catDisplay.name}
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          );
                        })()}
                      </td>
                      <td>{getUnitLabel(ingredient.default_unit)}</td>
                      <td>
                        {ingredient.nutrition_per_100g ? (
                          <span className="text-primary">
                            {ingredient.nutrition_per_100g.calories || 0} kcal
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {ingredient.allergens && ingredient.allergens.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {ingredient.allergens.slice(0, 2).map((allergen, idx) => (
                              <Badge key={idx} bg="warning" text="dark" pill>
                                {t(`ingredients.allergenTypes.${allergen}`, allergen)}
                              </Badge>
                            ))}
                            {ingredient.allergens.length > 2 && (
                              <Badge bg="light" text="dark" pill>
                                +{ingredient.allergens.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      {canManageIngredients && (
                        <td className="text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons d-flex gap-1 justify-content-end">
                            <ActionButton
                              action="duplicate"
                              onClick={() => handleDuplicate(ingredient)}
                              title={t('common.duplicate', 'Duplicate')}
                            />
                            <ActionButton
                              action="edit"
                              onClick={() => { setEditingIngredient(ingredient); setShowIngredientModal(true); }}
                              title={t('common.edit', 'Edit')}
                            />
                            <ActionButton
                              action="delete"
                              onClick={() => setDeletingIngredient(ingredient)}
                              title={t('common.delete', 'Delete')}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                      {t('common.previous', 'Previous')}
                    </button>
                  </li>
                  {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <li key={i} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages}>
                      {t('common.next', 'Next')}
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}

          {pagination && (
            <p className="text-center text-muted mt-2">
              {t('common.showingResults', 'Showing {{count}} of {{total}} results', {
                count: ingredients.length,
                total: pagination.total
              })}
            </p>
          )}
        </>
      )}

      {/* Ingredient Modal */}
      <IngredientModal
        show={showIngredientModal}
        onHide={() => setShowIngredientModal(false)}
        ingredient={editingIngredient}
        onSuccess={loadIngredients}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deletingIngredient}
        onHide={() => setDeletingIngredient(null)}
        onConfirm={confirmDelete}
        title={t('ingredients.deleteTitle', 'Delete Ingredient')}
        message={
          <>
            {t('ingredients.deleteConfirm', 'Are you sure you want to delete "{{name}}"?', {
              name: deletingIngredient?.name
            })}
            <br />
            <small className="text-muted">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</small>
          </>
        }
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />

      {/* Nutrition SlidePanel */}
      <SlidePanel
        show={!!viewingNutrition}
        onHide={() => setViewingNutrition(null)}
        title={viewingNutrition?.name}
        subtitle={t('ingredients.nutritionPer100g', 'Nutrition per 100g')}
        icon="🥗"
        size="sm"
        footer={
          <div className="d-flex w-100 justify-content-between align-items-center">
            <div>
              {canManageIngredients && viewingNutrition && (
                <div className="d-flex gap-1">
                  <ActionButton
                    action="duplicate"
                    onClick={() => {
                      setViewingNutrition(null);
                      handleDuplicate(viewingNutrition);
                    }}
                    title={t('common.duplicate', 'Duplicate')}
                  />
                  <ActionButton
                    action="edit"
                    onClick={() => {
                      const ing = viewingNutrition;
                      setViewingNutrition(null);
                      setEditingIngredient(ing);
                      setShowIngredientModal(true);
                    }}
                    title={t('common.edit', 'Edit')}
                  />
                  <ActionButton
                    action="delete"
                    onClick={() => {
                      const ing = viewingNutrition;
                      setViewingNutrition(null);
                      setDeletingIngredient(ing);
                    }}
                    title={t('common.delete', 'Delete')}
                  />
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={() => setViewingNutrition(null)}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        }
      >
        {viewingNutrition && (
          <>
            <NutritionDisplay
              nutrition={viewingNutrition.nutrition_per_100g}
              showTitle={false}
            />
            {viewingNutrition.allergens && viewingNutrition.allergens.length > 0 && (
              <div className="mt-3">
                <strong>{t('ingredients.allergens', 'Allergens')}:</strong>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {viewingNutrition.allergens.map((allergen, idx) => (
                    <Badge key={idx} bg="warning" text="dark" pill>
                      {t(`ingredients.allergenTypes.${allergen}`, allergen)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3">
              <strong>{t('ingredients.category', 'Category')}:</strong>{' '}
              {(() => {
                const catDisplay = getIngredientCategoryDisplay(viewingNutrition);
                return catDisplay ? (
                  <Badge
                    style={{ backgroundColor: catDisplay.color || '#9e9e9e' }}
                    className="text-white ms-1"
                  >
                    {catDisplay.icon} {catDisplay.name}
                  </Badge>
                ) : (
                  <span className="text-muted">-</span>
                );
              })()}
            </div>
            <div className="mt-1">
              <strong>{t('ingredients.unit', 'Default Unit')}:</strong>{' '}
              {getUnitLabel(viewingNutrition.default_unit)}
            </div>
          </>
        )}
      </SlidePanel>
    </>
  );
};

export default IngredientsTab;
