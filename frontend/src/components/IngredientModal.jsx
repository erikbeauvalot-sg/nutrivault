/**
 * Ingredient Modal Component
 * Modal for creating/editing ingredients
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as ingredientService from '../services/ingredientService';
import * as ingredientCategoryService from '../services/ingredientCategoryService';

const UNITS = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

const getUnitLabel = (unit, t) => {
  return t(`ingredients.units.${unit}`, unit);
};

const ALLERGENS = [
  'gluten',
  'dairy',
  'eggs',
  'fish',
  'shellfish',
  'tree-nuts',
  'peanuts',
  'soy',
  'sesame'
];

const IngredientModal = ({ show, onHide, ingredient, onSuccess, onCreated, initialName = '' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    default_unit: 'g',
    nutrition_per_100g: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      sugar: '',
      sodium: ''
    },
    allergens: []
  });
  const [errors, setErrors] = useState({});

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await ingredientCategoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    if (show) {
      loadCategories();
    }
  }, [show, loadCategories]);

  useEffect(() => {
    // Wait for categories to be loaded before setting form data
    if (categories.length === 0) return;

    if (ingredient) {
      // Get category_id from ingredient or from ingredientCategory object
      let categoryId = ingredient.category_id || '';
      if (!categoryId && ingredient.ingredientCategory) {
        categoryId = ingredient.ingredientCategory.id;
      }
      // If still no category_id, try to map from legacy category string
      if (!categoryId && ingredient.category) {
        const legacyToKeyword = {
          proteins: ['protéines', 'proteins'],
          grains: ['céréales', 'grains'],
          vegetables: ['légumes', 'vegetables'],
          fruits: ['fruits'],
          dairy: ['produits laitiers', 'dairy'],
          oils: ['huiles', 'oils'],
          nuts: ['noix', 'nuts'],
          legumes: ['légumineuses', 'legumes'],
          spices: ['épices', 'spices'],
          condiments: ['condiments', 'sauces'],
          beverages: ['boissons', 'beverages'],
          other: ['autres', 'other']
        };
        const keywords = legacyToKeyword[ingredient.category] || [];
        const matchedCat = categories.find(c =>
          keywords.some(kw => c.name.toLowerCase().includes(kw.toLowerCase()))
        );
        if (matchedCat) {
          categoryId = matchedCat.id;
        }
      }

      setFormData({
        name: ingredient.name || '',
        category_id: categoryId,
        default_unit: ingredient.default_unit || 'g',
        nutrition_per_100g: {
          calories: ingredient.nutrition_per_100g?.calories || '',
          protein: ingredient.nutrition_per_100g?.protein || '',
          carbs: ingredient.nutrition_per_100g?.carbs || '',
          fat: ingredient.nutrition_per_100g?.fat || '',
          fiber: ingredient.nutrition_per_100g?.fiber || '',
          sugar: ingredient.nutrition_per_100g?.sugar || '',
          sodium: ingredient.nutrition_per_100g?.sodium || ''
        },
        allergens: ingredient.allergens || []
      });
    } else {
      // Find the "Other" category for default
      const otherCat = categories.find(c => c.name.toLowerCase().includes('autre') || c.name.toLowerCase().includes('other'));
      setFormData({
        name: initialName || '',
        category_id: otherCat?.id || '',
        default_unit: 'g',
        nutrition_per_100g: {
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: '',
          sugar: '',
          sodium: ''
        },
        allergens: []
      });
      // Auto-lookup if initialName is provided
      if (initialName && show) {
        handleLookupNutrition(initialName);
      }
    }
    setErrors({});
  }, [ingredient, show, initialName, categories]);

  // Legacy function - kept for backward compatibility during lookup
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleNutritionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      nutrition_per_100g: {
        ...prev.nutrition_per_100g,
        [field]: value === '' ? '' : parseFloat(value) || 0
      }
    }));
  };

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleLookupNutrition = async (searchName = null) => {
    const nameToSearch = searchName || formData.name;
    if (!nameToSearch || nameToSearch.length < 2) {
      toast.warning(t('ingredients.enterNameFirst', 'Please enter an ingredient name first'));
      return;
    }

    setLookingUp(true);
    try {
      const data = await ingredientService.lookupNutrition(nameToSearch);
      if (data) {
        // Try to map legacy category string to category_id
        let newCategoryId = formData.category_id;
        if (data.category && categories.length > 0) {
          const legacyToName = {
            proteins: ['protéines', 'proteins'],
            grains: ['céréales', 'grains'],
            vegetables: ['légumes', 'vegetables'],
            fruits: ['fruits'],
            dairy: ['produits laitiers', 'dairy'],
            oils: ['huiles', 'oils'],
            nuts: ['noix', 'nuts'],
            legumes: ['légumineuses', 'legumes'],
            spices: ['épices', 'spices'],
            condiments: ['condiments', 'sauces'],
            beverages: ['boissons', 'beverages'],
            other: ['autres', 'other']
          };
          const keywords = legacyToName[data.category] || [];
          const matchedCat = categories.find(c =>
            keywords.some(kw => c.name.toLowerCase().includes(kw.toLowerCase()))
          );
          if (matchedCat) {
            newCategoryId = matchedCat.id;
          }
        }

        setFormData(prev => ({
          ...prev,
          category_id: newCategoryId,
          nutrition_per_100g: {
            calories: data.nutrition_per_100g?.calories || prev.nutrition_per_100g.calories,
            protein: data.nutrition_per_100g?.protein || prev.nutrition_per_100g.protein,
            carbs: data.nutrition_per_100g?.carbs || prev.nutrition_per_100g.carbs,
            fat: data.nutrition_per_100g?.fat || prev.nutrition_per_100g.fat,
            fiber: data.nutrition_per_100g?.fiber || prev.nutrition_per_100g.fiber,
            sugar: data.nutrition_per_100g?.sugar || prev.nutrition_per_100g.sugar,
            sodium: data.nutrition_per_100g?.sodium || prev.nutrition_per_100g.sodium
          },
          allergens: data.allergens?.length > 0 ? data.allergens : prev.allergens
        }));
        toast.success(t('ingredients.nutritionFound', 'Nutritional data found from {{source}}', { source: data.source }));
      }
    } catch (error) {
      console.error('Error looking up nutrition:', error);
      toast.info(t('ingredients.nutritionNotFound', 'No nutritional data found. Please enter manually.'));
    } finally {
      setLookingUp(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('validation.required', 'This field is required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Clean nutrition data - remove empty values
      const nutrition = {};
      Object.entries(formData.nutrition_per_100g).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          nutrition[key] = parseFloat(value) || 0;
        }
      });

      const dataToSubmit = {
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        default_unit: formData.default_unit,
        nutrition_per_100g: Object.keys(nutrition).length > 0 ? nutrition : {},
        allergens: formData.allergens.length > 0 ? formData.allergens : []
      };

      let createdIngredient = null;
      if (ingredient) {
        await ingredientService.updateIngredient(ingredient.id, dataToSubmit);
        toast.success(t('ingredients.updated', 'Ingredient updated successfully'));
      } else {
        createdIngredient = await ingredientService.createIngredient(dataToSubmit);
        console.log('[IngredientModal] Created ingredient:', createdIngredient);
        toast.success(t('ingredients.created', 'Ingredient created successfully'));
      }
      onSuccess && onSuccess();
      console.log('[IngredientModal] onCreated exists:', !!onCreated, 'createdIngredient exists:', !!createdIngredient);
      if (createdIngredient && onCreated) {
        console.log('[IngredientModal] Calling onCreated with:', createdIngredient);
        onCreated(createdIngredient);
      }
      onHide();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {ingredient
              ? t('ingredients.edit', 'Edit Ingredient')
              : t('ingredients.create', 'New Ingredient')
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('ingredients.name', 'Name')} *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                    placeholder={t('ingredients.namePlaceholder', 'e.g., Chicken Breast')}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={() => handleLookupNutrition()}
                    disabled={lookingUp || !formData.name || formData.name.length < 2}
                    title={t('ingredients.searchNutrition', 'Search nutritional data')}
                  >
                    {lookingUp ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      '🔍'
                    )}
                  </Button>
                </InputGroup>
                <Form.Control.Feedback type="invalid">
                  {errors.name}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {t('ingredients.lookupHelp', 'Click 🔍 to auto-fill nutritional data')}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('ingredients.category', 'Category')}</Form.Label>
                <Form.Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                >
                  <option value="">{t('common.select', 'Select...')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('ingredients.unit', 'Default Unit')}</Form.Label>
                <Form.Select
                  name="default_unit"
                  value={formData.default_unit}
                  onChange={handleChange}
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{getUnitLabel(unit, t)}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-3" />

          <h6 className="mb-3">{t('ingredients.nutritionPer100g', 'Nutrition per 100g')}</h6>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.calories', 'Calories')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.calories}
                    onChange={(e) => handleNutritionChange('calories', e.target.value)}
                  />
                  <InputGroup.Text>kcal</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.protein', 'Protein')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.protein}
                    onChange={(e) => handleNutritionChange('protein', e.target.value)}
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.carbs', 'Carbs')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.carbs}
                    onChange={(e) => handleNutritionChange('carbs', e.target.value)}
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.fat', 'Fat')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.fat}
                    onChange={(e) => handleNutritionChange('fat', e.target.value)}
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.fiber', 'Fiber')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.fiber}
                    onChange={(e) => handleNutritionChange('fiber', e.target.value)}
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.sugar', 'Sugar')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.sugar}
                    onChange={(e) => handleNutritionChange('sugar', e.target.value)}
                  />
                  <InputGroup.Text>g</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>{t('nutrition.sodium', 'Sodium')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.nutrition_per_100g.sodium}
                    onChange={(e) => handleNutritionChange('sodium', e.target.value)}
                  />
                  <InputGroup.Text>mg</InputGroup.Text>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-3" />

          <Form.Group className="mb-3">
            <Form.Label>{t('ingredients.allergens', 'Allergens')}</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {ALLERGENS.map(allergen => (
                <Badge
                  key={allergen}
                  bg={formData.allergens.includes(allergen) ? 'warning' : 'light'}
                  text={formData.allergens.includes(allergen) ? 'dark' : 'muted'}
                  className="p-2"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleAllergenToggle(allergen)}
                >
                  {t(`ingredients.allergenTypes.${allergen}`, allergen)}
                </Badge>
              ))}
            </div>
            <Form.Text className="text-muted">
              {t('ingredients.allergensHelp', 'Click to select/deselect allergens')}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default IngredientModal;
