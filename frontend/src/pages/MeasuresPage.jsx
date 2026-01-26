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
import MeasureDefinitionModal from '../components/MeasureDefinitionModal';
import MeasureTranslationModal from '../components/MeasureTranslationModal';
import * as measureService from '../services/measureService';
import ActionButton from '../components/ActionButton';
import i18n from '../i18n';

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
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [translationMeasure, setTranslationMeasure] = useState(null);

  // Define available categories
  const categories = [
    { id: 'vitals', name: t('measures.categories.vitals', 'Vitals'), icon: '💓' },
    { id: 'lab_results', name: t('measures.categories.labResults', 'Lab Results'), icon: '🧪' },
    { id: 'anthropometric', name: t('measures.categories.anthropometric', 'Anthropometric'), icon: '📏' },
    { id: 'lifestyle', name: t('measures.categories.lifestyle', 'Lifestyle'), icon: '🏃' },
    { id: 'symptoms', name: t('measures.categories.symptoms', 'Symptoms'), icon: '🤒' },
    { id: 'other', name: t('measures.categories.other', 'Other'), icon: '📊' }
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
    if (!window.confirm(t('measures.confirmDelete'))) return;

    try {
      await measureService.deleteMeasureDefinition(measureId);
      fetchMeasures();
    } catch (err) {
      console.error('Error deleting measure:', err);
      alert(err.response?.data?.error || t('measures.deleteError'));
    }
  };

  const handleTranslateMeasure = (measure) => {
    setTranslationMeasure(measure);
    setShowTranslationModal(true);
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

  // Get translated display name for a measure
  const getTranslatedDisplayName = (measure) => {
    if (!measure) return '';

    // Get current language from i18n
    const currentLang = i18n.language || 'en';

    // Check if translations exist
    if (measure.translations && measure.translations.length > 0) {
      // Find translation for current language
      const translation = measure.translations.find(
        tr => tr.language_code === currentLang && tr.field_name === 'display_name'
      );
      if (translation && translation.translated_value) {
        return translation.translated_value;
      }
    }

    // Fallback to default display_name
    return measure.display_name;
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
        // Check if search matches translated display name
        const translatedName = getTranslatedDisplayName(measure)?.toLowerCase();

        return (
          measure.name?.toLowerCase().includes(query) ||
          measure.display_name?.toLowerCase().includes(query) ||
          translatedName?.includes(query) ||
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
          <p>{t('measures.loading')}</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h1>📊 {t('measures.title')}</h1>
            <p className="text-muted">{t('measures.subtitle')}</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">{t('measures.cardTitle', { count: measures.length })}</h5>
            <Button variant="primary" size="sm" onClick={handleCreateMeasure}>
              ➕ {t('measures.newMeasure')}
            </Button>
          </Card.Header>
          <Card.Body>
            {/* Search Bar and Category Filter */}
            <Row className="mb-3">
              <Col xs={12} md={6} className="mb-3 mb-md-0">
                <Form.Label>{t('measures.search')}</Form.Label>
                <InputGroup>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder={t('measures.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSearchQuery('')}
                      title={t('measures.clearSearch')}
                    >
                      ✕
                    </Button>
                  )}
                </InputGroup>
              </Col>
              <Col xs={12} md={6}>
                <Form.Label>{t('measures.filterByCategory')}</Form.Label>
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
                    <option value="">{t('measures.selectCategory')}</option>
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
                    title={t('measures.selectAll')}
                  >
                    {t('measures.all')}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleDeselectAllCategories}
                    disabled={selectedCategories.length === 0}
                    title={t('measures.deselectAll')}
                  >
                    {t('measures.none')}
                  </Button>
                </div>
              </Col>
            </Row>

            {/* Selected Categories Badges */}
            {selectedCategories.length > 0 && (
              <Row className="mb-3">
                <Col>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <small className="text-muted">{t('measures.filteringBy')}</small>
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
                    {t('measures.showingResults', {
                      filtered: filteredMeasures.length,
                      total: measures.length
                    })}
                  </Form.Text>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleClearAllFilters}
                  >
                    🔄 {t('measures.clearAllFilters')}
                  </Button>
                </Col>
              </Row>
            )}

            {measures.length === 0 ? (
              <Alert variant="info">
                {t('measures.noMeasures')}
              </Alert>
            ) : filteredMeasures.length === 0 ? (
              <Alert variant="warning">
                {t('measures.noResults')}
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>{t('measures.table.name')}</th>
                    <th>{t('measures.table.displayName')}</th>
                    <th>{t('measures.table.category')}</th>
                    <th>{t('measures.table.type')}</th>
                    <th>{t('measures.table.unit')}</th>
                    <th>{t('measures.table.status')}</th>
                    <th>{t('measures.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeasures.map((measure) => (
                    <tr
                      key={measure.id}
                      onClick={() => navigate(`/settings/measures/${measure.id}/view`)}
                      className="clickable-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <code>{highlightText(measure.name, searchQuery)}</code>
                      </td>
                      <td>
                        <strong>{highlightText(getTranslatedDisplayName(measure), searchQuery)}</strong>
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
                          <Badge bg="success">{t('measures.status.active')}</Badge>
                        ) : (
                          <Badge bg="secondary">{t('measures.status.inactive')}</Badge>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <ActionButton
                            action="edit"
                            onClick={() => handleEditMeasure(measure)}
                            title={t('common.edit', 'Edit')}
                          />
                          <ActionButton
                            action="translate"
                            onClick={() => handleTranslateMeasure(measure)}
                            title={t('measures.actions.translationsTooltip')}
                          />
                          <ActionButton
                            action="delete"
                            onClick={() => handleDeleteMeasure(measure.id)}
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

        {/* Measure Definition Modal */}
        <MeasureDefinitionModal
          show={showMeasureModal}
          onHide={() => {
            setShowMeasureModal(false);
            setSelectedMeasure(null);
          }}
          definition={selectedMeasure}
          onSuccess={() => {
            fetchMeasures();
            setShowMeasureModal(false);
            setSelectedMeasure(null);
          }}
        />

        {/* Measure Translation Modal */}
        <MeasureTranslationModal
          show={showTranslationModal}
          onHide={() => {
            setShowTranslationModal(false);
            setTranslationMeasure(null);
          }}
          measure={translationMeasure}
          onSuccess={() => {
            fetchMeasures();
          }}
        />
      </Container>
    </Layout>
  );
};

export default MeasuresPage;
