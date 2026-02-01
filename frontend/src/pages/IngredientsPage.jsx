/**
 * Ingredients Page
 * Admin page for managing the ingredient library
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Spinner, Badge, Table, Dropdown, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Layout from '../components/layout/Layout';
import IngredientModal from '../components/IngredientModal';
import NutritionDisplay from '../components/NutritionDisplay';
import { useAuth } from '../contexts/AuthContext';
import * as ingredientService from '../services/ingredientService';

const IngredientsPage = () => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  // State
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [deletingIngredient, setDeletingIngredient] = useState(null);
  const [viewingNutrition, setViewingNutrition] = useState(null);

  // Permissions
  const canCreate = hasPermission('recipes.create');
  const canUpdate = hasPermission('recipes.update');
  const canDelete = hasPermission('recipes.delete');

  // Category translations
  const getCategoryLabel = (category) => {
    const labels = {
      proteins: t('ingredients.categories.proteins', 'Proteins'),
      grains: t('ingredients.categories.grains', 'Grains'),
      vegetables: t('ingredients.categories.vegetables', 'Vegetables'),
      fruits: t('ingredients.categories.fruits', 'Fruits'),
      dairy: t('ingredients.categories.dairy', 'Dairy'),
      oils: t('ingredients.categories.oils', 'Oils & Fats'),
      nuts: t('ingredients.categories.nuts', 'Nuts & Seeds'),
      legumes: t('ingredients.categories.legumes', 'Legumes'),
      spices: t('ingredients.categories.spices', 'Spices & Herbs'),
      condiments: t('ingredients.categories.condiments', 'Condiments'),
      beverages: t('ingredients.categories.beverages', 'Beverages'),
      other: t('ingredients.categories.other', 'Other')
    };
    return labels[category] || category;
  };

  // Load data
  const loadIngredients = useCallback(async () => {
    try {
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
    }
  }, [currentPage, search, selectedCategory, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await ingredientService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadIngredients(), loadCategories()]);
      setLoading(false);
    };
    loadData();
  }, [loadIngredients, loadCategories]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handlers
  const handleCreateIngredient = () => {
    setEditingIngredient(null);
    setShowIngredientModal(true);
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setShowIngredientModal(true);
  };

  const handleDeleteIngredient = (ingredient) => {
    setDeletingIngredient(ingredient);
    setShowDeleteModal(true);
  };

  const handleViewNutrition = (ingredient) => {
    setViewingNutrition(ingredient);
    setShowNutritionModal(true);
  };

  const confirmDeleteIngredient = async () => {
    if (!deletingIngredient) return;

    try {
      await ingredientService.deleteIngredient(deletingIngredient.id);
      toast.success(t('ingredients.deleted', 'Ingredient deleted successfully'));
      setShowDeleteModal(false);
      setDeletingIngredient(null);
      loadIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast.error(t('ingredients.deleteError', 'Failed to delete ingredient'));
    }
  };

  const handleIngredientSuccess = () => {
    loadIngredients();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || selectedCategory;

  return (
    <Layout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('ingredients.title', 'Ingredients')}</h2>
          {canCreate && (
            <Button variant="primary" onClick={handleCreateIngredient}>
              {t('ingredients.create', 'New Ingredient')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={5}>
                <InputGroup>
                  <InputGroup.Text>
                    <span role="img" aria-label="search">&#128269;</span>
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
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                {hasActiveFilters && (
                  <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                    {t('common.clearSearch', 'Clear Filters')}
                  </Button>
                )}
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
                <Button variant="primary" onClick={handleCreateIngredient}>
                  {t('ingredients.createFirst', 'Add your first ingredient')}
                </Button>
              )}
            </Card.Body>
          </Card>
        ) : (
          <>
            <Card>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>{t('ingredients.name', 'Name')}</th>
                    <th>{t('ingredients.category', 'Category')}</th>
                    <th>{t('ingredients.unit', 'Unit')}</th>
                    <th>{t('ingredients.nutrition', 'Nutrition')}</th>
                    <th>{t('ingredients.allergens', 'Allergens')}</th>
                    <th className="text-end">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map(ingredient => (
                    <tr key={ingredient.id}>
                      <td>
                        <strong>{ingredient.name}</strong>
                        {ingredient.is_system && (
                          <Badge bg="secondary" className="ms-2" pill>
                            {t('ingredients.system', 'System')}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Badge bg="light" text="dark">
                          {getCategoryLabel(ingredient.category)}
                        </Badge>
                      </td>
                      <td>{ingredient.default_unit || '-'}</td>
                      <td>
                        {ingredient.nutrition_per_100g ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={() => handleViewNutrition(ingredient)}
                          >
                            {ingredient.nutrition_per_100g.calories || 0} kcal
                          </Button>
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
                      <td className="text-end">
                        <Dropdown align="end">
                          <Dropdown.Toggle variant="link" size="sm" className="p-0 text-muted">
                            ...
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => handleViewNutrition(ingredient)}>
                              {t('ingredients.viewNutrition', 'View Nutrition')}
                            </Dropdown.Item>
                            {canUpdate && !ingredient.is_system && (
                              <Dropdown.Item onClick={() => handleEditIngredient(ingredient)}>
                                {t('common.edit', 'Edit')}
                              </Dropdown.Item>
                            )}
                            {canDelete && !ingredient.is_system && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  className="text-danger"
                                  onClick={() => handleDeleteIngredient(ingredient)}
                                >
                                  {t('common.delete', 'Delete')}
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <nav>
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        {t('common.previous', 'Previous')}
                      </button>
                    </li>
                    {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <li key={i} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === pagination.totalPages}
                      >
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
          onSuccess={handleIngredientSuccess}
        />

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('ingredients.deleteTitle', 'Delete Ingredient')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('ingredients.deleteConfirm', 'Are you sure you want to delete "{{name}}"?', {
                name: deletingIngredient?.name
              })}
            </p>
            <p className="text-muted small">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteIngredient}>
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Nutrition Modal */}
        <Modal show={showNutritionModal} onHide={() => setShowNutritionModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {viewingNutrition?.name} - {t('ingredients.nutritionPer100g', 'Nutrition per 100g')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {viewingNutrition && (
              <NutritionDisplay
                nutrition={viewingNutrition.nutrition_per_100g}
                showTitle={false}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNutritionModal(false)}>
              {t('common.close', 'Close')}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default IngredientsPage;
