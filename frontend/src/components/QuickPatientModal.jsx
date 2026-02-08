/**
 * QuickPatientModal Component
 * Simplified patient creation via SlidePanel for rapid workflow.
 * Only requires essential fields - details can be completed later.
 * Supports custom fields marked as "visible on creation".
 */

import { useState, useEffect } from 'react';
import { Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import { getCategories, updatePatientCustomFields } from '../services/customFieldService';
import useEmailCheck from '../hooks/useEmailCheck';
import CustomFieldInput from './CustomFieldInput';
import SlidePanel from './ui/SlidePanel';
import FormSection from './ui/FormSection';
import useFormPersist from '../hooks/useFormPersist';

const QuickPatientModal = ({ show, onHide, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const defaultFormData = {
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  };
  const [formData, setFormData, clearFormStorage] = useFormPersist('quick-patient', defaultFormData);
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

      const visibleFields = [];
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          const definitions = category.field_definitions || category.definitions || [];
          if (Array.isArray(definitions)) {
            definitions
              .filter(def => def.is_active !== false && def.visible_on_creation)
              .forEach(def => {
                visibleFields.push({
                  ...def,
                  category_name: category.name
                });
              });
          }
        });
      }

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
    if (!formData.first_name.trim()) {
      setError(t('patients.firstNameRequired', 'First name is required'));
      return false;
    }
    if (!formData.last_name.trim()) {
      setError(t('patients.lastNameRequired', 'Last name is required'));
      return false;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError(t('patients.emailOrPhoneRequired', 'Email or phone number is required'));
      return false;
    }
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('patients.invalidEmail', 'Invalid email format'));
        return false;
      }
    }
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
    if (e) e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    try {
      setLoading(true);

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
        }
      }

      if (onSuccess) {
        onSuccess(createdPatient);
      }

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
    setFormData(defaultFormData);
    clearFormStorage();
    setFieldValues({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const hasCustomFields = customFields.length > 0;

  // Progress indicator
  const filledRequired = [formData.first_name.trim(), formData.last_name.trim(), (formData.email.trim() || formData.phone.trim())].filter(Boolean).length;

  return (
    <SlidePanel
      show={show}
      onHide={handleClose}
      title={t('patients.quickCreate', 'Quick Patient Creation')}
      subtitle={t('patients.quickCreateInfo', 'Enter essential information only. Complete details can be added later.')}
      icon={
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M15 4v4M13 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }
      size={hasCustomFields ? 'lg' : 'md'}
      onSubmit={handleSubmit}
      submitLabel={t('patients.createQuick', 'Create Patient')}
      loading={loading || checkingEmail || (formData.email && emailAvailable === false)}
    >
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Identity */}
        <FormSection
          title={t('patients.identity', 'Identity')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          description={`${filledRequired}/3 ${t('common.required', 'required')}`}
          accent="slate"
        >
          <Row>
            <Col sm={6}>
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
            </Col>
            <Col sm={6}>
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
            </Col>
          </Row>
        </FormSection>

        {/* Contact */}
        <FormSection
          title={t('patients.contact', 'Contact')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2 6l6 3.5L14 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          description={t('patients.contactRequired', 'At least one contact method is required (email or phone)')}
          accent="gold"
        >
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
        </FormSection>

        {/* Custom Fields */}
        {loadingFields ? (
          <FormSection
            title={t('customFields.additionalInfo', 'Additional Information')}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            }
            accent="info"
            collapsible
          >
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">{t('common.loading', 'Loading...')}</span>
            </div>
          </FormSection>
        ) : hasCustomFields && (
          <FormSection
            title={t('customFields.additionalInfo', 'Additional Information')}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            }
            accent="info"
            collapsible
          >
            {customFields.map(field => (
              <Form.Group key={field.id} className="mb-3">
                <CustomFieldInput
                  fieldDefinition={{ ...field, definition_id: field.id }}
                  value={fieldValues[field.id] ?? ''}
                  onChange={(defId, value) => handleFieldChange(field.id, value)}
                  disabled={loading}
                />
              </Form.Group>
            ))}
          </FormSection>
        )}
      </Form>
    </SlidePanel>
  );
};

export default QuickPatientModal;
