/**
 * EditPatientModal Component
 * Slide panel for editing existing patients with custom fields organized by categories.
 * Uses SlidePanel + FormSection for harmonized UX.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import PatientTagsManager from './PatientTagsManager';
import * as patientTagService from '../services/patientTagService';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from './CustomFieldInput';
import api from '../services/api';
import SlidePanel from './ui/SlidePanel';
import FormSection from './ui/FormSection';

const EditPatientModal = ({ show, onHide, onSubmit, patient }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dietitians, setDietitians] = useState([]);
  const [patientTags, setPatientTags] = useState([]);

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({
    status: 'idle', // 'idle' | 'checking' | 'available' | 'taken'
    message: ''
  });
  const [originalEmail, setOriginalEmail] = useState('');
  const emailCheckTimeout = useRef(null);

  // Custom fields state
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  // Basic patient info
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    assigned_dietitian_id: '',
    tags: []
  });

  useEffect(() => {
    if (show) {
      fetchDietitians();
      fetchCustomFields();
    }
  }, [show]);

  useEffect(() => {
    if (patient && show) {
      loadPatientData();
    }
  }, [patient, show]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
    };
  }, []);

  const fetchDietitians = async () => {
    try {
      const response = await userService.getDietitians();
      const data = response.data?.data || response.data || [];
      setDietitians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch dietitians:', err);
      setDietitians([]);
    }
  };

  const fetchCustomFields = async () => {
    try {
      setLoadingCustomFields(true);
      const categoriesResponse = await customFieldService.getCategories({ is_active: true });
      const categories = categoriesResponse || [];

      const definitionsResponse = await customFieldService.getDefinitions();
      const definitions = definitionsResponse || [];

      const categoriesWithFields = categories.map(category => ({
        ...category,
        fields: definitions.filter(def => def.category_id === category.id && def.is_active)
          .sort((a, b) => a.display_order - b.display_order)
      }));

      setCustomFieldCategories(categoriesWithFields);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError(t('errors.loadingCustomFields', 'Error loading custom fields'));
    } finally {
      setLoadingCustomFields(false);
    }
  };

  const fetchPatientTags = async (patientId) => {
    try {
      const response = await patientTagService.getPatientTags(patientId);
      const tags = response.data?.data || response.data || [];
      const tagNames = Array.isArray(tags) ? tags.map(tag => tag.tag_name) : [];
      setPatientTags(tagNames);
      return tagNames;
    } catch (err) {
      console.error('Failed to fetch patient tags:', err);
      setPatientTags([]);
      return [];
    }
  };

  // Check email availability with debounce (500ms)
  const checkEmailAvailability = useCallback(async (email, original) => {
    if (!email || !email.trim()) {
      setEmailValidation({ status: 'idle', message: '' });
      return;
    }

    // If email hasn't changed from original, don't validate
    if (email.trim().toLowerCase() === original.trim().toLowerCase()) {
      setEmailValidation({ status: 'idle', message: '' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({ status: 'idle', message: '' });
      return;
    }

    setEmailValidation({ status: 'checking', message: t('common.checking', 'Checking...') });

    try {
      const response = await api.get(`/patients/check-email/${encodeURIComponent(email.trim().toLowerCase())}`);
      const isAvailable = response.data?.available;

      if (isAvailable) {
        setEmailValidation({
          status: 'available',
          message: t('patients.emailAvailable', 'Email available')
        });
      } else {
        setEmailValidation({
          status: 'taken',
          message: t('patients.emailTaken', 'This email is already used by another patient')
        });
      }
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailValidation({ status: 'idle', message: '' });
    }
  }, [t]);

  const loadPatientData = async () => {
    try {
      const tags = await fetchPatientTags(patient.id);

      // Set basic patient info
      const patientEmail = patient.email || '';
      setOriginalEmail(patientEmail);
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        email: patientEmail,
        phone: patient.phone || '',
        assigned_dietitian_id: patient.assigned_dietitian_id || '',
        tags: tags
      });

      // Load custom field values
      const customFieldsResponse = await customFieldService.getPatientCustomFields(patient.id);
      const customFields = customFieldsResponse || [];

      const valuesMap = {};
      customFields.forEach(field => {
        valuesMap[field.field_definition_id] = field.value;
      });
      setFieldValues(valuesMap);
      setError(null);
    } catch (err) {
      console.error('Error loading patient data:', err);
      setError(t('errors.loadingPatientData', 'Error loading patient data'));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);

    // Debounced email validation
    if (name === 'email') {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
      setEmailValidation({ status: 'idle', message: '' });
      if (value && value.trim()) {
        emailCheckTimeout.current = setTimeout(() => {
          checkEmailAvailability(value, originalEmail);
        }, 500);
      }
    }
  };

  const handleTagsChange = (newTags) => {
    setFormData(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const handleFieldChange = (fieldDefinitionId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldDefinitionId]: value
    }));
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldDefinitionId];
      return newErrors;
    });
  };

  const validateBasicForm = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError(t('patients.nameRequired', 'First name and last name are required'));
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError(t('patients.invalidEmail', 'Invalid email format'));
      return false;
    }
    if (formData.email && formData.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase()) {
      if (emailValidation.status === 'taken') {
        setError(t('patients.emailTaken', 'This email is already used by another patient'));
        return false;
      }
      if (emailValidation.status === 'checking') {
        setError(t('patients.emailChecking', 'Email verification in progress...'));
        return false;
      }
    }
    return true;
  };

  const validateCustomFields = () => {
    const errors = {};
    let hasErrors = false;

    customFieldCategories.forEach(category => {
      category.fields.forEach(field => {
        const value = fieldValues[field.id];
        const validation = field.validateValue ? field.validateValue(value) : { isValid: true };

        if (!validation.isValid) {
          errors[field.id] = validation.error || t('common.invalidValue', 'Invalid value');
          hasErrors = true;
        }
      });
    });

    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateBasicForm()) return;
    if (!validateCustomFields()) {
      setError(t('patients.fixFieldErrors', 'Please fix the errors in the fields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const basicData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        assigned_dietitian_id: formData.assigned_dietitian_id || null,
        tags: formData.tags
      };

      const success = await onSubmit(patient.id, basicData);

      if (success) {
        const customFieldsData = Object.keys(fieldValues).map(fieldDefinitionId => ({
          field_definition_id: fieldDefinitionId,
          value: fieldValues[fieldDefinitionId]
        }));

        if (customFieldsData.length > 0) {
          await customFieldService.updatePatientCustomFields(patient.id, customFieldsData);
        }

        handleClose();
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(t('errors.updateFailed', 'Update failed') + ': ' + (err.message || t('errors.unknown', 'Unknown error')));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      assigned_dietitian_id: '',
      tags: []
    });
    setFieldValues({});
    setFieldErrors({});
    setError(null);
    setEmailValidation({ status: 'idle', message: '' });
    setOriginalEmail('');
    onHide();
  };

  if (!patient) return null;

  // Count filled fields for progress indication
  const filledBasicFields = [formData.first_name, formData.last_name].filter(Boolean).length;
  const totalBasicRequired = 2;

  return (
    <SlidePanel
      show={show}
      onHide={handleClose}
      title={`${patient.first_name} ${patient.last_name}`}
      subtitle={t('patients.editPatient', 'Edit patient')}
      icon={
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 18c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      }
      size="lg"
      onSubmit={handleSubmit}
      submitLabel={t('patients.updatePatient', 'Update patient')}
      loading={loading || loadingCustomFields}
    >
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Basic Info Section */}
        <FormSection
          title={t('patients.basicInfo', 'Personal information')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          description={`${filledBasicFields}/${totalBasicRequired} ${t('common.required', 'required')}`}
          accent="slate"
        >
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  {t('patients.firstName', 'First name')} <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder={t('patients.firstNamePlaceholder', 'e.g. Marie')}
                  required
                  autoFocus
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  {t('patients.lastName', 'Last name')} <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder={t('patients.lastNamePlaceholder', 'e.g. Dupont')}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('patients.email', 'Email')}</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="marie@example.com"
                  isValid={emailValidation.status === 'available'}
                  isInvalid={emailValidation.status === 'taken'}
                />
                {emailValidation.status === 'checking' && (
                  <Form.Text className="text-muted">
                    <Spinner animation="border" size="sm" className="me-1" />
                    {emailValidation.message}
                  </Form.Text>
                )}
                {emailValidation.status === 'available' && (
                  <Form.Control.Feedback type="valid">
                    {emailValidation.message}
                  </Form.Control.Feedback>
                )}
                {emailValidation.status === 'taken' && (
                  <Form.Control.Feedback type="invalid">
                    {emailValidation.message}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('patients.phone', 'Phone')}</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+33 6 12 34 56 78"
                />
              </Form.Group>
            </Col>
          </Row>
        </FormSection>

        {/* Dietitian & Tags Section */}
        <FormSection
          title={t('patients.organization', 'Organization')}
          icon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 13h12M4 9h8M6 5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
          accent="gold"
          collapsible
          defaultOpen
        >
          <Form.Group className="mb-3">
            <Form.Label>{t('patients.linkedDietitians', 'Linked dietitians')}</Form.Label>
            <Form.Text className="d-block text-muted mb-1">
              {t('patients.linkedDietitiansInfo', 'Dietitians are linked automatically during visits. Manage links from the patient record.')}
            </Form.Text>
            {patient?.assigned_dietitian && (
              <div className="small" style={{ color: 'var(--nv-warm-700)' }}>
                {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
              </div>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('patients.tags', 'Patient tags')}</Form.Label>
            <PatientTagsManager
              patientId={patient?.id}
              initialTags={formData.tags}
              onTagsChange={handleTagsChange}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              {t('patients.tagsHelp', 'Tags help organize and filter patients')}
            </Form.Text>
          </Form.Group>
        </FormSection>

        {/* Custom Field Categories */}
        {loadingCustomFields ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" className="me-2" />
            <span className="text-muted small">{t('common.loadingFields', 'Loading fields...')}</span>
          </div>
        ) : (
          customFieldCategories.map((category) => (
            <FormSection
              key={category.id}
              title={category.name}
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3h10v10H3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M6 6h4M6 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              }
              description={category.description}
              accent="info"
              collapsible
              defaultOpen={false}
            >
              {category.fields.length === 0 ? (
                <p className="text-muted small mb-0">
                  {t('customFields.noFieldsDefined', 'No fields defined for this category')}
                </p>
              ) : (
                <Row>
                  {category.fields.map((field) => (
                    <Col sm={6} key={field.id}>
                      <Form.Group className="mb-3">
                        <CustomFieldInput
                          fieldDefinition={field}
                          value={fieldValues[field.id] || ''}
                          onChange={(value) => handleFieldChange(field.id, value)}
                          disabled={loading}
                          error={fieldErrors[field.id]}
                          patientId={patient?.id}
                        />
                        {fieldErrors[field.id] && (
                          <Form.Text className="text-danger">
                            {fieldErrors[field.id]}
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  ))}
                </Row>
              )}
            </FormSection>
          ))
        )}
      </Form>
    </SlidePanel>
  );
};

export default EditPatientModal;
