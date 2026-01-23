/**
 * PatientCustomFieldsTabs Component
 * Displays custom fields organized in tabs by category
 */

import { useState, useEffect } from 'react';
import { Tabs, Tab, Spinner, Alert, Button, Row, Col, Form } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from './CustomFieldInput';

const PatientCustomFieldsTabs = ({ patientId, editable = false, onUpdate = null }) => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchCustomFields();
    }
  }, [patientId, i18n.language]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const data = await customFieldService.getPatientCustomFields(patientId, i18n.language);

      setCustomFields(data || []);

      // Build initial values map
      const values = {};
      data.forEach(category => {
        category.fields.forEach(field => {
          values[field.definition_id] = field.value;
        });
      });
      setFieldValues(values);

      // Set first category as active
      if (data && data.length > 0) {
        setActiveKey(data[0].id);
      }

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
      <div className="text-center py-5">
        <Spinner animation="border" size="sm" />
        <span className="ms-2">Loading patient information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  // Filter categories that have fields
  const categoriesWithFields = customFields.filter(category => category.fields && category.fields.length > 0);

  if (categoriesWithFields.length === 0) {
    return (
      <Alert variant="info">
        No custom fields defined. Please contact your administrator to set up patient information fields.
      </Alert>
    );
  }

  return (
    <div>
      {editable && (
        <div className="d-flex justify-content-end mb-3">
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
              'Save Changes'
            )}
          </Button>
        </div>
      )}

      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey(k)}
        className="mb-3"
      >
        {categoriesWithFields.map((category) => (
          <Tab
            key={category.id}
            eventKey={category.id}
            title={category.name}
          >
            <div className="pt-3">
              {category.description && (
                <p className="text-muted mb-4">{category.description}</p>
              )}
              <Form>
                <Row>
                  {category.fields.map(field => (
                    <Col key={field.definition_id} md={6}>
                      <CustomFieldInput
                        fieldDefinition={field}
                        value={fieldValues[field.definition_id]}
                        onChange={handleFieldChange}
                        disabled={!editable}
                        error={errors[field.definition_id]}
                      />
                    </Col>
                  ))}
                </Row>
              </Form>
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
};

PatientCustomFieldsTabs.propTypes = {
  patientId: PropTypes.string.isRequired,
  editable: PropTypes.bool,
  onUpdate: PropTypes.func
};

export default PatientCustomFieldsTabs;
