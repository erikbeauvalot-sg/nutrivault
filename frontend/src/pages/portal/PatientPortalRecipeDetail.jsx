/**
 * Patient Portal Recipe Detail Page
 */

import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Badge, ListGroup, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';


const PatientPortalRecipeDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getRecipeDetail(id);
        setRecipe(data);
      } catch (err) {
        setError(t('portal.recipeNotFound', 'Recette introuvable'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, t]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  if (error || !recipe) {
    return (
      <div>
        <Alert variant="danger">{error || t('portal.recipeNotFound', 'Recette introuvable')}</Alert>
        <Button variant="outline-secondary" onClick={() => navigate('/portal/recipes')}>
          ← {t('common.back', 'Retour')}
        </Button>
      </div>
    );
  }

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/portal/recipes')}>
        {'\u2190'} {t('common.back', 'Retour aux recettes')}
      </Button>

      <Card>
        {recipe.image_url && (
          <div style={{ maxHeight: '250px', overflow: 'hidden' }}>
            <img
              src={recipe.image_url}
              alt={recipe.title}
              style={{ width: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
        <Card.Header>
          <h3 className="mb-0" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>{recipe.title}</h3>
        </Card.Header>
        <Card.Body>
          {recipe.description && <p>{recipe.description}</p>}

          <div className="d-flex gap-1 flex-wrap mb-4">
            {recipe.category && <Badge bg="info" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{recipe.category.name}</Badge>}
            {recipe.difficulty && <Badge bg="secondary">{t(`portal.recipe.difficulty.${recipe.difficulty}`, recipe.difficulty)}</Badge>}
            {recipe.servings && <Badge bg="secondary">{'\uD83D\uDC65'} {recipe.servings} {t('portal.recipe.servings', 'portions')}</Badge>}
            {recipe.prep_time_minutes > 0 && <Badge bg="secondary">{'\uD83D\uDD2A'} {recipe.prep_time_minutes} min {t('portal.recipe.prep', 'prepa')}</Badge>}
            {recipe.cook_time_minutes > 0 && <Badge bg="secondary">{'\uD83D\uDD25'} {recipe.cook_time_minutes} min {t('portal.recipe.cooking', 'cuisson')}</Badge>}
            {totalTime > 0 && <Badge bg="primary">{'\u23F1\uFE0F'} {totalTime} min {t('portal.recipe.total', 'total')}</Badge>}
          </div>

          {recipe.shared_notes && (
            <Alert variant="info">
              <strong>💬 {t('portal.dietitianNote', 'Note de votre diététicien(ne)')} :</strong><br />
              {recipe.shared_notes}
            </Alert>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <>
              <h5 className="mt-4">🥕 {t('portal.ingredients', 'Ingrédients')}</h5>
              <ListGroup className="mb-4">
                {recipe.ingredients.map(ri => (
                  <ListGroup.Item key={ri.id}>
                    {ri.quantity && <strong>{ri.quantity} </strong>}
                    {ri.unit && <span>{ri.unit} </span>}
                    {ri.ingredient?.name || ri.custom_name || '—'}
                    {ri.preparation && <span className="text-muted"> — {ri.preparation}</span>}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <>
              <h5>📝 {t('portal.instructions', 'Instructions')}</h5>
              <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>
                {recipe.instructions}
              </div>
            </>
          )}

          {recipe.source_url && (
            <div className="mt-3">
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                🔗 {t('portal.sourceUrl', 'Source de la recette')}
              </a>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PatientPortalRecipeDetail;
