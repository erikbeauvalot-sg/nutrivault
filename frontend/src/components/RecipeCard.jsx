/**
 * Recipe Card Component
 * Displays a recipe summary in a card format
 */

import { Card, Badge, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';
import RecipeStatusBadge from './RecipeStatusBadge';

const RecipeCard = ({ recipe, onEdit, onDelete, onDuplicate, onPublish, onArchive, onShare, onExportJSON, onClick }) => {
  const { t } = useTranslation();

  const getDifficultyBadge = (difficulty) => {
    const config = {
      easy: { bg: 'success', label: t('recipes.difficulty.easy', 'Easy') },
      medium: { bg: 'warning', text: 'dark', label: t('recipes.difficulty.medium', 'Medium') },
      hard: { bg: 'danger', label: t('recipes.difficulty.hard', 'Hard') }
    };
    return config[difficulty] || config.medium;
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

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
  const difficultyConfig = getDifficultyBadge(recipe.difficulty);

  const hasAnyAction = onEdit || onDelete || onDuplicate || onPublish || onArchive || onShare || onExportJSON;

  return (
    <Card className="h-100 recipe-card">
      {recipe.image_url ? (
        <div
          className="recipe-card-image"
          style={{ height: '160px', cursor: 'pointer', overflow: 'hidden' }}
          onClick={() => onClick && onClick(recipe)}
        >
          <img
            src={recipe.image_url}
            alt={recipe.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <div
          className="recipe-card-image d-flex align-items-center justify-content-center"
          style={{
            height: '160px',
            backgroundColor: recipe.category?.color || '#f8f9fa',
            cursor: 'pointer'
          }}
          onClick={() => onClick && onClick(recipe)}
        >
          <span style={{ fontSize: '3rem' }}>
            {recipe.category?.icon || '🍽️'}
          </span>
        </div>
      )}

      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title
            className="mb-0 text-truncate flex-grow-1"
            style={{ cursor: 'pointer' }}
            onClick={() => onClick && onClick(recipe)}
          >
            {recipe.title}
          </Card.Title>
          {hasAnyAction && (
            <Dropdown align="end" onClick={(e) => e.stopPropagation()}>
              <Dropdown.Toggle variant="link" size="sm" className="p-0 text-muted">
                <span>...</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {onEdit && (
                  <Dropdown.Item onClick={() => onEdit(recipe)}>
                    {t('common.edit', 'Edit')}
                  </Dropdown.Item>
                )}
                {onDuplicate && (
                  <Dropdown.Item onClick={() => onDuplicate(recipe)}>
                    {t('common.duplicate', 'Duplicate')}
                  </Dropdown.Item>
                )}
                {onPublish && recipe.status === 'draft' && (
                  <Dropdown.Item onClick={() => onPublish(recipe)}>
                    {t('recipes.actions.publish', 'Publish')}
                  </Dropdown.Item>
                )}
                {onArchive && recipe.status === 'published' && (
                  <Dropdown.Item onClick={() => onArchive(recipe)}>
                    {t('recipes.actions.archive', 'Archive')}
                  </Dropdown.Item>
                )}
                {onShare && recipe.status === 'published' && (
                  <Dropdown.Item onClick={() => onShare(recipe)}>
                    {t('recipes.actions.share', 'Share with Patient')}
                  </Dropdown.Item>
                )}
                {onExportJSON && (
                  <Dropdown.Item onClick={() => onExportJSON(recipe)}>
                    {t('recipes.export.jsonButton', 'Export JSON')}
                  </Dropdown.Item>
                )}
                {onDelete && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => onDelete(recipe)}
                    >
                      {t('common.delete', 'Delete')}
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        {recipe.description && (
          <Card.Text className="text-muted small mb-2" style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {recipe.description}
          </Card.Text>
        )}

        <div className="mt-auto">
          <div className="d-flex flex-wrap gap-1 mb-2" style={{ minWidth: 0 }}>
            <RecipeStatusBadge status={recipe.status} />
            {recipe.visibility === 'public' && (
              <Badge bg="info">
                <FaGlobe className="me-1" style={{ fontSize: '0.7em' }} />
                {t('recipes.public', 'Public')}
              </Badge>
            )}
            <Badge bg={difficultyConfig.bg} text={difficultyConfig.text}>
              {difficultyConfig.label}
            </Badge>
            {recipe.category && (
              <Badge
                bg="light"
                text="dark"
                className="text-truncate"
                style={{ backgroundColor: recipe.category.color, maxWidth: '100%' }}
              >
                {recipe.category.icon} {recipe.category.name}
              </Badge>
            )}
          </div>

          <div className="d-flex justify-content-between text-muted small">
            {totalTime > 0 && (
              <span>
                <span role="img" aria-label="time">⏱️</span> {formatTime(totalTime)}
              </span>
            )}
            {recipe.servings && (
              <span>
                <span role="img" aria-label="servings">👥</span> {recipe.servings} {t('recipes.servings', 'servings')}
              </span>
            )}
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-2 d-flex flex-wrap gap-1" style={{ minWidth: 0 }}>
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} bg="light" text="dark" className="fw-normal text-truncate" style={{ maxWidth: '100%' }}>
                  #{tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge bg="light" text="muted" className="fw-normal">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default RecipeCard;
