import React, { useState, useEffect } from 'react';
import { Form, Badge, Button, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientTagService from '../services/patientTagService';

/**
 * Patient Tags Manager Component
 * Allows adding/removing tags from patients with autocomplete
 */
const PatientTagsManager = ({
  patientId,
  initialTags = [],
  onTagsChange,
  disabled = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [tags, setTags] = useState(initialTags);
  const [availableTags, setAvailableTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // Load available tags for suggestions
  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        setLoading(true);
        const allTags = await patientTagService.getAllTags();
        setAvailableTags(allTags);
      } catch (err) {
        console.error('Failed to load available tags:', err);
        // Don't show error for suggestions loading
      } finally {
        setLoading(false);
      }
    };

    loadAvailableTags();
  }, []);

  // Update filtered suggestions based on input
  useEffect(() => {
    if (newTagInput.trim()) {
      const filtered = availableTags.filter(tag =>
        tag.toLowerCase().includes(newTagInput.toLowerCase()) &&
        !tags.includes(tag)
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
    } else {
      setFilteredSuggestions([]);
    }
  }, [newTagInput, availableTags, tags]);

  // Notify parent of tag changes
  useEffect(() => {
    if (onTagsChange) {
      onTagsChange(tags);
    }
  }, [tags, onTagsChange]);

  const handleAddTag = async (tagName) => {
    const normalizedTag = tagName.toLowerCase().trim();

    if (!normalizedTag) return;
    if (tags.includes(normalizedTag)) {
      setError(t('patients.tags.alreadyExists', 'Tag already exists'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (patientId) {
        // Add to backend if we have a patient ID
        await patientTagService.addPatientTag(patientId, normalizedTag);
      }

      // Update local state
      setTags(prev => [...prev, normalizedTag]);
      setNewTagInput('');
      setFilteredSuggestions([]);
    } catch (err) {
      console.error('Failed to add tag:', err);
      setError(err.response?.data?.error || t('patients.tags.addFailed', 'Failed to add tag'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    try {
      setSaving(true);
      setError(null);

      if (patientId) {
        // Remove from backend if we have a patient ID
        await patientTagService.removePatientTag(patientId, tagToRemove);
      }

      // Update local state
      setTags(prev => prev.filter(tag => tag !== tagToRemove));
    } catch (err) {
      console.error('Failed to remove tag:', err);
      setError(err.response?.data?.error || t('patients.tags.removeFailed', 'Failed to remove tag'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(newTagInput);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleAddTag(suggestion);
  };

  return (
    <div className={`patient-tags-manager ${className}`}>
      <Form.Group className="mb-3">
        <Form.Label>
          {t('patients.tags.label', 'Patient Tags')}
        </Form.Label>

        {/* Current Tags */}
        <div className="mb-2">
          {tags.length === 0 ? (
            <small className="text-muted">
              {t('patients.tags.noTags', 'No tags assigned')}
            </small>
          ) : (
            tags.map(tag => (
              <Badge
                key={tag}
                bg="secondary"
                className="me-2 mb-1"
                style={{ cursor: disabled ? 'default' : 'pointer' }}
                onClick={() => !disabled && handleRemoveTag(tag)}
                title={disabled ? '' : t('patients.tags.clickToRemove', 'Click to remove')}
              >
                {tag}
                {!disabled && (
                  <span className="ms-1" aria-hidden="true">×</span>
                )}
              </Badge>
            ))
          )}
        </div>

        {/* Add New Tag */}
        {!disabled && (
          <InputGroup>
            <Form.Control
              type="text"
              placeholder={t('patients.tags.addPlaceholder', 'Add a tag...')}
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyPress={handleInputKeyPress}
              disabled={saving}
              maxLength={50}
            />
            <Button
              variant="outline-primary"
              onClick={() => handleAddTag(newTagInput)}
              disabled={!newTagInput.trim() || saving}
            >
              {saving ? (
                <Spinner animation="border" size="sm" />
              ) : (
                t('patients.tags.add', 'Add')
              )}
            </Button>
          </InputGroup>
        )}

        {/* Suggestions Dropdown */}
        {filteredSuggestions.length > 0 && !disabled && (
          <div className="suggestions-dropdown mt-1 border rounded p-2 bg-light">
            <small className="text-muted d-block mb-1">
              {t('patients.tags.suggestions', 'Suggestions')}:
            </small>
            {filteredSuggestions.map(suggestion => (
              <Badge
                key={suggestion}
                bg="light"
                text="dark"
                className="me-1 mb-1"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                + {suggestion}
              </Badge>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="danger" className="mt-2 mb-0">
            {error}
          </Alert>
        )}

        {/* Help Text */}
        <Form.Text className="text-muted">
          {t('patients.tags.help', 'Tags help categorize and filter patients. Click on a tag to remove it.')}
        </Form.Text>
      </Form.Group>
    </div>
  );
};

export default PatientTagsManager;