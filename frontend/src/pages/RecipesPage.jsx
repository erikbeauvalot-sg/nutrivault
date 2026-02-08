/**
 * Recipes Page
 * Thin orchestrator — delegates to tab components
 */

import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import { Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import ResponsiveTabs from '../components/ResponsiveTabs';
import RecipesTab from '../components/recipes/RecipesTab';
import RecipeCategoriesTab from '../components/recipes/RecipeCategoriesTab';
import IngredientsTab from '../components/recipes/IngredientsTab';
import IngredientCategoriesTab from '../components/recipes/IngredientCategoriesTab';
import { useAuth } from '../contexts/AuthContext';
import * as recipeCategoryService from '../services/recipeCategoryService';

const isAdminOrDietitian = (user) => {
  const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
  return role === 'ADMIN' || role === 'DIETITIAN';
};

const RecipesPage = () => {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();

  const canCreate = hasPermission('recipes.create');
  const canUpdate = hasPermission('recipes.update');
  const canDelete = hasPermission('recipes.delete');
  const canShare = hasPermission('recipes.share');
  const canManageIngredients = isAdminOrDietitian(user);

  const [activeTab, setActiveTab] = useState('recipes');
  const [categories, setCategories] = useState([]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await recipeCategoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <Layout>
      <Container fluid className="py-4">
        <h2 className="mb-4">{t('recipes.title', 'Recipes')}</h2>

        <ResponsiveTabs activeKey={activeTab} onSelect={setActiveTab} id="recipes-tabs">
          <Tab eventKey="recipes" title={t('recipes.tabRecipes', 'Recipes')}>
            <RecipesTab
              categories={categories}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canShare={canShare}
            />
          </Tab>

          <Tab eventKey="categories" title={t('recipes.tabCategories', 'Categories')}>
            <RecipeCategoriesTab
              categories={categories}
              onCategoriesChanged={loadCategories}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          </Tab>

          <Tab eventKey="ingredients" title={t('recipes.tabIngredients', 'Ingredients')}>
            <IngredientsTab
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canManageIngredients={canManageIngredients}
            />
          </Tab>

          <Tab eventKey="ingredientCategories" title={t('recipes.tabIngredientCategories', 'Ingredient Categories')}>
            <IngredientCategoriesTab
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          </Tab>
        </ResponsiveTabs>
      </Container>
    </Layout>
  );
};

export default RecipesPage;
