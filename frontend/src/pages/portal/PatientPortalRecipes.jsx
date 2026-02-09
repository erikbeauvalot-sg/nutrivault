/**
 * Patient Portal Recipes Page
 * View shared recipes
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';

const difficultyVariant = { easy: 'success', medium: 'warning', hard: 'danger' };

const PatientPortalRecipes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getRecipes();
        setRecipes(data || []);
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>{'\uD83C\uDF7D\uFE0F'} {t('portal.nav.recipes', 'Mes recettes')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {recipes.length === 0 ? (
        <Alert variant="info">{t('portal.noRecipes', 'Aucune recette partagée')}</Alert>
      ) : (
        <Row className="g-3">
          {recipes.map(access => {
            const recipe = access.recipe;
            if (!recipe) return null;
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

            return (
              <Col key={access.id} xs={12} sm={6} lg={4}>
                <Card
                  className="h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/portal/recipes/${recipe.id}`)}
                >
                  {recipe.image_url ? (
                    <div style={{ height: '180px', overflow: 'hidden' }}>
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{ height: '180px', backgroundColor: '#f0f7f0' }}
                    >
                      <span style={{ fontSize: '3rem' }}>🍽️</span>
                    </div>
                  )}
                  <Card.Body>
                    <Card.Title>{recipe.title}</Card.Title>
                    {recipe.description && (
                      <Card.Text className="text-muted small">
                        {recipe.description.length > 100
                          ? recipe.description.substring(0, 100) + '...'
                          : recipe.description}
                      </Card.Text>
                    )}
                    <div className="d-flex gap-1 flex-wrap" style={{ minWidth: 0 }}>
                      {recipe.category && (
                        <Badge bg="info" className="text-truncate" style={{ maxWidth: '100%' }}>{recipe.category.name}</Badge>
                      )}
                      {recipe.difficulty && (
                        <Badge bg={difficultyVariant[recipe.difficulty]}>
                          {t(`portal.recipe.difficulty.${recipe.difficulty}`, recipe.difficulty)}
                        </Badge>
                      )}
                      {totalTime > 0 && (
                        <Badge bg="secondary">{'\u23F1\uFE0F'} {totalTime} min</Badge>
                      )}
                      {recipe.servings && (
                        <Badge bg="secondary">{'\uD83D\uDC65'} {recipe.servings}</Badge>
                      )}
                    </div>
                  </Card.Body>
                  <Card.Footer className="text-muted small">
                    {t('portal.sharedBy', 'Partagé par')}{' '}
                    {access.sharedByUser
                      ? `${access.sharedByUser.first_name} ${access.sharedByUser.last_name}`
                      : '—'}{' '}
                    • {new Date(access.created_at).toLocaleDateString('fr-FR')}
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default PatientPortalRecipes;
