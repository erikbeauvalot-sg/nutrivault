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
import visitTypeService from '../services/visitTypeService';
import CustomFieldCategoryModal from '../components/CustomFieldCategoryModal';
import CustomFieldDefinitionModal from '../components/CustomFieldDefinitionModal';
import VisitTypeModal from '../components/VisitTypeModal';
import ExportCustomFieldsModal from '../components/ExportCustomFieldsModal';
import ImportCustomFieldsModal from '../components/ImportCustomFieldsModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './CustomFieldsPage.css';

// Helper to reorder an array after drag
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

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
  const [visitTypes, setVisitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => getStoredFilters().activeTab);
  const [searchQuery, setSearchQuery] = useState(() => getStoredFilters().searchQuery);
  const [selectedCategories, setSelectedCategories] = useState(() => getStoredFilters().selectedCategories);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);
  const [showVisitTypeModal, setShowVisitTypeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [selectedVisitType, setSelectedVisitType] = useState(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showDeleteDefinitionConfirm, setShowDeleteDefinitionConfirm] = useState(false);
  const [definitionToDelete, setDefinitionToDelete] = useState(null);
  const [showDeleteVisitTypeConfirm, setShowDeleteVisitTypeConfirm] = useState(false);
  const [visitTypeToDelete, setVisitTypeToDelete] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
      const [categoriesRes, definitionsRes, visitTypesRes] = await Promise.all([
        customFieldService.getCategories(),
        customFieldService.getDefinitions(),
        visitTypeService.getAllVisitTypes()
      ]);

      setCategories(categoriesRes || []);
      setDefinitions(definitionsRes || []);
      setVisitTypes(visitTypesRes?.data || []);
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

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setShowDeleteCategoryConfirm(true);
  };

  const handleDuplicateCategory = async (category) => {
    try {
      setLoading(true);
      const duplicatedCategory = await customFieldService.duplicateCategory(category.id);
      await fetchData();
      // Optionally navigate to the new category
      // navigate(`/settings/custom-fields/categories/${duplicatedCategory.id}/view`);
    } catch (err) {
      console.error('Error duplicating category:', err);
      setError(err.response?.data?.error || t('customFields.duplicateError', 'Failed to duplicate category'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const result = await customFieldService.deleteCategory(categoryToDelete.id);
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

  const handleDuplicateDefinition = async (definition) => {
    try {
      setLoading(true);
      const duplicatedDefinition = await customFieldService.duplicateDefinition(definition.id);
      await fetchData();
      // Optionally navigate to the new definition
      // navigate(`/settings/custom-fields/definitions/${duplicatedDefinition.id}/view`);
    } catch (err) {
      console.error('Error duplicating definition:', err);
      setError(err.response?.data?.error || t('customFields.duplicateError', 'Failed to duplicate field'));
    } finally {
      setLoading(false);
    }
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

  // Reorder handlers
  const handleMoveCategory = async (category, direction) => {
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex(c => c.id === category.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const order = sorted.map((cat, i) => {
      if (i === index) return { id: cat.id, display_order: sorted[targetIndex].display_order };
      if (i === targetIndex) return { id: cat.id, display_order: sorted[index].display_order };
      return { id: cat.id, display_order: cat.display_order };
    });

    try {
      await customFieldService.reorderCategories(order);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('customFields.reorderError', 'Failed to reorder items'));
    }
  };

  const handleMoveDefinition = async (definition, direction) => {
    const sorted = [...filteredDefinitions].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex(d => d.id === definition.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const order = sorted.map((def, i) => {
      if (i === index) return { id: def.id, display_order: sorted[targetIndex].display_order };
      if (i === targetIndex) return { id: def.id, display_order: sorted[index].display_order };
      return { id: def.id, display_order: def.display_order };
    });

    try {
      await customFieldService.reorderFields(order);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('customFields.reorderError', 'Failed to reorder items'));
    }
  };

  // Drag-and-drop handlers
  const handleCategoryDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const reordered = reorder(filteredCategories, result.source.index, result.destination.index);
    const order = reordered.map((cat, i) => ({ id: cat.id, display_order: i + 1 }));

    try {
      await customFieldService.reorderCategories(order);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('customFields.reorderError', 'Failed to reorder items'));
    }
  };

  const handleDefinitionDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const reordered = reorder(filteredDefinitions, result.source.index, result.destination.index);
    const order = reordered.map((def, i) => ({ id: def.id, display_order: i + 1 }));

    try {
      await customFieldService.reorderFields(order);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('customFields.reorderError', 'Failed to reorder items'));
    }
  };

  // Visit Type handlers
  const handleCreateVisitType = () => {
    setSelectedVisitType(null);
    setShowVisitTypeModal(true);
  };

  const handleEditVisitType = (visitType) => {
    setSelectedVisitType(visitType);
    setShowVisitTypeModal(true);
  };

  const handleDeleteVisitType = (visitTypeId) => {
    setVisitTypeToDelete(visitTypeId);
    setShowDeleteVisitTypeConfirm(true);
  };

  const confirmDeleteVisitType = async () => {
    if (!visitTypeToDelete) return;

    try {
      const result = await visitTypeService.deleteVisitType(visitTypeToDelete);
      if (result.success !== false) {
        await fetchData();
      } else {
        setError(result.error || t('visitTypes.deleteError', 'Failed to delete visit type'));
      }
    } catch (err) {
      console.error('Error deleting visit type:', err);
      const errorMessage = err.response?.data?.error || err.message || t('visitTypes.deleteError', 'Failed to delete visit type');
      setError(errorMessage);
    } finally {
      setVisitTypeToDelete(null);
    }
  };

  // Filter visit types based on search query
  const filteredVisitTypes = useMemo(() => {
    if (!searchQuery.trim()) return visitTypes;

    const query = searchQuery.toLowerCase();
    return visitTypes.filter(vt => {
      return (
        vt.name?.toLowerCase().includes(query) ||
        vt.description?.toLowerCase().includes(query)
      );
    });
  }, [visitTypes, searchQuery]);

  // Get field type icon
  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      date: '📅',
      select: '📋',
      boolean: '☑️',
      calculated: '🧮',
      separator: '➖',
      blank: '⬜'
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
      calculated: 'danger',
      separator: 'light',
      blank: 'light'
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

    return [...filtered].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [definitions, searchQuery, selectedCategories]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cat => {
        return (
          cat.name?.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
        );
      });
    }

    return [...filtered].sort((a, b) => a.display_order - b.display_order);
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
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h1>🔧 {t('customFields.title', 'Custom Fields Management')}</h1>
                <p className="text-muted">{t('customFields.subtitle', 'Define custom fields for patient profiles and visits')}</p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  disabled={categories.length === 0}
                >
                  📤 {t('customFields.exportBtn', 'Export')}
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                >
                  📥 {t('customFields.importBtn', 'Import')}
                </Button>
              </div>
            </div>
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
                  <DragDropContext onDragEnd={handleCategoryDragEnd}>
                    {/* Desktop Table View */}
                    <div className="custom-fields-table-desktop">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>{t('customFields.categoryName', 'Name')}</th>
                            <th>{t('customFields.categoryDescription', 'Description')}</th>
                            <th>{t('customFields.displayOrder', 'Order')}</th>
                            <th>{t('customFields.appliesTo', 'Applies to')}</th>
                            <th>{t('customFields.status', 'Status')}</th>
                            <th>{t('customFields.fieldsCount', 'Fields')}</th>
                            <th>{t('customFields.actions', 'Actions')}</th>
                          </tr>
                        </thead>
                        <Droppable droppableId="categories-table">
                          {(provided, snapshot) => (
                            <tbody ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'droppable-active' : ''}>
                              {filteredCategories.map((category, index) => {
                                const entityTypes = category.entity_types || ['patient'];
                                const hasPatient = entityTypes.includes('patient');
                                const hasVisit = entityTypes.includes('visit');
                                const fieldCount = category.field_definitions?.length || 0;

                                return (
                                  <Draggable key={category.id} draggableId={String(category.id)} index={index}>
                                    {(provided, snapshot) => (
                                      <tr
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        onClick={() => navigate(`/settings/custom-fields/categories/${category.id}/view`)}
                                        className={`clickable-row ${snapshot.isDragging ? 'dragging-row' : ''}`}
                                        style={{ ...provided.draggableProps.style, cursor: 'pointer' }}
                                      >
                                        <td onClick={(e) => e.stopPropagation()} style={{ width: '40px' }}>
                                          <span className="drag-handle" {...provided.dragHandleProps} title={t('common.dragToReorder', 'Drag to reorder')}>☰</span>
                                        </td>
                                        <td><strong>{highlightText(category.name, searchQuery)}</strong></td>
                                        <td>{category.description ? highlightText(category.description, searchQuery) : <span className="text-muted">-</span>}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                          <div className="d-flex align-items-center gap-1">
                                            <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === 0} onClick={() => handleMoveCategory(category, 'up')} title={t('common.moveUp', 'Move up')}>▲</Button>
                                            <Badge bg="light" text="dark">{category.display_order}</Badge>
                                            <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === filteredCategories.length - 1} onClick={() => handleMoveCategory(category, 'down')} title={t('common.moveDown', 'Move down')}>▼</Button>
                                          </div>
                                        </td>
                                        <td>
                                          {hasPatient && <Badge bg="primary" className="me-1">👤 Patient</Badge>}
                                          {hasVisit && <Badge bg="info">📅 Visit</Badge>}
                                        </td>
                                        <td>{category.is_active ? <Badge bg="success">{t('common.active', 'Active')}</Badge> : <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>}</td>
                                        <td><Badge bg="secondary">{fieldCount} {t('customFields.fields', 'fields')}</Badge></td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                          <div className="action-buttons">
                                            <ActionButton action="duplicate" onClick={() => handleDuplicateCategory(category)} title={t('common.duplicate', 'Duplicate')} />
                                            <ActionButton action="edit" onClick={() => handleEditCategory(category)} title={t('common.edit', 'Edit')} />
                                            {fieldCount === 0 ? (
                                              <ActionButton action="delete" onClick={() => handleDeleteCategory(category)} title={category.is_active ? t('common.deactivate', 'Deactivate') : t('common.deletePermanently', 'Delete permanently')} />
                                            ) : (
                                              <ActionButton action="delete" disabled={true} title={t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields')} />
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="custom-fields-cards-mobile">
                      <Droppable droppableId="categories-cards">
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'droppable-active' : ''}>
                            {filteredCategories.map((category, index) => {
                              const entityTypes = category.entity_types || ['patient'];
                              const hasPatient = entityTypes.includes('patient');
                              const hasVisit = entityTypes.includes('visit');
                              const fieldCount = category.field_definitions?.length || 0;

                              return (
                                <Draggable key={category.id} draggableId={`card-${category.id}`} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`category-card-mobile ${snapshot.isDragging ? 'dragging-card' : ''}`}
                                      onClick={() => navigate(`/settings/custom-fields/categories/${category.id}/view`)}
                                    >
                                      <div className="card-mobile-header">
                                        <div className="d-flex align-items-start gap-2">
                                          <span className="drag-handle" {...provided.dragHandleProps} onClick={(e) => e.stopPropagation()} title={t('common.dragToReorder', 'Drag to reorder')}>☰</span>
                                          <div>
                                            <h6 className="card-mobile-title">📁 {highlightText(category.name, searchQuery)}</h6>
                                            {category.description && <div className="card-mobile-subtitle">{highlightText(category.description, searchQuery)}</div>}
                                          </div>
                                        </div>
                                        {category.is_active ? <Badge bg="success">{t('common.active', 'Active')}</Badge> : <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>}
                                      </div>
                                      <div className="card-mobile-badges">
                                        {hasPatient && <Badge bg="primary" className="me-1">👤 Patient</Badge>}
                                        {hasVisit && <Badge bg="info" className="me-1">📅 Visit</Badge>}
                                        <Badge bg="secondary">{fieldCount} {t('customFields.fields', 'fields')}</Badge>
                                        <span onClick={(e) => e.stopPropagation()} className="d-inline-flex align-items-center gap-1">
                                          <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === 0} onClick={() => handleMoveCategory(category, 'up')} title={t('common.moveUp', 'Move up')}>▲</Button>
                                          <Badge bg="light" text="dark">{category.display_order}</Badge>
                                          <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === filteredCategories.length - 1} onClick={() => handleMoveCategory(category, 'down')} title={t('common.moveDown', 'Move down')}>▼</Button>
                                        </span>
                                      </div>
                                      <div className="card-mobile-actions" onClick={(e) => e.stopPropagation()}>
                                        <ActionButton action="edit" onClick={() => handleEditCategory(category)} title={t('common.edit', 'Edit')} />
                                        {fieldCount === 0 ? (
                                          <ActionButton action="delete" onClick={() => handleDeleteCategory(category)} title={category.is_active ? t('common.deactivate', 'Deactivate') : t('common.deletePermanently', 'Delete permanently')} />
                                        ) : (
                                          <ActionButton action="delete" disabled={true} title={t('customFields.cannotDeleteCategoryWithFields', 'Cannot delete category with fields')} />
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </DragDropContext>
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
                  <DragDropContext onDragEnd={handleDefinitionDragEnd}>
                    {/* Desktop Table View */}
                    <div className="custom-fields-table-desktop">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>{t('customFields.fieldName', 'Field Name')}</th>
                            <th>{t('customFields.fieldLabel', 'Label')}</th>
                            <th>{t('customFields.fieldType', 'Type')}</th>
                            <th>{t('customFields.category', 'Category')}</th>
                            <th>{t('customFields.order', 'Order')}</th>
                            <th>{t('customFields.required', 'Required')}</th>
                            <th>{t('customFields.status', 'Status')}</th>
                            <th>{t('customFields.actions', 'Actions')}</th>
                          </tr>
                        </thead>
                        <Droppable droppableId="definitions-table">
                          {(provided, snapshot) => (
                            <tbody ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'droppable-active' : ''}>
                              {filteredDefinitions.map((definition, index) => (
                                <Draggable key={definition.id} draggableId={String(definition.id)} index={index}>
                                  {(provided, snapshot) => (
                                    <tr
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      onClick={() => navigate(`/settings/custom-fields/definitions/${definition.id}/view`)}
                                      className={`clickable-row ${snapshot.isDragging ? 'dragging-row' : ''}`}
                                      style={{ ...provided.draggableProps.style, cursor: 'pointer' }}
                                    >
                                      <td onClick={(e) => e.stopPropagation()} style={{ width: '40px' }}>
                                        <span className="drag-handle" {...provided.dragHandleProps} title={t('common.dragToReorder', 'Drag to reorder')}>☰</span>
                                      </td>
                                      <td><code>{highlightText(definition.field_name, searchQuery)}</code></td>
                                      <td><strong>{highlightText(definition.field_label, searchQuery)}</strong></td>
                                      <td><Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>{getFieldTypeIcon(definition.field_type)} {definition.field_type}</Badge></td>
                                      <td>{definition.category?.name ? <Badge bg="light" text="dark">{highlightText(definition.category.name, searchQuery)}</Badge> : <span className="text-muted">{t('common.unknown', 'Unknown')}</span>}</td>
                                      <td onClick={(e) => e.stopPropagation()}>
                                        <div className="d-flex align-items-center gap-1">
                                          <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === 0} onClick={() => handleMoveDefinition(definition, 'up')} title={t('common.moveUp', 'Move up')}>▲</Button>
                                          <Badge bg="info" text="dark">{definition.display_order || 0}</Badge>
                                          <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === filteredDefinitions.length - 1} onClick={() => handleMoveDefinition(definition, 'down')} title={t('common.moveDown', 'Move down')}>▼</Button>
                                        </div>
                                      </td>
                                      <td>{definition.is_required ? <Badge bg="warning" text="dark">{t('common.yes', 'Yes')}</Badge> : <Badge bg="secondary">{t('common.no', 'No')}</Badge>}</td>
                                      <td>{definition.is_active ? <Badge bg="success">{t('common.active', 'Active')}</Badge> : <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>}</td>
                                      <td onClick={(e) => e.stopPropagation()}>
                                        <div className="action-buttons">
                                          <ActionButton action="duplicate" onClick={() => handleDuplicateDefinition(definition)} title={t('common.duplicate', 'Duplicate')} />
                                          <ActionButton action="edit" onClick={() => handleEditDefinition(definition)} title={t('common.edit', 'Edit')} />
                                          <ActionButton action="delete" onClick={() => handleDeleteDefinition(definition.id)} title={t('common.delete', 'Delete')} />
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </tbody>
                          )}
                        </Droppable>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="custom-fields-cards-mobile">
                      <Droppable droppableId="definitions-cards">
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className={snapshot.isDraggingOver ? 'droppable-active' : ''}>
                            {filteredDefinitions.map((definition, index) => (
                              <Draggable key={definition.id} draggableId={`card-${definition.id}`} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`field-card-mobile ${snapshot.isDragging ? 'dragging-card' : ''}`}
                                    onClick={() => navigate(`/settings/custom-fields/definitions/${definition.id}/view`)}
                                  >
                                    <div className="card-mobile-header">
                                      <div className="d-flex align-items-start gap-2">
                                        <span className="drag-handle" {...provided.dragHandleProps} onClick={(e) => e.stopPropagation()} title={t('common.dragToReorder', 'Drag to reorder')}>☰</span>
                                        <div>
                                          <h6 className="card-mobile-title">
                                            <span className="field-type-icon">{getFieldTypeIcon(definition.field_type)}</span>
                                            {highlightText(definition.field_label, searchQuery)}
                                          </h6>
                                          <div className="card-mobile-subtitle"><code>{highlightText(definition.field_name, searchQuery)}</code></div>
                                        </div>
                                      </div>
                                      {definition.is_active ? <Badge bg="success">{t('common.active', 'Active')}</Badge> : <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>}
                                    </div>
                                    <div className="card-mobile-badges">
                                      <Badge bg={getFieldTypeBadgeVariant(definition.field_type)}>{definition.field_type}</Badge>
                                      {definition.category?.name && <Badge bg="light" text="dark">{highlightText(definition.category.name, searchQuery)}</Badge>}
                                      <span onClick={(e) => e.stopPropagation()} className="d-inline-flex align-items-center gap-1">
                                        <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === 0} onClick={() => handleMoveDefinition(definition, 'up')} title={t('common.moveUp', 'Move up')}>▲</Button>
                                        <Badge bg="info" text="dark">{definition.display_order || 0}</Badge>
                                        <Button variant="outline-secondary" size="sm" className="p-0 px-1" disabled={index === filteredDefinitions.length - 1} onClick={() => handleMoveDefinition(definition, 'down')} title={t('common.moveDown', 'Move down')}>▼</Button>
                                      </span>
                                      {definition.is_required && <Badge bg="warning" text="dark">{t('customFields.required', 'Required')}</Badge>}
                                    </div>
                                    <div className="card-mobile-actions" onClick={(e) => e.stopPropagation()}>
                                      <ActionButton action="edit" onClick={() => handleEditDefinition(definition)} title={t('common.edit', 'Edit')} />
                                      <ActionButton action="delete" onClick={() => handleDeleteDefinition(definition.id)} title={t('common.delete', 'Delete')} />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </DragDropContext>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* Visit Types Tab */}
          <Tab eventKey="visitTypes" title={`🏷️ ${t('visitTypes.title', 'Visit Types')} (${visitTypes.length})`}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">{t('visitTypes.titleManagement', 'Visit Types Management')}</h5>
                <Button variant="primary" size="sm" onClick={handleCreateVisitType}>
                  ➕ {t('visitTypes.newVisitType', 'New Visit Type')}
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
                        placeholder={t('visitTypes.searchPlaceholder', 'Search by name or description...')}
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
                        {t('visitTypes.showingResults', 'Showing {{filtered}} of {{total}} visit types', {
                          filtered: filteredVisitTypes.length,
                          total: visitTypes.length
                        })}
                      </Form.Text>
                    </Col>
                  </Row>
                )}

                {visitTypes.length === 0 ? (
                  <Alert variant="info">
                    {t('visitTypes.noVisitTypes', 'No visit types yet. Create one to get started!')}
                  </Alert>
                ) : filteredVisitTypes.length === 0 ? (
                  <Alert variant="warning">
                    {t('visitTypes.noVisitTypesFound', 'No visit types found matching your search.')}
                  </Alert>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="custom-fields-table-desktop">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>{t('visitTypes.name', 'Name')}</th>
                            <th>{t('visitTypes.description', 'Description')}</th>
                            <th>{t('visitTypes.color', 'Color')}</th>
                            <th>{t('visitTypes.duration', 'Duration')}</th>
                            <th>{t('visitTypes.price', 'Price')}</th>
                            <th>{t('visitTypes.displayOrder', 'Order')}</th>
                            <th>{t('visitTypes.status', 'Status')}</th>
                            <th>{t('visitTypes.actions', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVisitTypes.map((visitType) => (
                            <tr key={visitType.id}>
                              <td>
                                <strong>{highlightText(visitType.name, searchQuery)}</strong>
                              </td>
                              <td>
                                {visitType.description ? (
                                  highlightText(visitType.description, searchQuery)
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                {visitType.color ? (
                                  <Badge
                                    bg=""
                                    style={{
                                      backgroundColor: visitType.color,
                                      color: '#fff'
                                    }}
                                  >
                                    {visitType.color}
                                  </Badge>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                {visitType.duration_minutes ? (
                                  <span>{visitType.duration_minutes} {t('visitTypes.minutes', 'min')}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                {visitType.default_price ? (
                                  <span>{parseFloat(visitType.default_price).toFixed(2)} €</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <Badge bg="light" text="dark">{visitType.display_order}</Badge>
                              </td>
                              <td>
                                {visitType.is_active ? (
                                  <Badge bg="success">{t('common.active', 'Active')}</Badge>
                                ) : (
                                  <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                                )}
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <ActionButton
                                    action="edit"
                                    onClick={() => handleEditVisitType(visitType)}
                                    title={t('common.edit', 'Edit')}
                                  />
                                  <ActionButton
                                    action="delete"
                                    onClick={() => handleDeleteVisitType(visitType.id)}
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
                      {filteredVisitTypes.map((visitType) => (
                        <div
                          key={visitType.id}
                          className="category-card-mobile"
                        >
                          <div className="card-mobile-header">
                            <div>
                              <h6 className="card-mobile-title">
                                {visitType.color && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: visitType.color,
                                      marginRight: '8px'
                                    }}
                                  />
                                )}
                                {highlightText(visitType.name, searchQuery)}
                              </h6>
                              {visitType.description && (
                                <div className="card-mobile-subtitle">
                                  {highlightText(visitType.description, searchQuery)}
                                </div>
                              )}
                            </div>
                            {visitType.is_active ? (
                              <Badge bg="success">{t('common.active', 'Active')}</Badge>
                            ) : (
                              <Badge bg="secondary">{t('common.inactive', 'Inactive')}</Badge>
                            )}
                          </div>

                          <div className="card-mobile-badges">
                            {visitType.duration_minutes && (
                              <Badge bg="info" text="dark">
                                {visitType.duration_minutes} {t('visitTypes.minutes', 'min')}
                              </Badge>
                            )}
                            {visitType.default_price && (
                              <Badge bg="success">
                                {parseFloat(visitType.default_price).toFixed(2)} €
                              </Badge>
                            )}
                            <Badge bg="light" text="dark">
                              {t('visitTypes.order', 'Order')}: {visitType.display_order}
                            </Badge>
                          </div>

                          <div className="card-mobile-actions">
                            <ActionButton
                              action="edit"
                              onClick={() => handleEditVisitType(visitType)}
                              title={t('common.edit', 'Edit')}
                            />
                            <ActionButton
                              action="delete"
                              onClick={() => handleDeleteVisitType(visitType.id)}
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
          message={categoryToDelete?.is_active
            ? t('customFields.confirmDeactivateCategory', 'Are you sure you want to deactivate this category? It can be reactivated later.')
            : t('customFields.confirmDeleteCategoryPermanently', 'Are you sure you want to permanently delete this category? This action cannot be undone.')
          }
          confirmLabel={categoryToDelete?.is_active ? t('common.deactivate', 'Deactivate') : t('common.deletePermanently', 'Delete permanently')}
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

        {/* Visit Type Modal */}
        <VisitTypeModal
          show={showVisitTypeModal}
          onHide={() => {
            setShowVisitTypeModal(false);
            setSelectedVisitType(null);
          }}
          visitType={selectedVisitType}
          onSuccess={() => {
            fetchData();
            setShowVisitTypeModal(false);
            setSelectedVisitType(null);
          }}
        />

        {/* Delete Visit Type Confirm Modal */}
        <ConfirmModal
          show={showDeleteVisitTypeConfirm}
          onHide={() => {
            setShowDeleteVisitTypeConfirm(false);
            setVisitTypeToDelete(null);
          }}
          onConfirm={confirmDeleteVisitType}
          title={t('common.confirmation', 'Confirmation')}
          message={t('visitTypes.confirmDelete', 'Are you sure you want to delete this visit type?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Export Custom Fields Modal */}
        <ExportCustomFieldsModal
          show={showExportModal}
          onHide={() => setShowExportModal(false)}
          categories={categories}
        />

        {/* Import Custom Fields Modal */}
        <ImportCustomFieldsModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onSuccess={fetchData}
          existingCategories={categories}
        />
      </Container>
    </Layout>
  );
};

export default CustomFieldsPage;
