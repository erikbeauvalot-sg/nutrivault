/**
 * PatientCustomFieldsSection Component
 * Displays custom fields for a patient, grouped by categories
 * Supports both read-only and editable modes
 */

import { useState, useEffect } from 'react';
import { Card, Accordion, Spinner, Alert, Button, Row, Col } from 'react-bootstrap';
import PropTypes from 'prop-types';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from './CustomFieldInput';

const PatientCustomFieldsSection = ({ patientId, editable = false, onUpdate = null }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchCustomFields();
    }
  }, [patientId]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const data = await customFieldService.getPatientCustomFields(patientId);

      setCustomFields(data || []);

      // Build initial values map
      const values = {};
      data.forEach(category => {
        category.fields.forEach(field => {
          values[field.definition_id] = field.value;
        });
      });
      setFieldValues(values);
      setError(null);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError(err.response?.data?.error || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [definitionId]: value
    }));

    // Clear error for this field
    if (errors[definitionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[definitionId];
        return newErrors;
      });
    }
  };

  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    customFields.forEach(category => {
      category.fields.forEach(field => {
        if (field.is_required) {
          const value = fieldValues[field.definition_id];
          if (value === null || value === undefined || value === '') {
            newErrors[field.definition_id] = `${field.field_label} is required`;
            isValid = false;
          }
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    try {
      setSaving(true);

      // Build fields array for API
      const fieldsToUpdate = [];
      Object.keys(fieldValues).forEach(definitionId => {
        const value = fieldValues[definitionId];
        // Only include fields that have a value
        if (value !== null && value !== undefined && value !== '') {
          fieldsToUpdate.push({
            definition_id: definitionId,
            value: value
          });
        }
      });

      if (fieldsToUpdate.length > 0) {
        await customFieldService.updatePatientCustomFields(patientId, fieldsToUpdate);

        if (onUpdate) {
          onUpdate();
        }

        // Refresh to get updated data
        await fetchCustomFields();
      }
    } catch (err) {
      console.error('Error saving custom fields:', err);
      setError(err.response?.data?.error || 'Failed to save custom fields');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to fetched values
    fetchCustomFields();
  };

  if (loading) {
    return (
      <Card className="mt-3">
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Loading custom fields...</span>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  // Filter categories that have fields
  const categoriesWithFields = customFields.filter(category => category.fields && category.fields.length > 0);

  if (categoriesWithFields.length === 0) {
    return null; // Don't show section if no custom fields are defined
  }

  return (
    <Card className="mt-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🔧 Custom Fields</h5>
        {editable && (
          <div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="me-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Fields'
              )}
            </Button>
          </div>
        )}
      </Card.Header>
      <Card.Body>
        <Accordion defaultActiveKey="0">
          {categoriesWithFields.map((category, categoryIndex) => (
            <Accordion.Item key={category.id} eventKey={String(categoryIndex)}>
              <Accordion.Header>
                <strong>{category.name}</strong>
                {category.description && (
                  <span className="text-muted ms-2 small">- {category.description}</span>
                )}
              </Accordion.Header>
              <Accordion.Body>
                <Row>
                  {category.fields.map(field => (
                    <Col key={field.definition_id} md={6}>
                      <CustomFieldInput
                        fieldDefinition={field}
                        value={fieldValues[field.definition_id]}
                        onChange={handleFieldChange}
                        disabled={!editable}
                        error={errors[field.definition_id]}
                        patientId={patientId}
                      />
                    </Col>
                  ))}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Body>
    </Card>
  );
};

PatientCustomFieldsSection.propTypes = {
  patientId: PropTypes.string.isRequired,
  editable: PropTypes.bool,
  onUpdate: PropTypes.func
};

export default PatientCustomFieldsSection;
