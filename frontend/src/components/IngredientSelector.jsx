/**
 * Ingredient Selector Component
 * Autocomplete component for selecting ingredients
 */

import { useState, useEffect, useRef } from 'react';
import { Form, ListGroup, Spinner, Badge, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as ingredientService from '../services/ingredientService';
import IngredientModal from './IngredientModal';

const IngredientSelector = ({ onSelect, placeholder, excludeIds = [] }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentIngredients, setRecentIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent ingredients on mount
  useEffect(() => {
    const loadRecentIngredients = async () => {
      try {
        const { data } = await ingredientService.getIngredients({ limit: 10 });
        setRecentIngredients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading recent ingredients:', error);
      }
    };
    loadRecentIngredients();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchIngredients = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await ingredientService.searchIngredients(query, 10);
        // Filter out excluded IDs
        const filtered = data.filter(ing => !excludeIds.includes(ing.id));
        setResults(filtered);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching ingredients:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchIngredients, 300);
    return () => clearTimeout(debounce);
  }, [query, excludeIds]);

  // Get display list - either search results or recent ingredients
  const displayList = query.length >= 2
    ? results
    : recentIngredients.filter(ing => !excludeIds.includes(ing.id));

  const handleSelect = (ingredient) => {
    onSelect(ingredient);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || displayList.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < displayList.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : displayList.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < displayList.length) {
          handleSelect(displayList[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      proteins: t('ingredients.categories.proteins', 'Proteins'),
      grains: t('ingredients.categories.grains', 'Grains'),
      vegetables: t('ingredients.categories.vegetables', 'Vegetables'),
      fruits: t('ingredients.categories.fruits', 'Fruits'),
      dairy: t('ingredients.categories.dairy', 'Dairy'),
      oils: t('ingredients.categories.oils', 'Oils & Fats'),
      nuts: t('ingredients.categories.nuts', 'Nuts & Seeds'),
      legumes: t('ingredients.categories.legumes', 'Legumes')
    };
    return labels[category] || category;
  };

  const handleFocus = () => {
    setShowDropdown(true);
  };

  const handleCreateClick = () => {
    setCreateName(query);
    setShowDropdown(false);
    setShowCreateModal(true);
  };

  const handleIngredientCreated = (newIngredient) => {
    console.log('[IngredientSelector] handleIngredientCreated called with:', newIngredient);
    console.log('[IngredientSelector] onSelect exists:', !!onSelect);
    // Call onSelect FIRST before any state changes that might cause re-renders
    onSelect(newIngredient);
    console.log('[IngredientSelector] onSelect called successfully');
    // Then update local state
    setRecentIngredients(prev => [newIngredient, ...prev.slice(0, 9)]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setShowCreateModal(false);
    inputRef.current?.focus();
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setCreateName('');
  };

  return (
    <div ref={containerRef} className="position-relative">
      <Form.Control
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder || t('ingredients.searchPlaceholder', 'Search ingredients...')}
      />
      {loading && (
        <div className="position-absolute end-0 top-50 translate-middle-y me-3">
          <Spinner size="sm" animation="border" />
        </div>
      )}

      {showDropdown && displayList.length > 0 && (
        <ListGroup
          className="position-absolute w-100 mt-1 shadow-sm"
          style={{ zIndex: 1060, maxHeight: '300px', overflowY: 'auto' }}
        >
          {query.length < 2 && (
            <ListGroup.Item className="text-muted small py-1 bg-light">
              {t('ingredients.availableIngredients', 'Available ingredients')}
            </ListGroup.Item>
          )}
          {displayList.map((ingredient, index) => (
            <ListGroup.Item
              key={ingredient.id}
              action
              active={index === selectedIndex}
              onClick={() => handleSelect(ingredient)}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <strong>{ingredient.name}</strong>
                {ingredient.category && (
                  <Badge bg="light" text="dark" className="ms-2">
                    {getCategoryLabel(ingredient.category)}
                  </Badge>
                )}
              </div>
              <small className="text-muted">
                {ingredient.default_unit}
              </small>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {showDropdown && query.length >= 2 && displayList.length === 0 && !loading && (
        <ListGroup
          className="position-absolute w-100 mt-1 shadow-sm"
          style={{ zIndex: 1060 }}
        >
          <ListGroup.Item className="text-center py-3">
            <div className="text-muted mb-2">
              {t('ingredients.noResults', 'No ingredients found')}
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleCreateClick}
            >
              ➕ {t('ingredients.createNew', 'Create "{{name}}"', { name: query })}
            </Button>
          </ListGroup.Item>
        </ListGroup>
      )}

      {showDropdown && query.length < 2 && displayList.length === 0 && !loading && (
        <ListGroup
          className="position-absolute w-100 mt-1 shadow-sm"
          style={{ zIndex: 1060 }}
        >
          <ListGroup.Item className="text-muted text-center">
            {t('ingredients.noIngredientsAvailable', 'No ingredients available. Create some first.')}
          </ListGroup.Item>
        </ListGroup>
      )}

      {/* Create Ingredient Modal */}
      <IngredientModal
        show={showCreateModal}
        onHide={handleModalClose}
        ingredient={null}
        initialName={createName}
        onCreated={handleIngredientCreated}
      />
    </div>
  );
};

export default IngredientSelector;
