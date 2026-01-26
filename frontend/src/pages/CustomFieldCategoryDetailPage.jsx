/**
 * CustomFieldCategoryDetailPage Component
 * View page for a custom field category
 * Shows category details and its field definitions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import customFieldService from '../services/customFieldService';
import CustomFieldCategoryModal from '../components/CustomFieldCategoryModal';
import CustomFieldDefinitionModal from '../components/CustomFieldDefinitionModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

const CustomFieldCategoryDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(null);
  const [definitions, setDefinitions] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [showDeleteDefinitionConfirm, setShowDeleteDefinitionConfirm] = useState(false);
  const [definitionToDelete, setDefinitionToDelete] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesRes, definitionsRes] = await Promise.all([
        customFieldService.getCategories(),
        customFieldService.getDefinitions()
      ]);

      const categories = categoriesRes || [];
      const allDefs = definitionsRes || [];

      // Find the category
      const foundCategory = categories.find(c => c.id === id);
      if (!foundCategory) {
        setError(t('customFields.categoryNotFound', 'Category not found'));
        setLoading(false);
        return;
      }

      setCategory(foundCategory);
      setAllCategories(categories);

      // Filter definitions for this category
      const categoryDefs = allDefs.filter(d => d.category_id === id);
      setDefinitions(categoryDefs);
    } catch (err) {
      console.error('Error fetching category data:', err);
      setError(err.response?.data?.error || err.message || t('customFields.failedToLoad', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = () => {
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = () => {
    if (definitions.length > 0) {
      setError(t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields'));
      return;
    }

    setShowDeleteCategoryConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    try {
      await customFieldService.deleteCategory(id);
      navigate('/settings/custom-fields');
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.response?.data?.error || t('customFields.deleteError', 'Failed to delete category'));
    }
  };

  const handleCreateDefinition = () => {
    setSelectedDefinition(null);
    setShowDefinitionModal(true);
  };

  const handleEditDefinition = (definition) => {
    setSelectedDefinition(definition);
    setShowDefinitionModal(true);
  };

  const handleDeleteDefinition = (definitionId) => {
    setDefinitionToDelete(definitionId);
    setShowDeleteDefinitionConfirm(true);
  };

  const confirmDeleteDefinition = async () => {
    if (!definitionToDelete) return;

    try {
      await customFieldService.deleteDefinition(definitionToDelete);
      fetchData();
    } catch (err) {
      console.error('Error deleting definition:', err);
      setError(err.response?.data?.error || t('customFields.deleteFieldError', 'Failed to delete field'));
    } finally {
      setDefinitionToDelete(null);
    }
  };

  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      date: '📅',
      select: '📋',
      boolean: '☑️',
      calculated: '🧮'
    };
    return icons[type] || '❓';
  };

  const getFieldTypeBadgeVariant = (type) => {
    const variants = {
      text: 'primary',
      textarea: 'info',
      number: 'success',
      date: 'warning',
      select: 'secondary',
      boolean: 'dark',
      calculated: 'danger'
    };
    return variants[type] || 'secondary';
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4 text-center">
          <Spinner animation="border" />
          <p>{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  if (error || !category) {
    return (
      <Layout>
        <Container className="mt-4">
          <Alert variant="danger">
            {error || t('customFields.categoryNotFound', 'Category not found')}
          </Alert>
          <Button variant="secondary" onClick={() => navigate('/settings/custom-fields')}>
            ← {t('common.back', 'Back')}
          </Button>
        </Container>
      </Layout>
    );
  }

  const entityTypes = category.entity_types || ['patient'];
  const hasPatient = entityTypes.includes('patient');
  const hasVisit = entityTypes.includes('visit');

  return (
    <Layout>
      <Container className="mt-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <Button
                  variant="link"
                  className="p-0 mb-2"
                  onClick={() => navigate('/settings/custom-fields')}
                >
                  ← {t('customFields.backToList', 'Back to Custom Fields')}
                </Button>
                <h1>📁 {category.name}</h1>
                {category.description && (
                  <p className="text-muted">{category.description}</p>
                )}
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" onClick={handleEditCategory}>
                  ✏️ {t('common.edit', 'Edit')}
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={handleDeleteCategory}
                  disabled={definitions.length > 0}
                  title={definitions.length > 0 ? t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields') : ''}
                >
                  🗑️ {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Category Info Card */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">{t('customFields.categoryInfo', 'Category Information')}</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <dl className="row mb-0">
                  <dt className="col-sm-4">{t('customFields.categoryName', 'Name')}</dt>
                  <dd className="col-sm-8"><strong>{category.name}</strong></dd>

                  <dt className="col-sm-4">{t('customFields.description', 'Description')}</dt>
                  <dd className="col-sm-8">{category.description || <span className="text-muted">-</span>}</dd>

                  <dt className="col-sm-4">{t('customFields.displayOrder', 'Display Order')}</dt>
                  <dd className="col-sm-8"><Badge bg="light" text="dark">{category.display_order}</Badge></dd>
                </dl>
              </Col>
              <Col md={6}>
                <dl className="row mb-0">
                  <dt className="col-sm-4">{t('customFields.appliesTo', 'Applies to')}</dt>
                  <dd className="col-sm-8">
                    {hasPatient && <Badge bg="primary" className="me-1">👤 Patient</Badge>}
                    {hasVisit && <Badge bg="info">📅 Visit</Badge>}
                  </dd>

                  <dt className="col-sm-4">{t('customFields.status', 'Status')}</dt>
                  <dd className="col-sm-8">
                    {category.is_active ? (
                      <Badge bg="success">{t('common.active', 'Active')}</Badge>
                    ) : (
                      <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                    )}
                  </dd>

                  <dt className="col-sm-4">{t('customFields.fieldsCount', 'Fields')}</dt>
                  <dd className="col-sm-8">
                    <Badge bg="secondary">{definitions.length} {t('customFields.fields', 'fields')}</Badge>
                  </dd>
                </dl>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Field Definitions Card */}
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">{t('customFields.fieldsInCategory', 'Fields in this Category')} ({definitions.length})</h5>
            <Button variant="primary" size="sm" onClick={handleCreateDefinition}>
              ➕ {t('customFields.newField', 'New Field')}
            </Button>
          </Card.Header>
          <Card.Body>
            {definitions.length === 0 ? (
              <Alert variant="info">
                {t('customFields.noFieldsInCategory', 'No fields in this category yet. Create one to get started!')}
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('customFields.fieldName', 'Field Name')}</th>
                    <th>{t('customFields.fieldLabel', 'Label')}</th>
                    <th>{t('customFields.fieldType', 'Type')}</th>
                    <th>{t('customFields.required', 'Required')}</th>
                    <th>{t('customFields.status', 'Status')}</th>
                    <th>{t('customFields.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((definition) => (
                    <tr
                      key={definition.id}
                      onClick={() => navigate(`/settings/custom-fields/definitions/${definition.id}/view`)}
                      className="clickable-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td><code>{definition.field_name}</code></td>
                      <td><strong>{definition.field_label}</strong></td>
                      <td>
                        <Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>
                          {getFieldTypeIcon(definition.field_type)} {definition.field_type}
                        </Badge>
                      </td>
                      <td>
                        {definition.is_required ? (
                          <Badge bg="warning" text="dark">{t('common.yes', 'Yes')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('common.no', 'No')}</Badge>
                        )}
                      </td>
                      <td>
                        {definition.is_active ? (
                          <Badge bg="success">{t('common.active', 'Active')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <ActionButton
                            action="edit"
                            onClick={() => handleEditDefinition(definition)}
                            title={t('common.edit', 'Edit')}
                          />
                          <ActionButton
                            action="delete"
                            onClick={() => handleDeleteDefinition(definition.id)}
                            title={t('common.delete', 'Delete')}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Modals */}
        <CustomFieldCategoryModal
          show={showCategoryModal}
          onHide={() => setShowCategoryModal(false)}
          category={category}
          onSuccess={() => {
            fetchData();
            setShowCategoryModal(false);
          }}
        />

        <CustomFieldDefinitionModal
          show={showDefinitionModal}
          onHide={() => {
            setShowDefinitionModal(false);
            setSelectedDefinition(null);
          }}
          definition={selectedDefinition ? selectedDefinition : { category_id: id }}
          categories={allCategories}
          onSuccess={() => {
            fetchData();
            setShowDefinitionModal(false);
            setSelectedDefinition(null);
          }}
        />

        {/* Delete Category Confirm Modal */}
        <ConfirmModal
          show={showDeleteCategoryConfirm}
          onHide={() => setShowDeleteCategoryConfirm(false)}
          onConfirm={confirmDeleteCategory}
          title={t('common.confirmation', 'Confirmation')}
          message={t('customFields.confirmDeleteCategory', 'Are you sure you want to delete this category?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Delete Definition Confirm Modal */}
        <ConfirmModal
          show={showDeleteDefinitionConfirm}
          onHide={() => {
            setShowDeleteDefinitionConfirm(false);
            setDefinitionToDelete(null);
          }}
          onConfirm={confirmDeleteDefinition}
          title={t('common.confirmation', 'Confirmation')}
          message={t('customFields.confirmDeleteField', 'Are you sure you want to delete this field?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default CustomFieldCategoryDetailPage;
