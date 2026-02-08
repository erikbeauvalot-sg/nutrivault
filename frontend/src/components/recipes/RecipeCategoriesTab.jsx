/**
 * RecipeCategoriesTab Component
 * Manages recipe category grid and CRUD operations
 */

import { useState } from 'react';
import { Row, Col, Card, Button, Badge, Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import RecipeCategoryModal from '../RecipeCategoryModal';
import ConfirmModal from '../ConfirmModal';
import * as recipeCategoryService from '../../services/recipeCategoryService';

const RecipeCategoriesTab = ({ categories, onCategoriesChanged, canCreate, canUpdate, canDelete }) => {
  const { t } = useTranslation();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      await recipeCategoryService.deleteCategory(deletingCategory.id);
      toast.success(t('recipes.categories.deleted', 'Category deleted successfully'));
      setDeletingCategory(null);
      onCategoriesChanged();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('recipes.categories.deleteError', 'Failed to delete category'));
    }
  };

  return (
    <>
      {canCreate && (
        <div className="d-flex justify-content-end mb-3">
          <Button variant="primary" size="sm" onClick={handleCreate}>
            {t('recipes.categories.create', 'New Category')}
          </Button>
        </div>
      )}

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
                        backgroundColor: category.color,
                        fontSize: '1.5rem'
                      }}
                    >
                      {category.icon}
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
                <p className="text-muted mb-3">{t('recipes.categories.noCategories', 'No categories yet')}</p>
                {canCreate && (
                  <Button variant="primary" onClick={handleCreate}>
                    {t('recipes.categories.createFirst', 'Create your first category')}
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      <RecipeCategoryModal
        show={showCategoryModal}
        onHide={() => setShowCategoryModal(false)}
        category={editingCategory}
        onSuccess={onCategoriesChanged}
      />

      <ConfirmModal
        show={!!deletingCategory}
        onHide={() => setDeletingCategory(null)}
        onConfirm={confirmDelete}
        title={t('recipes.categories.deleteTitle', 'Delete Category')}
        message={
          <>
            {t('recipes.categories.deleteConfirm', 'Are you sure you want to delete "{{name}}"?', {
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

export default RecipeCategoriesTab;
