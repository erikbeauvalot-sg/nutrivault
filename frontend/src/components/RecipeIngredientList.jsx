/**
 * Recipe Ingredient List Component
 * Manages ingredients for a recipe in create/edit mode
 */

import { useState } from 'react';
import { Table, Button, Form, Badge, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import IngredientSelector from './IngredientSelector';

const UNITS = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

const getUnitLabel = (unit, t) => {
  const unitLabels = {
    'g': t('ingredients.units.g', 'g'),
    'kg': t('ingredients.units.kg', 'kg'),
    'ml': t('ingredients.units.ml', 'ml'),
    'l': t('ingredients.units.l', 'L'),
    'cup': t('ingredients.units.cup', 'tasse'),
    'tbsp': t('ingredients.units.tbsp', 'c. à soupe'),
    'tsp': t('ingredients.units.tsp', 'c. à café'),
    'piece': t('ingredients.units.piece', 'pièce'),
    'slice': t('ingredients.units.slice', 'tranche')
  };
  return unitLabels[unit] || unit;
};

const RecipeIngredientList = ({ ingredients, onChange, readOnly = false }) => {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddIngredient = (ingredient) => {
    console.log('[RecipeIngredientList] handleAddIngredient called with:', ingredient);
    const newIngredient = {
      ingredient_id: ingredient.id,
      ingredient: ingredient,
      quantity: '',
      unit: ingredient.default_unit || 'g',
      notes: '',
      is_optional: false,
      display_order: ingredients.length
    };
    console.log('[RecipeIngredientList] Created newIngredient:', newIngredient);
    console.log('[RecipeIngredientList] Current ingredients count:', ingredients.length);
    onChange([...ingredients, newIngredient]);
    console.log('[RecipeIngredientList] onChange called');
  };

  const handleUpdateIngredient = (index, field, value) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange(updated);
  };

  const handleRemoveIngredient = (index) => {
    const updated = ingredients.filter((_, i) => i !== index);
    // Update display_order
    updated.forEach((ing, i) => {
      ing.display_order = i;
    });
    onChange(updated);
  };

  const handleMoveIngredient = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;

    const updated = [...ingredients];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    // Update display_order
    updated.forEach((ing, i) => {
      ing.display_order = i;
    });
    onChange(updated);
  };

  const calculateTotalNutrition = () => {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    ingredients.forEach(item => {
      const nutrition = item.ingredient?.nutrition_per_100g;
      if (nutrition && item.quantity && item.unit === 'g') {
        const factor = parseFloat(item.quantity) / 100;
        if (nutrition.calories) totals.calories += nutrition.calories * factor;
        if (nutrition.protein) totals.protein += nutrition.protein * factor;
        if (nutrition.carbs) totals.carbs += nutrition.carbs * factor;
        if (nutrition.fat) totals.fat += nutrition.fat * factor;
        if (nutrition.fiber) totals.fiber += nutrition.fiber * factor;
      }
    });

    return totals;
  };

  const excludeIds = ingredients.map(i => i.ingredient_id);
  const totalNutrition = calculateTotalNutrition();
  const hasTotals = Object.values(totalNutrition).some(v => v > 0);

  return (
    <div className="recipe-ingredient-list">
      {/* Add Ingredient */}
      {!readOnly && (
        <div className="mb-3">
          <Form.Label>{t('ingredients.addToRecipe', 'Add Ingredient')}</Form.Label>
          <IngredientSelector
            onSelect={handleAddIngredient}
            excludeIds={excludeIds}
            placeholder={t('ingredients.searchToAdd', 'Search to add ingredient...')}
          />
        </div>
      )}

      {/* Ingredient List */}
      {ingredients.length === 0 ? (
        <p className="text-muted text-center py-3">
          {t('ingredients.noIngredients', 'No ingredients added yet')}
        </p>
      ) : (
        <>
          <Table responsive hover size="sm">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>{t('ingredients.name', 'Ingredient')}</th>
                <th style={{ width: '15%' }}>{t('ingredients.quantity', 'Quantity')}</th>
                <th style={{ width: '15%' }}>{t('ingredients.unit', 'Unit')}</th>
                <th style={{ width: '20%' }}>{t('ingredients.notes', 'Notes')}</th>
                <th style={{ width: '10%' }} className="text-center">{t('ingredients.optional', 'Optional')}</th>
                {!readOnly && <th style={{ width: '10%' }}></th>}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item, index) => (
                <tr key={item.ingredient_id || index}>
                  <td>
                    <div className="d-flex align-items-center">
                      {!readOnly && (
                        <div className="me-2 d-flex flex-column">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted"
                            onClick={() => handleMoveIngredient(index, 'up')}
                            disabled={index === 0}
                          >
                            &#9650;
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted"
                            onClick={() => handleMoveIngredient(index, 'down')}
                            disabled={index === ingredients.length - 1}
                          >
                            &#9660;
                          </Button>
                        </div>
                      )}
                      <div>
                        <strong>{item.ingredient?.name || 'Unknown'}</strong>
                        {item.ingredient?.category && (
                          <Badge bg="light" text="dark" className="ms-2" pill>
                            {t(`ingredients.categories.${item.ingredient.category}`, item.ingredient.category)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {readOnly ? (
                      <span>{item.quantity || '-'}</span>
                    ) : (
                      <Form.Control
                        type="number"
                        size="sm"
                        min="0"
                        step="0.1"
                        value={item.quantity || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'quantity', e.target.value)}
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <span>{getUnitLabel(item.unit, t) || '-'}</span>
                    ) : (
                      <Form.Select
                        size="sm"
                        value={item.unit || 'g'}
                        onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                      >
                        {UNITS.map(unit => (
                          <option key={unit} value={unit}>{getUnitLabel(unit, t)}</option>
                        ))}
                      </Form.Select>
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      <span className="text-muted small">{item.notes || '-'}</span>
                    ) : (
                      <Form.Control
                        type="text"
                        size="sm"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateIngredient(index, 'notes', e.target.value)}
                        placeholder={t('ingredients.notesPlaceholder', 'e.g., chopped')}
                      />
                    )}
                  </td>
                  <td className="text-center">
                    {readOnly ? (
                      item.is_optional && (
                        <Badge bg="secondary" pill>
                          {t('ingredients.optional', 'Optional')}
                        </Badge>
                      )
                    ) : (
                      <Form.Check
                        type="checkbox"
                        checked={item.is_optional || false}
                        onChange={(e) => handleUpdateIngredient(index, 'is_optional', e.target.checked)}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="text-end">
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        onClick={() => handleRemoveIngredient(index)}
                      >
                        &#10005;
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Nutrition Summary */}
          {hasTotals && (
            <div className="mt-3 p-3 bg-light rounded">
              <h6 className="mb-2">{t('nutrition.estimatedTotal', 'Estimated Total Nutrition')}</h6>
              <div className="d-flex flex-wrap gap-4">
                <div>
                  <small className="text-muted">{t('nutrition.calories', 'Calories')}</small>
                  <div className="fw-bold">{Math.round(totalNutrition.calories)} kcal</div>
                </div>
                <div>
                  <small className="text-muted">{t('nutrition.protein', 'Protein')}</small>
                  <div className="fw-bold">{Math.round(totalNutrition.protein * 10) / 10}g</div>
                </div>
                <div>
                  <small className="text-muted">{t('nutrition.carbs', 'Carbs')}</small>
                  <div className="fw-bold">{Math.round(totalNutrition.carbs * 10) / 10}g</div>
                </div>
                <div>
                  <small className="text-muted">{t('nutrition.fat', 'Fat')}</small>
                  <div className="fw-bold">{Math.round(totalNutrition.fat * 10) / 10}g</div>
                </div>
                <div>
                  <small className="text-muted">{t('nutrition.fiber', 'Fiber')}</small>
                  <div className="fw-bold">{Math.round(totalNutrition.fiber * 10) / 10}g</div>
                </div>
              </div>
              <small className="text-muted d-block mt-2">
                {t('nutrition.estimatedNote', 'Based on ingredients with quantity in grams')}
              </small>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecipeIngredientList;
