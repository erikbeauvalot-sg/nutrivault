/**
 * IngredientCategoriesTab Component
 * Manages ingredient category grid and CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Spinner, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import IngredientCategoryModal from '../IngredientCategoryModal';
import ConfirmModal from '../ConfirmModal';
import * as ingredientCategoryService from '../../services/ingredientCategoryService';

const IngredientCategoriesTab = ({ canCreate, canUpdate, canDelete }) => {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ingredientCategoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading ingredient categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      await ingredientCategoryService.deleteCategory(deletingCategory.id);
      toast.success(t('ingredients.categories.deleted', 'Category deleted successfully'));
      setDeletingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error deleting ingredient category:', error);
      toast.error(error.response?.data?.error || t('ingredients.categories.deleteError', 'Failed to delete category'));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">{t('ingredients.categories.title', 'Manage Ingredient Categories')}</h5>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={handleCreate}>
            {t('ingredients.categories.create', 'New Category')}
          </Button>
        )}
      </div>

      <Row className="g-4">
        {categories.map(category => (
          <Col key={category.id} xs={12} sm={6} md={4} lg={3}>
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="d-flex align-items-center justify-content-center rounded"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: category.color || '#27ae60',
                        fontSize: '1.5rem'
                      }}
                    >
                      {category.icon || '🥬'}
                    </span>
                    <div>
                      <h6 className="mb-0">{category.name}</h6>
                      {category.description && (
                        <small className="text-muted">{category.description}</small>
                      )}
                    </div>
                  </div>
                  {canUpdate && (
                    <Dropdown align="end">
                      <Dropdown.Toggle variant="link" size="sm" className="p-0 text-muted">
                        ...
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleEdit(category)}>
                          {t('common.edit', 'Edit')}
                        </Dropdown.Item>
                        {canDelete && (
                          <>
                            <Dropdown.Divider />
                            <Dropdown.Item
                              className="text-danger"
                              onClick={() => setDeletingCategory(category)}
                            >
                              {t('common.delete', 'Delete')}
                            </Dropdown.Item>
                          </>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {categories.length === 0 && (
          <Col xs={12}>
            <Card className="text-center py-4">
              <Card.Body>
                <p className="text-muted mb-3">{t('ingredients.categories.noCategories', 'No ingredient categories yet')}</p>
                {canCreate && (
                  <Button variant="primary" onClick={handleCreate}>
                    {t('ingredients.categories.createFirst', 'Create your first category')}
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <IngredientCategoryModal
        show={showModal}
        onHide={() => setShowModal(false)}
        category={editingCategory}
        onSuccess={loadCategories}
      />

      <ConfirmModal
        show={!!deletingCategory}
        onHide={() => setDeletingCategory(null)}
        onConfirm={confirmDelete}
        title={t('ingredients.categories.deleteTitle', 'Delete Ingredient Category')}
        message={
          <>
            {t('ingredients.categories.deleteConfirm', 'Are you sure you want to delete "{{name}}"?', {
              name: deletingCategory?.name
            })}
            <br />
            <small className="text-muted">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</small>
          </>
        }
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </>
  );
};

export default IngredientCategoriesTab;
