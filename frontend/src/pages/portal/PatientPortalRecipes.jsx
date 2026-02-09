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
      <h2 className="mb-4">🍽️ {t('portal.nav.recipes', 'Mes recettes')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {recipes.length === 0 ? (
        <Alert variant="info">{t('portal.noRecipes', 'Aucune recette partagée')}</Alert>
      ) : (
        <Row className="g-4">
          {recipes.map(access => {
            const recipe = access.recipe;
            if (!recipe) return null;
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

            return (
              <Col key={access.id} md={6} lg={4}>
                <Card
                  className="h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/portal/recipes/${recipe.id}`)}
                >
                  <Card.Body>
                    <Card.Title>{recipe.title}</Card.Title>
                    {recipe.description && (
                      <Card.Text className="text-muted small">
                        {recipe.description.length > 100
                          ? recipe.description.substring(0, 100) + '...'
                          : recipe.description}
                      </Card.Text>
                    )}
                    <div className="d-flex gap-2 flex-wrap">
                      {recipe.category && (
                        <Badge bg="info">{recipe.category.name}</Badge>
                      )}
                      {recipe.difficulty && (
                        <Badge bg={difficultyVariant[recipe.difficulty]}>
                          {t(`portal.recipe.difficulty.${recipe.difficulty}`, recipe.difficulty)}
                        </Badge>
                      )}
                      {totalTime > 0 && (
                        <Badge bg="secondary">⏱️ {totalTime} min</Badge>
                      )}
                      {recipe.servings && (
                        <Badge bg="secondary">👥 {recipe.servings}</Badge>
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
