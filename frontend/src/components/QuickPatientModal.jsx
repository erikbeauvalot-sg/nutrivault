/**
 * QuickPatientModal Component
 * Simplified patient creation modal for rapid workflow
 * Only requires essential fields - details can be completed later
 * Supports custom fields marked as "visible on creation"
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import { getCategories, updatePatientCustomFields } from '../services/customFieldService';
import useEmailCheck from '../hooks/useEmailCheck';
import CustomFieldInput from './CustomFieldInput';

const QuickPatientModal = ({ show, onHide, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom fields state
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);

  // Email availability check with debouncing
  const { checking: checkingEmail, available: emailAvailable, error: emailCheckError } = useEmailCheck(
    formData.email,
    'patient',
    null,
    500
  );

  // Fetch custom fields marked as visible_on_creation
  useEffect(() => {
    if (show) {
      fetchCustomFields();
    }
  }, [show, i18n.resolvedLanguage]);

  const fetchCustomFields = async () => {
    try {
      setLoadingFields(true);
      const categories = await getCategories();

      // Flatten all definitions and filter by visible_on_creation
      const visibleFields = [];
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          if (category.definitions && Array.isArray(category.definitions)) {
            category.definitions
              .filter(def => def.is_active && def.visible_on_creation)
              .forEach(def => {
                visibleFields.push({
                  ...def,
                  category_name: category.name
                });
              });
          }
        });
      }

      // Sort by display_order
      visibleFields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      setCustomFields(visibleFields);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFieldChange = (definitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [definitionId]: value
    }));
  };

  const validateForm = () => {
    // First name and last name are required
    if (!formData.first_name.trim()) {
      setError(t('patients.firstNameRequired', 'First name is required'));
      return false;
    }

    if (!formData.last_name.trim()) {
      setError(t('patients.lastNameRequired', 'Last name is required'));
      return false;
    }

    // At least email OR phone is required
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError(t('patients.emailOrPhoneRequired', 'Email or phone number is required'));
      return false;
    }

    // Basic email validation if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('patients.invalidEmail', 'Invalid email format'));
        return false;
      }
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.is_required) {
        const value = fieldValues[field.id];
        if (value === undefined || value === null || value === '') {
          setError(t('customFields.fieldRequired', '{{field}} is required', { field: field.field_label }));
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Only send non-empty fields
      const patientData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() })
      };

      const response = await patientService.createPatient(patientData);
      const createdPatient = response.data;

      // Save custom field values if any
      if (createdPatient && createdPatient.id && Object.keys(fieldValues).length > 0) {
        try {
          const fieldsToSave = Object.entries(fieldValues)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([definitionId, value]) => ({
              field_definition_id: definitionId,
              value
            }));

          if (fieldsToSave.length > 0) {
            await updatePatientCustomFields(createdPatient.id, fieldsToSave);
          }
        } catch (cfErr) {
          console.error('Error saving custom fields:', cfErr);
          // Don't fail patient creation if custom fields fail
        }
      }

      // Success
      if (onSuccess) {
        onSuccess(createdPatient);
      }

      // Reset form and close
      resetForm();
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('patients.createError', 'Failed to create patient'));
      console.error('Error creating quick patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    });
    setFieldValues({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('patients.quickCreate', 'Quick Patient Creation')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert variant="info" className="small mb-3">
            <i className="fas fa-info-circle me-2"></i>
            {t('patients.quickCreateInfo', 'Enter essential information only. Complete details can be added later.')}
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.firstName', 'First Name')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder={t('patients.firstNamePlaceholder', 'Enter first name')}
              autoFocus
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.lastName', 'Last Name')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder={t('patients.lastNamePlaceholder', 'Enter last name')}
              disabled={loading}
              required
            />
          </Form.Group>

          <Alert variant="secondary" className="small mb-3">
            {t('patients.contactRequired', 'At least one contact method is required (email or phone)')}
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.email', 'Email')}
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('patients.emailPlaceholder', 'patient@example.com')}
              disabled={loading}
              isInvalid={formData.email && emailAvailable === false}
              isValid={formData.email && emailAvailable === true}
            />
            {checkingEmail && formData.email && (
              <Form.Text className="text-muted">
                <Spinner animation="border" size="sm" className="me-1" />
                {t('patients.checkingEmail', 'Checking email availability...')}
              </Form.Text>
            )}
            {emailAvailable === false && formData.email && (
              <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                {t('patients.emailTaken', 'This email is already used by another patient')}
              </Form.Control.Feedback>
            )}
            {emailAvailable === true && formData.email && (
              <Form.Control.Feedback type="valid" style={{ display: 'block' }}>
                {t('patients.emailAvailable', 'Email is available')}
              </Form.Control.Feedback>
            )}
            {emailCheckError && (
              <Form.Text className="text-danger">
                {emailCheckError}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.phone', 'Phone Number')}
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('patients.phonePlaceholder', '+33 6 12 34 56 78')}
              disabled={loading}
            />
          </Form.Group>

          {/* Custom Fields Section */}
          {loadingFields ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">{t('common.loading', 'Loading...')}</span>
            </div>
          ) : customFields.length > 0 && (
            <div className="border-top pt-3 mt-3">
              <h6 className="text-muted mb-3">
                {t('customFields.additionalInfo', 'Additional Information')}
              </h6>
              {customFields.map(field => (
                <Form.Group key={field.id} className="mb-3">
                  <CustomFieldInput
                    definition={field}
                    value={fieldValues[field.id] ?? ''}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    disabled={loading}
                  />
                </Form.Group>
              ))}
            </div>
          )}

          <Alert variant="success" className="small mb-0">
            <i className="fas fa-check-circle me-2"></i>
            {t('patients.quickCreateSuccess', 'Patient will be created instantly. You can complete additional details from their profile page.')}
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || checkingEmail || (formData.email && emailAvailable === false)}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.creating', 'Creating...')}
              </>
            ) : (
              t('patients.createQuick', 'Create Patient')
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default QuickPatientModal;
