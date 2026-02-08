/**
 * RecipesTab Component
 * Manages recipe list, filters, pagination, and CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FaFileExport, FaFileImport } from 'react-icons/fa';
import RecipeCard from '../RecipeCard';
import RecipeModal from '../RecipeModal';
import RecipeShareModal from '../RecipeShareModal';
import RecipeImportModal from '../RecipeImportModal';
import ConfirmModal from '../ConfirmModal';
import * as recipeService from '../../services/recipeService';

const RecipesTab = ({ categories, canCreate, canUpdate, canDelete, canShare }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState([]);
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
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingRecipe, setSharingRecipe] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(null);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedCategory, selectedStatus, selectedDifficulty, t]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

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

  const confirmDeleteRecipe = async () => {
    if (!deletingRecipe) return;
    try {
      await recipeService.deleteRecipe(deletingRecipe.id);
      toast.success(t('recipes.deleted', 'Recipe deleted successfully'));
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

  const handleExportRecipeJSON = async (recipe) => {
    try {
      await recipeService.exportRecipeJSON(recipe.id);
      toast.success(t('recipes.export.success', 'Recipe exported successfully'));
    } catch (error) {
      console.error('Error exporting recipe:', error);
      toast.error(t('recipes.export.error', 'Failed to export recipe'));
    }
  };

  const handleExportAll = async () => {
    try {
      setExporting(true);
      await recipeService.exportRecipesJSON();
      toast.success(t('recipes.export.success', 'Recipes exported successfully'));
    } catch (error) {
      console.error('Error exporting recipes:', error);
      toast.error(t('recipes.export.error', 'Failed to export recipes'));
    } finally {
      setExporting(false);
    }
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
    <>
      {/* Action bar */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button variant="outline-secondary" size="sm" onClick={handleExportAll} disabled={exporting}>
          <FaFileExport className="me-1" />
          {exporting ? t('common.exporting', 'Exporting...') : t('recipes.export.jsonButton', 'Export JSON')}
        </Button>
        {canCreate && (
          <Button variant="outline-secondary" size="sm" onClick={() => setShowImportModal(true)}>
            <FaFileImport className="me-1" />
            {t('recipes.import.button', 'Import')}
          </Button>
        )}
        {canCreate && (
          <Button variant="primary" size="sm" onClick={handleCreateRecipe}>
            {t('recipes.createRecipe', 'New Recipe')}
          </Button>
        )}
      </div>

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
                  onDelete={canDelete ? ((r) => setDeletingRecipe(r)) : undefined}
                  onDuplicate={canCreate ? handleDuplicateRecipe : undefined}
                  onPublish={canUpdate ? handlePublishRecipe : undefined}
                  onArchive={canUpdate ? handleArchiveRecipe : undefined}
                  onShare={canShare && recipe.status === 'published' ? ((r) => { setSharingRecipe(r); setShowShareModal(true); }) : undefined}
                  onExportJSON={handleExportRecipeJSON}
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
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                      {t('common.previous', 'Previous')}
                    </button>
                  </li>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                      </button>
                    </li>
                  ))}
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
                count: recipes.length,
                total: pagination.total
              })}
            </p>
          )}
        </>
      )}

      {/* Modals */}
      <RecipeModal
        show={showRecipeModal}
        onHide={() => setShowRecipeModal(false)}
        recipe={editingRecipe}
        onSuccess={loadRecipes}
      />

      <RecipeShareModal
        show={showShareModal}
        onHide={() => setShowShareModal(false)}
        recipe={sharingRecipe}
        onSuccess={loadRecipes}
      />

      <RecipeImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onSuccess={loadRecipes}
      />

      <ConfirmModal
        show={!!deletingRecipe}
        onHide={() => setDeletingRecipe(null)}
        onConfirm={confirmDeleteRecipe}
        title={t('recipes.deleteTitle', 'Delete Recipe')}
        message={
          <>
            {t('recipes.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', {
              title: deletingRecipe?.title
            })}
            <br />
            <small className="text-muted">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</small>
          </>
        }
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </>
  );
};

export default RecipesTab;
