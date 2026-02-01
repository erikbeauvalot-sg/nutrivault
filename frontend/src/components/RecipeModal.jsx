/**
 * Recipe Modal Component
 * Modal for creating/editing recipes
 */

import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col, Spinner, Badge, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as recipeService from '../services/recipeService';
import * as recipeCategoryService from '../services/recipeCategoryService';
import RecipeIngredientList from './RecipeIngredientList';

const RecipeModal = ({ show, onHide, recipe, onSuccess, initialTab = 'general' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [ingredients, setIngredients] = useState([]);
  const prevShowRef = useRef(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: 4,
    difficulty: 'medium',
    category_id: '',
    image_url: '',
    tags: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (recipe) {
      setFormData({
        title: recipe.title || '',
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        prep_time_minutes: recipe.prep_time_minutes || '',
        cook_time_minutes: recipe.cook_time_minutes || '',
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || 'medium',
        category_id: recipe.category_id || '',
        image_url: recipe.image_url || '',
        tags: recipe.tags || []
      });
      // Load ingredients if editing
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        setIngredients(recipe.ingredients.map(ing => ({
          ingredient_id: ing.ingredient_id,
          ingredient: ing.ingredient,
          quantity: ing.quantity || '',
          unit: ing.unit || 'g',
          notes: ing.notes || '',
          is_optional: ing.is_optional || false,
          display_order: ing.display_order
        })));
      } else {
        setIngredients([]);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        instructions: '',
        prep_time_minutes: '',
        cook_time_minutes: '',
        servings: 4,
        difficulty: 'medium',
        category_id: '',
        image_url: '',
        tags: []
      });
      setIngredients([]);
    }
    setErrors({});
    setTagInput('');

    // Set active tab when modal opens (show changes from false to true)
    if (show && !prevShowRef.current) {
      setActiveTab(initialTab);
    }
    prevShowRef.current = show;
  }, [recipe, show, initialTab]);

  const loadCategories = async () => {
    try {
      const data = await recipeCategoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = t('validation.required', 'This field is required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        prep_time_minutes: formData.prep_time_minutes === '' ? null : formData.prep_time_minutes,
        cook_time_minutes: formData.cook_time_minutes === '' ? null : formData.cook_time_minutes,
        category_id: formData.category_id || null,
        ingredients: ingredients.map((ing, index) => ({
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity === '' ? null : parseFloat(ing.quantity),
          unit: ing.unit || 'g',
          notes: ing.notes || null,
          is_optional: ing.is_optional || false,
          display_order: index
        }))
      };

      if (recipe) {
        await recipeService.updateRecipe(recipe.id, dataToSubmit);
        toast.success(t('recipes.updated', 'Recipe updated successfully'));
      } else {
        await recipeService.createRecipe(dataToSubmit);
        toast.success(t('recipes.created', 'Recipe created successfully'));
      }
      onSuccess && onSuccess();
      onHide();
    } catch (error) {
      console.error('Error saving recipe:', error);
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
            {recipe
              ? t('recipes.edit', 'Edit Recipe')
              : t('recipes.create', 'Create Recipe')
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="general" title={t('recipes.tabs.general', 'General')}>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.title', 'Title')} *</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      isInvalid={!!errors.title}
                      placeholder={t('recipes.titlePlaceholder', 'e.g., Grilled Salmon with Vegetables')}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.title}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.category', 'Category')}</Form.Label>
                    <Form.Select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                    >
                      <option value="">{t('recipes.noCategory', 'No category')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>{t('recipes.description', 'Description')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('recipes.descriptionPlaceholder', 'Brief description of the recipe')}
                />
              </Form.Group>

              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.prepTime', 'Prep Time')} (min)</Form.Label>
                    <Form.Control
                      type="number"
                      name="prep_time_minutes"
                      value={formData.prep_time_minutes}
                      onChange={handleChange}
                      min={0}
                      placeholder="15"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.cookTime', 'Cook Time')} (min)</Form.Label>
                    <Form.Control
                      type="number"
                      name="cook_time_minutes"
                      value={formData.cook_time_minutes}
                      onChange={handleChange}
                      min={0}
                      placeholder="30"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.servingsLabel', 'Servings')}</Form.Label>
                    <Form.Control
                      type="number"
                      name="servings"
                      value={formData.servings}
                      onChange={handleChange}
                      min={1}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('recipes.difficultyLabel', 'Difficulty')}</Form.Label>
                    <Form.Select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                    >
                      <option value="easy">{t('recipes.difficulty.easy', 'Easy')}</option>
                      <option value="medium">{t('recipes.difficulty.medium', 'Medium')}</option>
                      <option value="hard">{t('recipes.difficulty.hard', 'Hard')}</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>{t('recipes.imageUrl', 'Image URL')}</Form.Label>
                <Form.Control
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('recipes.tags', 'Tags')}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={t('recipes.tagsPlaceholder', 'Type and press Enter to add')}
                  />
                  <Button variant="outline-secondary" onClick={handleAddTag} type="button">
                    {t('common.add', 'Add')}
                  </Button>
                </InputGroup>
                {formData.tags.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        bg="secondary"
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        #{tag}
                        <span>&times;</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </Form.Group>
            </Tab>

            <Tab eventKey="ingredients" title={
              <span>
                {t('recipes.tabs.ingredients', 'Ingredients')}
                {ingredients.length > 0 && (
                  <Badge bg="primary" className="ms-2" pill>{ingredients.length}</Badge>
                )}
              </span>
            }>
              <RecipeIngredientList
                ingredients={ingredients}
                onChange={setIngredients}
              />
            </Tab>

            <Tab eventKey="instructions" title={t('recipes.tabs.instructions', 'Instructions')}>
              <Form.Group className="mb-3">
                <Form.Label>{t('recipes.instructions', 'Instructions')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={12}
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  placeholder={t('recipes.instructionsPlaceholder', 'Step by step cooking instructions...')}
                />
                <Form.Text className="text-muted">
                  {t('recipes.instructionsHelp', 'You can use simple formatting. Each paragraph will be a step.')}
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
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

export default RecipeModal;
