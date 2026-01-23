/**
 * CustomFieldsPage Component
 * Admin-only custom fields management page
 * Manages categories and field definitions
 */

import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Tab, Tabs, Table, Button, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import customFieldService from '../services/customFieldService';
import CustomFieldCategoryModal from '../components/CustomFieldCategoryModal';
import CustomFieldDefinitionModal from '../components/CustomFieldDefinitionModal';

const CustomFieldsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restore filter state from localStorage
  const getStoredFilters = () => {
    try {
      const stored = localStorage.getItem('customFieldsPage_filters');
      return stored ? JSON.parse(stored) : { searchQuery: '', selectedCategories: [] };
    } catch (err) {
      console.error('Error reading filters from localStorage:', err);
      return { searchQuery: '', selectedCategories: [] };
    }
  };

  // State
  const [categories, setCategories] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('categories');
  const [searchQuery, setSearchQuery] = useState(() => getStoredFilters().searchQuery);
  const [selectedCategories, setSelectedCategories] = useState(() => getStoredFilters().selectedCategories);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDefinition, setSelectedDefinition] = useState(null);

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
        selectedCategories
      };
      localStorage.setItem('customFieldsPage_filters', JSON.stringify(filters));
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [searchQuery, selectedCategories]);

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
      setError(err.response?.data?.error || 'Failed to load custom fields');
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

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await customFieldService.deleteCategory(categoryId);
      fetchData();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert(err.response?.data?.error || 'Failed to delete category');
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

  const handleDeleteDefinition = async (definitionId) => {
    if (!window.confirm('Are you sure you want to delete this field definition?')) return;

    try {
      await customFieldService.deleteDefinition(definitionId);
      fetchData();
    } catch (err) {
      console.error('Error deleting definition:', err);
      alert(err.response?.data?.error || 'Failed to delete field definition');
    }
  };

  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      date: '📅',
      select: '📋',
      boolean: '☑️'
    };
    return icons[type] || '❓';
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

    // Filter by selected categories (AND logic)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(def => {
        return selectedCategories.includes(def.category_id);
      });
    }

    return filtered;
  }, [definitions, searchQuery, selectedCategories]);

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
          <p>Loading custom fields...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h1>🔧 Custom Fields Management</h1>
            <p className="text-muted">Define custom fields for patient profiles</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          {/* Categories Tab */}
          <Tab eventKey="categories" title={`📁 Categories (${categories.length})`}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Field Categories</h5>
                <Button variant="primary" size="sm" onClick={handleCreateCategory}>
                  ➕ New Category
                </Button>
              </Card.Header>
              <Card.Body>
                {categories.length === 0 ? (
                  <Alert variant="info">
                    No categories yet. Create one to get started!
                  </Alert>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Order</th>
                        <th>Applies to</th>
                        <th>Status</th>
                        <th>Fields</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => {
                        const entityTypes = category.entity_types || ['patient'];
                        const hasPatient = entityTypes.includes('patient');
                        const hasVisit = entityTypes.includes('visit');

                        return (
                        <tr key={category.id}>
                          <td><strong>{category.name}</strong></td>
                          <td>{category.description || <span className="text-muted">-</span>}</td>
                          <td>{category.display_order}</td>
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
                              <Badge bg="success">Active</Badge>
                            ) : (
                              <Badge bg="secondary">Inactive</Badge>
                            )}
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {category.field_definitions?.length || 0} fields
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditCategory(category)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* Definitions Tab */}
          <Tab eventKey="definitions" title={`📝 Field Definitions (${definitions.length})`}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Field Definitions</h5>
                <Button variant="primary" size="sm" onClick={handleCreateDefinition}>
                  ➕ New Field
                </Button>
              </Card.Header>
              <Card.Body>
                {/* Search Bar and Category Filter */}
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Label>Search</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>🔍</InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search fields by name, label, help text, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          variant="outline-secondary"
                          onClick={() => setSearchQuery('')}
                          title="Clear search"
                        >
                          ✕
                        </Button>
                      )}
                    </InputGroup>
                  </Col>
                  <Col md={6}>
                    <Form.Label>Filter by Category</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleCategory(e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                      >
                        <option value="">Select category to add...</option>
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
                        title="Select all categories"
                      >
                        All
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleDeselectAllCategories}
                        disabled={selectedCategories.length === 0}
                        title="Deselect all categories"
                      >
                        None
                      </Button>
                    </div>
                  </Col>
                </Row>

                {/* Selected Categories Badges */}
                {selectedCategories.length > 0 && (
                  <Row className="mb-3">
                    <Col>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <small className="text-muted">Filtering by:</small>
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
                              <span style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                backgroundColor: category.color || '#3498db',
                                borderRadius: '50%',
                                marginRight: '6px',
                                border: '1px solid rgba(255,255,255,0.5)'
                              }} />
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
                        Showing {filteredDefinitions.length} of {definitions.length} field{filteredDefinitions.length !== 1 ? 's' : ''}
                      </Form.Text>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleClearAllFilters}
                      >
                        🔄 Clear All Filters
                      </Button>
                    </Col>
                  </Row>
                )}

                {definitions.length === 0 ? (
                  <Alert variant="info">
                    No field definitions yet. Create one to get started!
                  </Alert>
                ) : filteredDefinitions.length === 0 ? (
                  <Alert variant="warning">
                    No fields found matching "{searchQuery}". Try a different search term.
                  </Alert>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Label</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Required</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDefinitions.map((definition) => (
                        <tr key={definition.id}>
                          <td><code>{highlightText(definition.field_name, searchQuery)}</code></td>
                          <td><strong>{highlightText(definition.field_label, searchQuery)}</strong></td>
                          <td>
                            <span>{getFieldTypeIcon(definition.field_type)} {definition.field_type}</span>
                          </td>
                          <td>
                            {definition.category?.name ? highlightText(definition.category.name, searchQuery) : <span className="text-muted">Unknown</span>}
                          </td>
                          <td>
                            {definition.is_required ? (
                              <Badge bg="warning">Required</Badge>
                            ) : (
                              <Badge bg="secondary">Optional</Badge>
                            )}
                          </td>
                          <td>
                            {definition.is_active ? (
                              <Badge bg="success">Active</Badge>
                            ) : (
                              <Badge bg="secondary">Inactive</Badge>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditDefinition(definition)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteDefinition(definition.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>

        {/* Modals */}
        <CustomFieldCategoryModal
          show={showCategoryModal}
          onHide={() => setShowCategoryModal(false)}
          category={selectedCategory}
          onSuccess={fetchData}
        />

        <CustomFieldDefinitionModal
          show={showDefinitionModal}
          onHide={() => setShowDefinitionModal(false)}
          definition={selectedDefinition}
          categories={categories}
          onSuccess={fetchData}
        />
      </Container>
    </Layout>
  );
};

export default CustomFieldsPage;
