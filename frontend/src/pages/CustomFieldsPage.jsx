/**
 * CustomFieldsPage Component
 * Admin-only custom fields management page
 * Manages categories and field definitions
 * Follows MeasuresPage pattern with 2 tabs
 */

import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import ResponsiveTabs, { Tab } from '../components/ResponsiveTabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import customFieldService from '../services/customFieldService';
import CustomFieldCategoryModal from '../components/CustomFieldCategoryModal';
import CustomFieldDefinitionModal from '../components/CustomFieldDefinitionModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import './CustomFieldsPage.css';

const CustomFieldsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restore filter state from localStorage
  const getStoredFilters = () => {
    try {
      const stored = localStorage.getItem('customFieldsPage_filters');
      return stored ? JSON.parse(stored) : {
        searchQuery: '',
        selectedCategories: [],
        activeTab: 'categories'
      };
    } catch (err) {
      console.error('Error reading filters from localStorage:', err);
      return { searchQuery: '', selectedCategories: [], activeTab: 'categories' };
    }
  };

  // State
  const [categories, setCategories] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => getStoredFilters().activeTab);
  const [searchQuery, setSearchQuery] = useState(() => getStoredFilters().searchQuery);
  const [selectedCategories, setSelectedCategories] = useState(() => getStoredFilters().selectedCategories);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showDeleteDefinitionConfirm, setShowDeleteDefinitionConfirm] = useState(false);
  const [definitionToDelete, setDefinitionToDelete] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchData();
    }
  }, [user]);

  // Persist filter state to localStorage whenever it changes
  useEffect(() => {
    try {
      const filters = {
        searchQuery,
        selectedCategories,
        activeTab
      };
      localStorage.setItem('customFieldsPage_filters', JSON.stringify(filters));
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [searchQuery, selectedCategories, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, definitionsRes] = await Promise.all([
        customFieldService.getCategories(),
        customFieldService.getDefinitions()
      ]);

      setCategories(categoriesRes || []);
      setDefinitions(definitionsRes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching custom fields data:', err);
      setError(err.response?.data?.error || t('customFields.failedToLoad', 'Failed to load custom fields'));
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (categoryId) => {
    setCategoryToDelete(categoryId);
    setShowDeleteCategoryConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const result = await customFieldService.deleteCategory(categoryToDelete);
      if (result.success !== false) {
        await fetchData();
      } else {
        setError(result.error || t('customFields.deleteError', 'Failed to delete category'));
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      const errorMessage = err.response?.data?.error || err.message || t('customFields.deleteError', 'Failed to delete category');
      setError(errorMessage);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Definition handlers
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
      const result = await customFieldService.deleteDefinition(definitionToDelete);
      if (result.success !== false) {
        await fetchData();
      } else {
        setError(result.error || t('customFields.deleteFieldError', 'Failed to delete field definition'));
      }
    } catch (err) {
      console.error('Error deleting definition:', err);
      const errorMessage = err.response?.data?.error || err.message || t('customFields.deleteFieldError', 'Failed to delete field definition');
      setError(errorMessage);
    } finally {
      setDefinitionToDelete(null);
    }
  };

  // Get field type icon
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

  // Get field type badge variant
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

  // Category filter handlers
  const handleToggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(categories.map(cat => cat.id));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  // Filter definitions based on search query and selected categories
  const filteredDefinitions = useMemo(() => {
    let filtered = definitions;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(def => {
        return (
          def.field_name?.toLowerCase().includes(query) ||
          def.field_label?.toLowerCase().includes(query) ||
          def.help_text?.toLowerCase().includes(query) ||
          def.category?.name?.toLowerCase().includes(query)
        );
      });
    }

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(def => {
        return selectedCategories.includes(def.category_id);
      });
    }

    return filtered;
  }, [definitions, searchQuery, selectedCategories]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories.filter(cat => {
      return (
        cat.name?.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
      );
    });
  }, [categories, searchQuery]);

  // Highlight matching text
  const highlightText = (text, query) => {
    if (!text || !query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff3cd', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4 text-center">
          <Spinner animation="border" />
          <p>{t('customFields.loading', 'Loading custom fields...')}</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h1>🔧 {t('customFields.title', 'Custom Fields Management')}</h1>
            <p className="text-muted">{t('customFields.subtitle', 'Define custom fields for patient profiles and visits')}</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <ResponsiveTabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          {/* Categories Tab */}
          <Tab eventKey="categories" title={`📁 ${t('customFields.categories', 'Categories')} (${categories.length})`}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">{t('customFields.categoriesTitle', 'Field Categories')}</h5>
                <Button variant="primary" size="sm" onClick={handleCreateCategory}>
                  ➕ {t('customFields.newCategory', 'New Category')}
                </Button>
              </Card.Header>
              <Card.Body>
                {/* Search Bar */}
                <Row className="mb-3">
                  <Col xs={12} md={6}>
                    <Form.Label>{t('common.search', 'Search')}</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>🔍</InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder={t('customFields.searchCategoriesPlaceholder', 'Search by name or description...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          variant="outline-secondary"
                          onClick={() => setSearchQuery('')}
                          title={t('common.clear', 'Clear')}
                        >
                          ✕
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                </Row>

                {/* Results Counter */}
                {searchQuery && (
                  <Row className="mb-2">
                    <Col>
                      <Form.Text className="text-muted">
                        {t('customFields.showingResults', 'Showing {{filtered}} of {{total}} categories', {
                          filtered: filteredCategories.length,
                          total: categories.length
                        })}
                      </Form.Text>
                    </Col>
                  </Row>
                )}

                {categories.length === 0 ? (
                  <Alert variant="info">
                    {t('customFields.noCategories', 'No categories yet. Create one to get started!')}
                  </Alert>
                ) : filteredCategories.length === 0 ? (
                  <Alert variant="warning">
                    {t('customFields.noCategoriesFound', 'No categories found matching your search.')}
                  </Alert>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="custom-fields-table-desktop">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>{t('customFields.categoryName', 'Name')}</th>
                            <th>{t('customFields.categoryDescription', 'Description')}</th>
                            <th>{t('customFields.displayOrder', 'Order')}</th>
                            <th>{t('customFields.appliesTo', 'Applies to')}</th>
                            <th>{t('customFields.status', 'Status')}</th>
                            <th>{t('customFields.fieldsCount', 'Fields')}</th>
                            <th>{t('customFields.actions', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.map((category) => {
                            const entityTypes = category.entity_types || ['patient'];
                            const hasPatient = entityTypes.includes('patient');
                            const hasVisit = entityTypes.includes('visit');
                            const fieldCount = category.field_definitions?.length || 0;

                            return (
                              <tr
                                key={category.id}
                                onClick={() => navigate(`/settings/custom-fields/categories/${category.id}/view`)}
                                className="clickable-row"
                                style={{ cursor: 'pointer' }}
                              >
                                <td>
                                  <strong>{highlightText(category.name, searchQuery)}</strong>
                                </td>
                                <td>
                                  {category.description ? (
                                    highlightText(category.description, searchQuery)
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <Badge bg="light" text="dark">{category.display_order}</Badge>
                                </td>
                                <td>
                                  {hasPatient && (
                                    <Badge bg="primary" className="me-1">
                                      👤 Patient
                                    </Badge>
                                  )}
                                  {hasVisit && (
                                    <Badge bg="info">
                                      📅 Visit
                                    </Badge>
                                  )}
                                </td>
                                <td>
                                  {category.is_active ? (
                                    <Badge bg="success">{t('common.active', 'Active')}</Badge>
                                  ) : (
                                    <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                                  )}
                                </td>
                                <td>
                                  <Badge bg="secondary">
                                    {fieldCount} {t('customFields.fields', 'fields')}
                                  </Badge>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="action-buttons">
                                    <ActionButton
                                      action="edit"
                                      onClick={() => handleEditCategory(category)}
                                      title={t('common.edit', 'Edit')}
                                    />
                                    {fieldCount === 0 ? (
                                      <ActionButton
                                        action="delete"
                                        onClick={() => handleDeleteCategory(category.id)}
                                        title={t('common.delete', 'Delete')}
                                      />
                                    ) : (
                                      <ActionButton
                                        action="delete"
                                        disabled={true}
                                        title={t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields')}
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="custom-fields-cards-mobile">
                      {filteredCategories.map((category) => {
                        const entityTypes = category.entity_types || ['patient'];
                        const hasPatient = entityTypes.includes('patient');
                        const hasVisit = entityTypes.includes('visit');
                        const fieldCount = category.field_definitions?.length || 0;

                        return (
                          <div
                            key={category.id}
                            className="category-card-mobile"
                            onClick={() => navigate(`/settings/custom-fields/categories/${category.id}/view`)}
                          >
                            <div className="card-mobile-header">
                              <div>
                                <h6 className="card-mobile-title">
                                  📁 {highlightText(category.name, searchQuery)}
                                </h6>
                                {category.description && (
                                  <div className="card-mobile-subtitle">
                                    {highlightText(category.description, searchQuery)}
                                  </div>
                                )}
                              </div>
                              {category.is_active ? (
                                <Badge bg="success">{t('common.active', 'Active')}</Badge>
                              ) : (
                                <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                              )}
                            </div>

                            <div className="card-mobile-badges">
                              {hasPatient && (
                                <Badge bg="primary" className="me-1">👤 Patient</Badge>
                              )}
                              {hasVisit && (
                                <Badge bg="info" className="me-1">📅 Visit</Badge>
                              )}
                              <Badge bg="secondary">
                                {fieldCount} {t('customFields.fields', 'fields')}
                              </Badge>
                            </div>

                            <div
                              className="card-mobile-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionButton
                                action="edit"
                                onClick={() => handleEditCategory(category)}
                                title={t('common.edit', 'Edit')}
                              />
                              {fieldCount === 0 ? (
                                <ActionButton
                                  action="delete"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  title={t('common.delete', 'Delete')}
                                />
                              ) : (
                                <ActionButton
                                  action="delete"
                                  disabled={true}
                                  title={t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields')}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* Field Definitions Tab */}
          <Tab eventKey="definitions" title={`📝 ${t('customFields.fieldDefinitions', 'Field Definitions')} (${definitions.length})`}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">{t('customFields.fieldDefinitionsTitle', 'Field Definitions')}</h5>
                <Button variant="primary" size="sm" onClick={handleCreateDefinition}>
                  ➕ {t('customFields.newField', 'New Field')}
                </Button>
              </Card.Header>
              <Card.Body>
                {/* Search Bar and Category Filter */}
                <Row className="mb-3">
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <Form.Label>{t('common.search', 'Search')}</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>🔍</InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder={t('customFields.searchFieldsPlaceholder', 'Search by name, label, or help text...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          variant="outline-secondary"
                          onClick={() => setSearchQuery('')}
                          title={t('common.clear', 'Clear')}
                        >
                          ✕
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Label>{t('customFields.filterByCategory', 'Filter by Category')}</Form.Label>
                    <div className="d-flex gap-2 flex-wrap">
                      <Form.Select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleCategory(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">{t('customFields.selectCategory', 'Select category to add...')}</option>
                        {categories
                          .filter(cat => !selectedCategories.includes(cat.id))
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                      </Form.Select>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleSelectAllCategories}
                        disabled={selectedCategories.length === categories.length}
                        title={t('customFields.selectAll', 'Select all')}
                      >
                        {t('common.all', 'All')}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleDeselectAllCategories}
                        disabled={selectedCategories.length === 0}
                        title={t('customFields.deselectAll', 'Deselect all')}
                      >
                        {t('common.none', 'None')}
                      </Button>
                    </div>
                  </Col>
                </Row>

                {/* Selected Categories Badges */}
                {selectedCategories.length > 0 && (
                  <Row className="mb-3">
                    <Col>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <small className="text-muted">{t('customFields.filteringBy', 'Filtering by:')}</small>
                        {selectedCategories.map(catId => {
                          const category = categories.find(c => c.id === catId);
                          return category ? (
                            <Badge
                              key={catId}
                              bg="primary"
                              style={{
                                cursor: 'pointer',
                                padding: '6px 10px',
                                fontSize: '0.85rem'
                              }}
                              onClick={() => handleToggleCategory(catId)}
                            >
                              {category.name} ✕
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </Col>
                  </Row>
                )}

                {/* Results Counter and Clear All */}
                {(searchQuery || selectedCategories.length > 0) && (
                  <Row className="mb-2">
                    <Col className="d-flex justify-content-between align-items-center">
                      <Form.Text className="text-muted">
                        {t('customFields.showingFieldsResults', 'Showing {{filtered}} of {{total}} fields', {
                          filtered: filteredDefinitions.length,
                          total: definitions.length
                        })}
                      </Form.Text>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleClearAllFilters}
                      >
                        🔄 {t('customFields.clearAllFilters', 'Clear All Filters')}
                      </Button>
                    </Col>
                  </Row>
                )}

                {definitions.length === 0 ? (
                  <Alert variant="info">
                    {t('customFields.noFields', 'No field definitions yet. Create one to get started!')}
                  </Alert>
                ) : filteredDefinitions.length === 0 ? (
                  <Alert variant="warning">
                    {t('customFields.noFieldsFound', 'No fields found matching your filters.')}
                  </Alert>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="custom-fields-table-desktop">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>{t('customFields.fieldName', 'Field Name')}</th>
                            <th>{t('customFields.fieldLabel', 'Label')}</th>
                            <th>{t('customFields.fieldType', 'Type')}</th>
                            <th>{t('customFields.category', 'Category')}</th>
                            <th>{t('customFields.required', 'Required')}</th>
                            <th>{t('customFields.status', 'Status')}</th>
                            <th>{t('customFields.actions', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDefinitions.map((definition) => (
                            <tr
                              key={definition.id}
                              onClick={() => navigate(`/settings/custom-fields/definitions/${definition.id}/view`)}
                              className="clickable-row"
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <code>{highlightText(definition.field_name, searchQuery)}</code>
                              </td>
                              <td>
                                <strong>{highlightText(definition.field_label, searchQuery)}</strong>
                              </td>
                              <td>
                                <Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>
                                  {getFieldTypeIcon(definition.field_type)} {definition.field_type}
                                </Badge>
                              </td>
                              <td>
                                {definition.category?.name ? (
                                  <Badge bg="light" text="dark">
                                    {highlightText(definition.category.name, searchQuery)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted">{t('common.unknown', 'Unknown')}</span>
                                )}
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
                    </div>

                    {/* Mobile Card View */}
                    <div className="custom-fields-cards-mobile">
                      {filteredDefinitions.map((definition) => (
                        <div
                          key={definition.id}
                          className="field-card-mobile"
                          onClick={() => navigate(`/settings/custom-fields/definitions/${definition.id}/view`)}
                        >
                          <div className="card-mobile-header">
                            <div>
                              <h6 className="card-mobile-title">
                                <span className="field-type-icon">{getFieldTypeIcon(definition.field_type)}</span>
                                {highlightText(definition.field_label, searchQuery)}
                              </h6>
                              <div className="card-mobile-subtitle">
                                <code>{highlightText(definition.field_name, searchQuery)}</code>
                              </div>
                            </div>
                            {definition.is_active ? (
                              <Badge bg="success">{t('common.active', 'Active')}</Badge>
                            ) : (
                              <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                            )}
                          </div>

                          <div className="card-mobile-badges">
                            <Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>
                              {definition.field_type}
                            </Badge>
                            {definition.category?.name && (
                              <Badge bg="light" text="dark">
                                {highlightText(definition.category.name, searchQuery)}
                              </Badge>
                            )}
                            {definition.is_required && (
                              <Badge bg="warning" text="dark">{t('customFields.required', 'Required')}</Badge>
                            )}
                          </div>

                          <div
                            className="card-mobile-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </ResponsiveTabs>

        {/* Modals */}
        <CustomFieldCategoryModal
          show={showCategoryModal}
          onHide={() => {
            setShowCategoryModal(false);
            setSelectedCategory(null);
          }}
          category={selectedCategory}
          onSuccess={() => {
            fetchData();
            setShowCategoryModal(false);
            setSelectedCategory(null);
          }}
        />

        <CustomFieldDefinitionModal
          show={showDefinitionModal}
          onHide={() => {
            setShowDefinitionModal(false);
            setSelectedDefinition(null);
          }}
          definition={selectedDefinition}
          categories={categories}
          onSuccess={() => {
            fetchData();
            setShowDefinitionModal(false);
            setSelectedDefinition(null);
          }}
        />

        {/* Delete Category Confirm Modal */}
        <ConfirmModal
          show={showDeleteCategoryConfirm}
          onHide={() => {
            setShowDeleteCategoryConfirm(false);
            setCategoryToDelete(null);
          }}
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
          message={t('customFields.confirmDeleteField', 'Are you sure you want to delete this field definition?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default CustomFieldsPage;
