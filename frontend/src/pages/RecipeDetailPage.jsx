/**
 * Recipe Detail Page
 * Displays full recipe details with ingredients and instructions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
import { FaFilePdf, FaFileExport, FaShare, FaPlus, FaEllipsisV } from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import RecipeStatusBadge from '../components/RecipeStatusBadge';
import RecipeModal from '../components/RecipeModal';
import RecipeShareModal from '../components/RecipeShareModal';
import RecipeIngredientList from '../components/RecipeIngredientList';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import * as recipeService from '../services/recipeService';

const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingJSON, setExportingJSON] = useState(false);

  const canUpdate = hasPermission('recipes.update');
  const canDelete = hasPermission('recipes.delete');
  const canCreate = hasPermission('recipes.create');
  const canShare = hasPermission('recipes.share');

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const data = await recipeService.getRecipeById(id);
      setRecipe(data);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast.error(t('recipes.loadError', 'Failed to load recipe'));
      navigate('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tab = 'general') => {
    setEditModalTab(tab);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    try {
      await recipeService.deleteRecipe(id);
      toast.success(t('recipes.deleted', 'Recipe deleted successfully'));
      navigate('/recipes');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error(t('recipes.deleteError', 'Failed to delete recipe'));
    }
  };

  const handlePublish = async () => {
    try {
      await recipeService.publishRecipe(id);
      toast.success(t('recipes.published', 'Recipe published successfully'));
      loadRecipe();
    } catch (error) {
      console.error('Error publishing recipe:', error);
      toast.error(t('recipes.publishError', 'Failed to publish recipe'));
    }
  };

  const handleArchive = async () => {
    try {
      await recipeService.archiveRecipe(id);
      toast.success(t('recipes.archived', 'Recipe archived successfully'));
      loadRecipe();
    } catch (error) {
      console.error('Error archiving recipe:', error);
      toast.error(t('recipes.archiveError', 'Failed to archive recipe'));
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicated = await recipeService.duplicateRecipe(id);
      toast.success(t('recipes.duplicated', 'Recipe duplicated successfully'));
      navigate(`/recipes/${duplicated.id}`);
    } catch (error) {
      console.error('Error duplicating recipe:', error);
      toast.error(t('recipes.duplicateError', 'Failed to duplicate recipe'));
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
      await recipeService.exportRecipePDF(id, lang);
      toast.success(t('recipes.pdfExported', 'PDF exported successfully'));
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(t('recipes.pdfExportError', 'Failed to export PDF'));
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExportingJSON(true);
      await recipeService.exportRecipeJSON(id);
      toast.success(t('recipes.export.success', 'Recipe exported successfully'));
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error(t('recipes.export.error', 'Failed to export recipe'));
    } finally {
      setExportingJSON(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const formatTime = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getDifficultyBadge = (difficulty) => {
    const config = {
      easy: { bg: 'success', label: t('recipes.difficulty.easy', 'Easy') },
      medium: { bg: 'warning', text: 'dark', label: t('recipes.difficulty.medium', 'Medium') },
      hard: { bg: 'danger', label: t('recipes.difficulty.hard', 'Hard') }
    };
    return config[difficulty] || config.medium;
  };

  // Sanitize HTML content for safe rendering using DOMPurify
  const getSanitizedInstructions = (instructions) => {
    if (!instructions) return '';
    const htmlContent = instructions.replace(/\n/g, '<br />');
    return DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['br', 'p', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: []
    });
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  if (!recipe) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <p className="text-muted">{t('recipes.notFound', 'Recipe not found')}</p>
          <Button variant="primary" onClick={() => navigate('/recipes')}>
            {t('common.back', 'Back')}
          </Button>
        </Container>
      </Layout>
    );
  }

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const difficultyConfig = getDifficultyBadge(recipe.difficulty);

  // Render sanitized instructions safely — content is cleaned by DOMPurify above
  const sanitizedInstructions = getSanitizedInstructions(recipe.instructions);

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <div>
            <Button variant="link" className="p-0 mb-2" onClick={() => navigate('/recipes')}>
              &larr; {t('common.back', 'Back to Recipes')}
            </Button>
            <h2 className="mb-2">{recipe.title}</h2>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <RecipeStatusBadge status={recipe.status} />
              <Badge bg={difficultyConfig.bg} text={difficultyConfig.text}>
                {difficultyConfig.label}
              </Badge>
              {recipe.category && (
                <Badge
                  bg="light"
                  text="dark"
                  style={{ backgroundColor: recipe.category.color }}
                >
                  {recipe.category.icon} {recipe.category.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Desktop: all buttons visible */}
          <div className="d-none d-lg-flex flex-wrap gap-2">
            <Button variant="outline-secondary" onClick={handleExportPDF} disabled={exportingPDF}>
              <FaFilePdf className="me-1" />
              {exportingPDF ? t('common.exporting', 'Exporting...') : t('recipes.exportPDF', 'Export PDF')}
            </Button>
            <Button variant="outline-secondary" onClick={handleExportJSON} disabled={exportingJSON}>
              <FaFileExport className="me-1" />
              {exportingJSON ? t('common.exporting', 'Exporting...') : t('recipes.export.jsonButton', 'Export JSON')}
            </Button>
            {canShare && recipe.status === 'published' && (
              <Button variant="outline-primary" onClick={handleShare}>
                <FaShare className="me-1" />
                {t('recipes.share', 'Share')}
              </Button>
            )}
            {canCreate && (
              <Button variant="outline-secondary" onClick={handleDuplicate}>
                {t('common.duplicate', 'Duplicate')}
              </Button>
            )}
            {canUpdate && recipe.status === 'draft' && (
              <Button variant="success" onClick={handlePublish}>
                {t('recipes.actions.publish', 'Publish')}
              </Button>
            )}
            {canUpdate && recipe.status === 'published' && (
              <Button variant="warning" onClick={handleArchive}>
                {t('recipes.actions.archive', 'Archive')}
              </Button>
            )}
            {canUpdate && (
              <Button variant="primary" onClick={() => handleEdit()}>
                {t('common.edit', 'Edit')}
              </Button>
            )}
            {canDelete && (
              <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)}>
                {t('common.delete', 'Delete')}
              </Button>
            )}
          </div>

          {/* Mobile: primary buttons + overflow dropdown */}
          <div className="d-flex d-lg-none flex-wrap gap-2">
            {canUpdate && (
              <Button variant="primary" size="sm" onClick={() => handleEdit()}>
                {t('common.edit', 'Edit')}
              </Button>
            )}
            {canUpdate && recipe.status === 'draft' && (
              <Button variant="success" size="sm" onClick={handlePublish}>
                {t('recipes.actions.publish', 'Publish')}
              </Button>
            )}
            {canUpdate && recipe.status === 'published' && (
              <Button variant="warning" size="sm" onClick={handleArchive}>
                {t('recipes.actions.archive', 'Archive')}
              </Button>
            )}
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <FaEllipsisV />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleExportPDF} disabled={exportingPDF}>
                  <FaFilePdf className="me-2" />
                  {t('recipes.exportPDF', 'Export PDF')}
                </Dropdown.Item>
                <Dropdown.Item onClick={handleExportJSON} disabled={exportingJSON}>
                  <FaFileExport className="me-2" />
                  {t('recipes.export.jsonButton', 'Export JSON')}
                </Dropdown.Item>
                {canShare && recipe.status === 'published' && (
                  <Dropdown.Item onClick={handleShare}>
                    <FaShare className="me-2" />
                    {t('recipes.share', 'Share')}
                  </Dropdown.Item>
                )}
                {canCreate && (
                  <Dropdown.Item onClick={handleDuplicate}>
                    {t('common.duplicate', 'Duplicate')}
                  </Dropdown.Item>
                )}
                {canDelete && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger" onClick={() => setShowDeleteModal(true)}>
                      {t('common.delete', 'Delete')}
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        <Row>
          {/* Main Content */}
          <Col lg={8}>
            {/* Image */}
            {recipe.image_url ? (
              <Card className="mb-4">
                <Card.Img
                  variant="top"
                  src={recipe.image_url}
                  alt={recipe.title}
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
              </Card>
            ) : (
              <Card
                className="mb-4 d-flex align-items-center justify-content-center"
                style={{
                  height: '200px',
                  backgroundColor: recipe.category?.color || '#f8f9fa'
                }}
              >
                <span style={{ fontSize: '5rem' }}>
                  {recipe.category?.icon || '🍽️'}
                </span>
              </Card>
            )}

            {/* Description */}
            {recipe.description && (
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>{t('recipes.description', 'Description')}</Card.Title>
                  <p className="mb-0">{recipe.description}</p>
                </Card.Body>
              </Card>
            )}

            {/* Instructions — content sanitized by DOMPurify */}
            {recipe.instructions && (
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>{t('recipes.instructions', 'Instructions')}</Card.Title>
                  <div
                    className="recipe-instructions"
                    dangerouslySetInnerHTML={{ __html: sanitizedInstructions }}
                  />
                </Card.Body>
              </Card>
            )}
          </Col>

          {/* Sidebar */}
          <Col lg={4}>
            {/* Time & Servings */}
            <Card className="mb-4">
              <Card.Body>
                <Row className="text-center">
                  {recipe.prep_time_minutes && (
                    <Col xs={4}>
                      <div className="text-muted small">{t('recipes.prepTime', 'Prep')}</div>
                      <div className="fw-bold">{formatTime(recipe.prep_time_minutes)}</div>
                    </Col>
                  )}
                  {recipe.cook_time_minutes && (
                    <Col xs={4}>
                      <div className="text-muted small">{t('recipes.cookTime', 'Cook')}</div>
                      <div className="fw-bold">{formatTime(recipe.cook_time_minutes)}</div>
                    </Col>
                  )}
                  {totalTime > 0 && (
                    <Col xs={4}>
                      <div className="text-muted small">{t('recipes.totalTime', 'Total')}</div>
                      <div className="fw-bold">{formatTime(totalTime)}</div>
                    </Col>
                  )}
                </Row>
                <hr />
                <div className="text-center">
                  <div className="text-muted small">{t('recipes.servingsLabel', 'Servings')}</div>
                  <div className="fw-bold fs-4">👥 {recipe.servings}</div>
                </div>
              </Card.Body>
            </Card>

            {/* Ingredients */}
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">
                    {t('recipes.ingredients', 'Ingredients')}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <Badge bg="primary" className="ms-2" pill>{recipe.ingredients.length}</Badge>
                    )}
                  </Card.Title>
                  {canUpdate && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEdit('ingredients')}
                      title={t('ingredients.addToRecipe', 'Add Ingredient')}
                    >
                      <FaPlus />
                    </Button>
                  )}
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <RecipeIngredientList
                    ingredients={recipe.ingredients}
                    onChange={() => {}}
                    readOnly={true}
                  />
                ) : (
                  <p className="text-muted text-center py-3 mb-0">
                    {t('ingredients.noIngredients', 'No ingredients added yet')}
                  </p>
                )}
              </Card.Body>
            </Card>

            {/* Nutrition */}
            {recipe.nutrition_per_serving && Object.keys(recipe.nutrition_per_serving).length > 0 && (
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>{t('recipes.nutrition.title', 'Nutrition per Serving')}</Card.Title>
                  <div className="d-flex flex-wrap gap-2">
                    {recipe.nutrition_per_serving.calories && (
                      <Badge bg="info">
                        {recipe.nutrition_per_serving.calories} {t('recipes.nutrition.calories', 'cal')}
                      </Badge>
                    )}
                    {recipe.nutrition_per_serving.protein && (
                      <Badge bg="success">
                        {recipe.nutrition_per_serving.protein}g {t('recipes.nutrition.protein', 'protein')}
                      </Badge>
                    )}
                    {recipe.nutrition_per_serving.carbs && (
                      <Badge bg="warning" text="dark">
                        {recipe.nutrition_per_serving.carbs}g {t('recipes.nutrition.carbs', 'carbs')}
                      </Badge>
                    )}
                    {recipe.nutrition_per_serving.fat && (
                      <Badge bg="danger">
                        {recipe.nutrition_per_serving.fat}g {t('recipes.nutrition.fat', 'fat')}
                      </Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title>{t('recipes.tags', 'Tags')}</Card.Title>
                  <div className="d-flex flex-wrap gap-1">
                    {recipe.tags.map((tag, index) => (
                      <Badge key={index} bg="secondary" className="fw-normal" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Source URL */}
            {recipe.source_url && (
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title className="fs-6">{t('recipes.sourceUrl', 'Source')}</Card.Title>
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-truncate d-block small">
                    {recipe.source_url}
                  </a>
                </Card.Body>
              </Card>
            )}

            {/* Creator info */}
            {recipe.creator && (
              <Card className="mb-4">
                <Card.Body>
                  <small className="text-muted">
                    {t('recipes.createdBy', 'Created by')}: {recipe.creator.first_name} {recipe.creator.last_name}
                  </small>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>

        {/* Edit Modal */}
        <RecipeModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          recipe={recipe}
          onSuccess={loadRecipe}
          initialTab={editModalTab}
        />

        {/* Delete Confirmation */}
        <ConfirmModal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title={t('recipes.deleteTitle', 'Delete Recipe')}
          message={
            <>
              {t('recipes.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', {
                title: recipe.title
              })}
              <br />
              <small className="text-muted">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</small>
            </>
          }
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Share Modal */}
        <RecipeShareModal
          show={showShareModal}
          onHide={() => setShowShareModal(false)}
          recipe={recipe}
          onSuccess={loadRecipe}
        />
      </Container>
    </Layout>
  );
};

export default RecipeDetailPage;
