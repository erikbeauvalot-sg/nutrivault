/**
 * MeasuresPage Component
 * Admin-only measure definitions management page
 * Manages health measures and their definitions
 */

import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import * as measureService from '../services/measureService';

const MeasuresPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restore filter state from localStorage
  const getStoredFilters = () => {
    try {
      const stored = localStorage.getItem('measuresPage_filters');
      return stored ? JSON.parse(stored) : { searchQuery: '', selectedCategories: [] };
    } catch (err) {
      console.error('Error reading filters from localStorage:', err);
      return { searchQuery: '', selectedCategories: [] };
    }
  };

  // State
  const [measures, setMeasures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(() => getStoredFilters().searchQuery);
  const [selectedCategories, setSelectedCategories] = useState(() => getStoredFilters().selectedCategories);

  // Modal state
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState(null);

  // Define available categories
  const categories = [
    { id: 'vitals', name: 'Vitals', icon: '💓' },
    { id: 'lab_results', name: 'Lab Results', icon: '🧪' },
    { id: 'anthropometric', name: 'Anthropometric', icon: '📏' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🏃' },
    { id: 'symptoms', name: 'Symptoms', icon: '🤒' },
    { id: 'other', name: 'Other', icon: '📊' }
  ];

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchMeasures();
    }
  }, [user]);

  // Persist filter state to localStorage whenever it changes
  useEffect(() => {
    try {
      const filters = {
        searchQuery,
        selectedCategories
      };
      localStorage.setItem('measuresPage_filters', JSON.stringify(filters));
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [searchQuery, selectedCategories]);

  const fetchMeasures = async () => {
    try {
      setLoading(true);
      const measuresData = await measureService.getMeasureDefinitions();
      setMeasures(measuresData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching measures:', err);
      setError(err.response?.data?.error || 'Failed to load measures');
    } finally {
      setLoading(false);
    }
  };

  // Measure handlers
  const handleCreateMeasure = () => {
    setSelectedMeasure(null);
    setShowMeasureModal(true);
  };

  const handleEditMeasure = (measure) => {
    setSelectedMeasure(measure);
    setShowMeasureModal(true);
  };

  const handleDeleteMeasure = async (measureId) => {
    if (!window.confirm('Are you sure you want to delete this measure definition?')) return;

    try {
      await measureService.deleteMeasureDefinition(measureId);
      fetchMeasures();
    } catch (err) {
      console.error('Error deleting measure:', err);
      alert(err.response?.data?.error || 'Failed to delete measure definition');
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const categoryObj = categories.find(c => c.id === category);
    return categoryObj ? categoryObj.icon : '📊';
  };

  // Get category name
  const getCategoryName = (category) => {
    const categoryObj = categories.find(c => c.id === category);
    return categoryObj ? categoryObj.name : category;
  };

  // Get measure type badge variant
  const getMeasureTypeBadgeVariant = (type) => {
    const variants = {
      numeric: 'primary',
      text: 'info',
      boolean: 'success',
      calculated: 'warning'
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

  // Filter measures based on search query and selected categories
  const filteredMeasures = useMemo(() => {
    let filtered = measures;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(measure => {
        return (
          measure.name?.toLowerCase().includes(query) ||
          measure.display_name?.toLowerCase().includes(query) ||
          measure.description?.toLowerCase().includes(query) ||
          measure.category?.toLowerCase().includes(query) ||
          measure.unit?.toLowerCase().includes(query)
        );
      });
    }

    // Filter by selected categories (AND logic)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(measure => {
        return selectedCategories.includes(measure.category);
      });
    }

    return filtered;
  }, [measures, searchQuery, selectedCategories]);

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
          <p>Loading measures...</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h1>📊 Measure Definitions</h1>
            <p className="text-muted">Manage health measure definitions for patient tracking</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Measure Definitions ({measures.length})</h5>
            <Button variant="primary" size="sm" onClick={handleCreateMeasure}>
              ➕ New Measure
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
                    placeholder="Search by name, display name, category, unit..."
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
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Select category to add...</option>
                    {categories
                      .filter(cat => !selectedCategories.includes(cat.id))
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
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
                          {category.icon} {category.name} ✕
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
                    Showing {filteredMeasures.length} of {measures.length} measure{filteredMeasures.length !== 1 ? 's' : ''}
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

            {measures.length === 0 ? (
              <Alert variant="info">
                No measures defined yet. Create one to get started!
              </Alert>
            ) : filteredMeasures.length === 0 ? (
              <Alert variant="warning">
                No measures found matching your filters. Try adjusting your search or category filters.
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Display Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeasures.map((measure) => (
                    <tr key={measure.id}>
                      <td>
                        <code>{highlightText(measure.name, searchQuery)}</code>
                      </td>
                      <td>
                        <strong>{highlightText(measure.display_name, searchQuery)}</strong>
                      </td>
                      <td>
                        <Badge bg="light" text="dark">
                          {getCategoryIcon(measure.category)} {highlightText(getCategoryName(measure.category), searchQuery)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getMeasureTypeBadgeVariant(measure.measure_type)}>
                          {measure.measure_type}
                        </Badge>
                      </td>
                      <td>
                        {measure.unit ? (
                          <code>{highlightText(measure.unit, searchQuery)}</code>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {measure.is_active ? (
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
                          onClick={() => handleEditMeasure(measure)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteMeasure(measure.id)}
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

        {/* TODO: Add MeasureDefinitionModal component when created */}
        {/* <MeasureDefinitionModal
          show={showMeasureModal}
          onHide={() => setShowMeasureModal(false)}
          measure={selectedMeasure}
          onSuccess={fetchMeasures}
        /> */}
      </Container>
    </Layout>
  );
};

export default MeasuresPage;
