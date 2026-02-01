/**
 * Recipes Page
 * Main page for recipe management
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Spinner, Badge, Dropdown, Modal, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import RecipeCategoryModal from '../components/RecipeCategoryModal';
import RecipeShareModal from '../components/RecipeShareModal';
import IngredientModal from '../components/IngredientModal';
import NutritionDisplay from '../components/NutritionDisplay';
import ActionButton from '../components/ActionButton';
import { useAuth } from '../contexts/AuthContext';

// Check if user has admin or dietitian role
const isAdminOrDietitian = (user) => {
  const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
  return role === 'ADMIN' || role === 'DIETITIAN';
};
import * as recipeService from '../services/recipeService';
import * as recipeCategoryService from '../services/recipeCategoryService';
import * as ingredientService from '../services/ingredientService';

const RecipesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  // Check if user can manage ingredients (Admin or Dietitian)
  const canManageIngredients = isAdminOrDietitian(user);

  // State
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [sharingRecipe, setSharingRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState('recipes');

  // Ingredients state
  const [ingredients, setIngredients] = useState([]);
  const [ingredientCategories, setIngredientCategories] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [ingredientPagination, setIngredientPagination] = useState(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState('');
  const [ingredientPage, setIngredientPage] = useState(1);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showDeleteIngredientModal, setShowDeleteIngredientModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [deletingIngredient, setDeletingIngredient] = useState(null);
  const [viewingNutrition, setViewingNutrition] = useState(null);

  // Permissions
  const canCreate = hasPermission('recipes.create');
  const canUpdate = hasPermission('recipes.update');
  const canDelete = hasPermission('recipes.delete');
  const canShare = hasPermission('recipes.share');

  // Load data
  const loadRecipes = useCallback(async () => {
    try {
      const filters = {
        page: currentPage,
        limit: 12,
        search: search || undefined,
        category_id: selectedCategory || undefined,
        status: selectedStatus || undefined,
        difficulty: selectedDifficulty || undefined
      };

      const { data, pagination: pag } = await recipeService.getRecipes(filters);
      setRecipes(data);
      setPagination(pag);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error(t('recipes.loadError', 'Failed to load recipes'));
    }
  }, [currentPage, search, selectedCategory, selectedStatus, selectedDifficulty, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await recipeCategoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Load ingredients
  const loadIngredients = useCallback(async () => {
    try {
      setIngredientsLoading(true);
      const filters = {
        page: ingredientPage,
        limit: 20,
        search: ingredientSearch || undefined,
        category: selectedIngredientCategory || undefined
      };

      const { data, pagination: pag } = await ingredientService.getIngredients(filters);
      setIngredients(data);
      setIngredientPagination(pag);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error(t('ingredients.loadError', 'Failed to load ingredients'));
    } finally {
      setIngredientsLoading(false);
    }
  }, [ingredientPage, ingredientSearch, selectedIngredientCategory, t]);

  const loadIngredientCategories = useCallback(async () => {
    try {
      const data = await ingredientService.getCategories();
      setIngredientCategories(data);
    } catch (error) {
      console.error('Error loading ingredient categories:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadRecipes(), loadCategories()]);
      setLoading(false);
    };
    loadData();
  }, [loadRecipes, loadCategories]);

  // Load ingredients when tab is active
  useEffect(() => {
    if (activeTab === 'ingredients') {
      loadIngredients();
      loadIngredientCategories();
    }
  }, [activeTab, loadIngredients, loadIngredientCategories]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handlers
  const handleCreateRecipe = () => {
    setEditingRecipe(null);
    setShowRecipeModal(true);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handleViewRecipe = (recipe) => {
    navigate(`/recipes/${recipe.id}`);
  };

  const handleDeleteRecipe = (recipe) => {
    setDeletingRecipe(recipe);
    setShowDeleteModal(true);
  };

  const confirmDeleteRecipe = async () => {
    if (!deletingRecipe) return;

    try {
      await recipeService.deleteRecipe(deletingRecipe.id);
      toast.success(t('recipes.deleted', 'Recipe deleted successfully'));
      setShowDeleteModal(false);
      setDeletingRecipe(null);
      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error(t('recipes.deleteError', 'Failed to delete recipe'));
    }
  };

  const handleDuplicateRecipe = async (recipe) => {
    try {
      await recipeService.duplicateRecipe(recipe.id);
      toast.success(t('recipes.duplicated', 'Recipe duplicated successfully'));
      loadRecipes();
    } catch (error) {
      console.error('Error duplicating recipe:', error);
      toast.error(t('recipes.duplicateError', 'Failed to duplicate recipe'));
    }
  };

  const handlePublishRecipe = async (recipe) => {
    try {
      await recipeService.publishRecipe(recipe.id);
      toast.success(t('recipes.published', 'Recipe published successfully'));
      loadRecipes();
    } catch (error) {
      console.error('Error publishing recipe:', error);
      toast.error(t('recipes.publishError', 'Failed to publish recipe'));
    }
  };

  const handleArchiveRecipe = async (recipe) => {
    try {
      await recipeService.archiveRecipe(recipe.id);
      toast.success(t('recipes.archived', 'Recipe archived successfully'));
      loadRecipes();
    } catch (error) {
      console.error('Error archiving recipe:', error);
      toast.error(t('recipes.archiveError', 'Failed to archive recipe'));
    }
  };

  const handleShareRecipe = (recipe) => {
    setSharingRecipe(recipe);
    setShowShareModal(true);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (category) => {
    setDeletingCategory(category);
    setShowDeleteCategoryModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      await recipeCategoryService.deleteCategory(deletingCategory.id);
      toast.success(t('recipes.categories.deleted', 'Category deleted successfully'));
      setShowDeleteCategoryModal(false);
      setDeletingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('recipes.categories.deleteError', 'Failed to delete category'));
    }
  };

  const handleRecipeSuccess = () => {
    loadRecipes();
  };

  const handleCategorySuccess = () => {
    loadCategories();
  };

  // Ingredient handlers
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
    setShowDeleteIngredientModal(true);
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
      setShowDeleteIngredientModal(false);
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

  const handleDuplicateIngredient = async (ingredient) => {
    try {
      await ingredientService.duplicateIngredient(ingredient.id);
      toast.success(t('ingredients.duplicated', 'Ingredient duplicated successfully'));
      loadIngredients();
    } catch (error) {
      console.error('Error duplicating ingredient:', error);
      toast.error(t('ingredients.duplicateError', 'Failed to duplicate ingredient'));
    }
  };

  const clearIngredientFilters = () => {
    setIngredientSearch('');
    setSelectedIngredientCategory('');
    setIngredientPage(1);
  };

  const hasActiveIngredientFilters = ingredientSearch || selectedIngredientCategory;

  const getIngredientCategoryLabel = (category) => {
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

  const getUnitLabel = (unit) => {
    if (!unit) return '-';
    return t(`ingredients.units.${unit}`, unit);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedDifficulty('');
    setCurrentPage(1);
  };

  const hasActiveFilters = search || selectedCategory || selectedStatus || selectedDifficulty;

  return (
    <Layout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('recipes.title', 'Recipes')}</h2>
          {canCreate && (
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={handleCreateCategory}>
                {t('recipes.categories.create', 'New Category')}
              </Button>
              <Button variant="primary" onClick={handleCreateRecipe}>
                {t('recipes.createRecipe', 'New Recipe')}
              </Button>
            </div>
          )}
        </div>

        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
          <Tab eventKey="recipes" title={t('recipes.tabRecipes', 'Recipes')}>
            {/* Filters */}
            <Card className="mb-4">
              <Card.Body>
                <Row className="g-3">
                  <Col md={4}>
                    <InputGroup>
                      <InputGroup.Text>
                        <span role="img" aria-label="search">🔍</span>
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder={t('recipes.search', 'Search recipes...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </InputGroup>
                  </Col>
                  <Col md={2}>
                    <Form.Select
                      value={selectedCategory}
                      onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">{t('recipes.allCategories', 'All Categories')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Select
                      value={selectedStatus}
                      onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">{t('recipes.allStatus', 'All Status')}</option>
                      <option value="draft">{t('recipes.status.draft', 'Draft')}</option>
                      <option value="published">{t('recipes.status.published', 'Published')}</option>
                      <option value="archived">{t('recipes.status.archived', 'Archived')}</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Select
                      value={selectedDifficulty}
                      onChange={(e) => { setSelectedDifficulty(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">{t('recipes.allDifficulty', 'All Difficulty')}</option>
                      <option value="easy">{t('recipes.difficulty.easy', 'Easy')}</option>
                      <option value="medium">{t('recipes.difficulty.medium', 'Medium')}</option>
                      <option value="hard">{t('recipes.difficulty.hard', 'Hard')}</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    {hasActiveFilters && (
                      <Button variant="outline-secondary" onClick={clearFilters} className="w-100">
                        {t('common.clearSearch', 'Clear Filters')}
                      </Button>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Recipe Grid */}
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">{t('common.loading', 'Loading...')}</p>
              </div>
            ) : recipes.length === 0 ? (
              <Card className="text-center py-5">
                <Card.Body>
                  <p className="text-muted mb-3">
                    {hasActiveFilters
                      ? t('recipes.noResults', 'No recipes match your filters')
                      : t('recipes.noRecipes', 'No recipes yet')
                    }
                  </p>
                  {canCreate && !hasActiveFilters && (
                    <Button variant="primary" onClick={handleCreateRecipe}>
                      {t('recipes.createFirst', 'Create your first recipe')}
                    </Button>
                  )}
                </Card.Body>
              </Card>
            ) : (
              <>
                <Row className="g-4">
                  {recipes.map(recipe => (
                    <Col key={recipe.id} xs={12} sm={6} md={4} lg={3}>
                      <RecipeCard
                        recipe={recipe}
                        onClick={handleViewRecipe}
                        onEdit={canUpdate ? handleEditRecipe : undefined}
                        onDelete={canDelete ? handleDeleteRecipe : undefined}
                        onDuplicate={canCreate ? handleDuplicateRecipe : undefined}
                        onPublish={canUpdate ? handlePublishRecipe : undefined}
                        onArchive={canUpdate ? handleArchiveRecipe : undefined}
                        onShare={canShare && recipe.status === 'published' ? handleShareRecipe : undefined}
                      />
                    </Col>
                  ))}
                </Row>

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
                        {[...Array(pagination.totalPages)].map((_, i) => (
                          <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}
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
                      count: recipes.length,
                      total: pagination.total
                    })}
                  </p>
                )}
              </>
            )}
          </Tab>

          <Tab eventKey="categories" title={t('recipes.tabCategories', 'Categories')}>
            <Row className="g-4">
              {categories.map(category => (
                <Col key={category.id} xs={12} sm={6} md={4} lg={3}>
                  <Card className="h-100">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="d-flex align-items-center justify-content-center rounded"
                            style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: category.color,
                              fontSize: '1.5rem'
                            }}
                          >
                            {category.icon}
                          </span>
                          <div>
                            <h6 className="mb-0">{category.name}</h6>
                            {category.description && (
                              <small className="text-muted">{category.description}</small>
                            )}
                          </div>
                        </div>
                        {canUpdate && (
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="link" size="sm" className="p-0 text-muted">
                              ...
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleEditCategory(category)}>
                                {t('common.edit', 'Edit')}
                              </Dropdown.Item>
                              {canDelete && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    className="text-danger"
                                    onClick={() => handleDeleteCategory(category)}
                                  >
                                    {t('common.delete', 'Delete')}
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
              {categories.length === 0 && (
                <Col xs={12}>
                  <Card className="text-center py-4">
                    <Card.Body>
                      <p className="text-muted mb-3">{t('recipes.categories.noCategories', 'No categories yet')}</p>
                      {canCreate && (
                        <Button variant="primary" onClick={handleCreateCategory}>
                          {t('recipes.categories.createFirst', 'Create your first category')}
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Tab>

          <Tab eventKey="ingredients" title={t('recipes.tabIngredients', 'Ingredients')}>
            {/* Ingredient Filters */}
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
                        value={ingredientSearch}
                        onChange={(e) => setIngredientSearch(e.target.value)}
                      />
                    </InputGroup>
                  </Col>
                  <Col md={4}>
                    <Form.Select
                      value={selectedIngredientCategory}
                      onChange={(e) => { setSelectedIngredientCategory(e.target.value); setIngredientPage(1); }}
                    >
                      <option value="">{t('ingredients.allCategories', 'All Categories')}</option>
                      {ingredientCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {getIngredientCategoryLabel(cat)}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <div className="d-flex gap-2">
                      {hasActiveIngredientFilters && (
                        <Button variant="outline-secondary" onClick={clearIngredientFilters}>
                          {t('common.clearSearch', 'Clear')}
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="primary" onClick={handleCreateIngredient}>
                          {t('ingredients.create', 'New Ingredient')}
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Ingredients Table */}
            {ingredientsLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">{t('common.loading', 'Loading...')}</p>
              </div>
            ) : ingredients.length === 0 ? (
              <Card className="text-center py-5">
                <Card.Body>
                  <p className="text-muted mb-3">
                    {hasActiveIngredientFilters
                      ? t('ingredients.noResults', 'No ingredients found')
                      : t('ingredients.noIngredients', 'No ingredients yet')
                    }
                  </p>
                  {canCreate && !hasActiveIngredientFilters && (
                    <Button variant="primary" onClick={handleCreateIngredient}>
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
                            onClick={() => handleViewNutrition(ingredient)}
                            style={{ cursor: 'pointer' }}
                            className="ingredient-row"
                          >
                            <td>
                              <strong>{ingredient.name}</strong>
                            </td>
                            <td>
                              <Badge bg="light" text="dark">
                                {getIngredientCategoryLabel(ingredient.category)}
                              </Badge>
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
                                    onClick={() => handleDuplicateIngredient(ingredient)}
                                    title={t('common.duplicate', 'Duplicate')}
                                  />
                                  <ActionButton
                                    action="edit"
                                    onClick={() => handleEditIngredient(ingredient)}
                                    title={t('common.edit', 'Edit')}
                                  />
                                  <ActionButton
                                    action="delete"
                                    onClick={() => handleDeleteIngredient(ingredient)}
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

                {/* Ingredient Pagination */}
                {ingredientPagination && ingredientPagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <nav>
                      <ul className="pagination">
                        <li className={`page-item ${ingredientPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setIngredientPage(ingredientPage - 1)}
                            disabled={ingredientPage === 1}
                          >
                            {t('common.previous', 'Previous')}
                          </button>
                        </li>
                        {[...Array(Math.min(ingredientPagination.totalPages, 5))].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <li key={i} className={`page-item ${ingredientPage === pageNum ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setIngredientPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        })}
                        <li className={`page-item ${ingredientPage === ingredientPagination.totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setIngredientPage(ingredientPage + 1)}
                            disabled={ingredientPage === ingredientPagination.totalPages}
                          >
                            {t('common.next', 'Next')}
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}

                {ingredientPagination && (
                  <p className="text-center text-muted mt-2">
                    {t('common.showingResults', 'Showing {{count}} of {{total}} results', {
                      count: ingredients.length,
                      total: ingredientPagination.total
                    })}
                  </p>
                )}
              </>
            )}
          </Tab>
        </Tabs>

        {/* Recipe Modal */}
        <RecipeModal
          show={showRecipeModal}
          onHide={() => setShowRecipeModal(false)}
          recipe={editingRecipe}
          onSuccess={handleRecipeSuccess}
        />

        {/* Category Modal */}
        <RecipeCategoryModal
          show={showCategoryModal}
          onHide={() => setShowCategoryModal(false)}
          category={editingCategory}
          onSuccess={handleCategorySuccess}
        />

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('recipes.deleteTitle', 'Delete Recipe')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('recipes.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', {
                title: deletingRecipe?.title
              })}
            </p>
            <p className="text-muted small">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteRecipe}>
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Share Recipe Modal */}
        <RecipeShareModal
          show={showShareModal}
          onHide={() => setShowShareModal(false)}
          recipe={sharingRecipe}
          onSuccess={loadRecipes}
        />

        {/* Delete Category Confirmation Modal */}
        <Modal show={showDeleteCategoryModal} onHide={() => setShowDeleteCategoryModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('recipes.categories.deleteTitle', 'Delete Category')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('recipes.categories.deleteConfirm', 'Are you sure you want to delete "{{name}}"?', {
                name: deletingCategory?.name
              })}
            </p>
            <p className="text-muted small">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteCategoryModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteCategory}>
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Ingredient Modal */}
        <IngredientModal
          show={showIngredientModal}
          onHide={() => setShowIngredientModal(false)}
          ingredient={editingIngredient}
          onSuccess={handleIngredientSuccess}
        />

        {/* Delete Ingredient Confirmation Modal */}
        <Modal show={showDeleteIngredientModal} onHide={() => setShowDeleteIngredientModal(false)} centered>
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
            <Button variant="secondary" onClick={() => setShowDeleteIngredientModal(false)}>
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
                  {getIngredientCategoryLabel(viewingNutrition.category)}
                </div>
                <div className="mt-1">
                  <strong>{t('ingredients.unit', 'Default Unit')}:</strong>{' '}
                  {getUnitLabel(viewingNutrition.default_unit)}
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex w-100 justify-content-between align-items-center">
              <div>
                {canManageIngredients && viewingNutrition && (
                  <div className="d-flex gap-1">
                    <ActionButton
                      action="duplicate"
                      onClick={() => {
                        setShowNutritionModal(false);
                        handleDuplicateIngredient(viewingNutrition);
                      }}
                      title={t('common.duplicate', 'Duplicate')}
                    />
                    <ActionButton
                      action="edit"
                      onClick={() => {
                        setShowNutritionModal(false);
                        handleEditIngredient(viewingNutrition);
                      }}
                      title={t('common.edit', 'Edit')}
                    />
                    <ActionButton
                      action="delete"
                      onClick={() => {
                        setShowNutritionModal(false);
                        handleDeleteIngredient(viewingNutrition);
                      }}
                      title={t('common.delete', 'Delete')}
                    />
                  </div>
                )}
              </div>
              <Button variant="secondary" onClick={() => setShowNutritionModal(false)}>
                {t('common.close', 'Close')}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default RecipesPage;
