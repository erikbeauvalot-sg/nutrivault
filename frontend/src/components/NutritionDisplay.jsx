/**
 * Nutrition Display Component
 * Displays nutritional information for a recipe
 */

import { Card, Row, Col, ProgressBar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const NutritionDisplay = ({ nutrition, servings = 1, compact = false, showTitle = true }) => {
  const { t } = useTranslation();

  if (!nutrition || Object.keys(nutrition).length === 0) {
    return (
      <p className="text-muted mb-0">
        {t('nutrition.noData', 'No nutritional data available')}
      </p>
    );
  }

  const nutrients = [
    {
      key: 'calories',
      label: t('recipes.nutrition.calories', 'Calories'),
      unit: 'kcal',
      color: 'primary',
      max: 800
    },
    {
      key: 'protein',
      label: t('recipes.nutrition.protein', 'Protein'),
      unit: 'g',
      color: 'success',
      max: 50
    },
    {
      key: 'carbs',
      label: t('recipes.nutrition.carbs', 'Carbs'),
      unit: 'g',
      color: 'warning',
      max: 100
    },
    {
      key: 'fat',
      label: t('recipes.nutrition.fat', 'Fat'),
      unit: 'g',
      color: 'danger',
      max: 50
    },
    {
      key: 'fiber',
      label: t('recipes.nutrition.fiber', 'Fiber'),
      unit: 'g',
      color: 'info',
      max: 30
    },
    {
      key: 'sodium',
      label: t('recipes.nutrition.sodium', 'Sodium'),
      unit: 'mg',
      color: 'secondary',
      max: 2000
    }
  ];

  const availableNutrients = nutrients.filter(n => nutrition[n.key] !== undefined);

  if (availableNutrients.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="d-flex flex-wrap gap-3">
        {availableNutrients.map(nutrient => (
          <div key={nutrient.key} className="text-center">
            <div className="small text-muted">{nutrient.label}</div>
            <div className="fw-bold">
              {Math.round(nutrition[nutrient.key])} {nutrient.unit}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <Card.Body>
        {showTitle && (
          <Card.Title className="mb-3">
            {t('recipes.nutrition.title', 'Nutrition per Serving')}
          </Card.Title>
        )}
        <Row className="g-3">
          {availableNutrients.map(nutrient => {
            const value = nutrition[nutrient.key];
            const percentage = Math.min(100, (value / nutrient.max) * 100);

            return (
              <Col key={nutrient.key} xs={6} md={4}>
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">{nutrient.label}</small>
                  <small className="fw-bold">
                    {Math.round(value)} {nutrient.unit}
                  </small>
                </div>
                <ProgressBar
                  now={percentage}
                  variant={nutrient.color}
                  style={{ height: '6px' }}
                />
              </Col>
            );
          })}
        </Row>
      </Card.Body>
    </Card>
  );
};

export default NutritionDisplay;
