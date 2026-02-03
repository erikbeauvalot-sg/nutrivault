/**
 * EditPatientModal Component
 * Modal form for editing existing patients with custom fields organized by categories
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Tab, Tabs, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import PatientTagsManager from './PatientTagsManager';
import * as patientTagService from '../services/patientTagService';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from './CustomFieldInput';
import api from '../services/api';

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
      setError('Erreur lors du chargement des champs personnalisés');
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

    setEmailValidation({ status: 'checking', message: 'Vérification...' });

    try {
      const response = await api.get(`/patients/check-email/${encodeURIComponent(email.trim().toLowerCase())}`);
      const isAvailable = response.data?.available;

      if (isAvailable) {
        setEmailValidation({
          status: 'available',
          message: '✓ Email disponible'
        });
      } else {
        setEmailValidation({
          status: 'taken',
          message: '✗ Cet email est déjà utilisé par un autre patient'
        });
      }
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailValidation({ status: 'idle', message: '' });
    }
  }, []);

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
      setError('Erreur lors du chargement des données patient');
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
      // Clear previous timeout
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }

      // Reset validation status while typing
      setEmailValidation({ status: 'idle', message: '' });

      // Set new timeout (500ms debounce)
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

    // Clear error for this field
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldDefinitionId];
      return newErrors;
    });
  };

  const validateBasicForm = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Le prénom et le nom sont requis');
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Format email invalide');
      return false;
    }
    // Check if email is taken (only if it was changed from original)
    if (formData.email && formData.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase()) {
      if (emailValidation.status === 'taken') {
        setError('Cet email est déjà utilisé par un autre patient');
        return false;
      }
      // Wait for email validation to complete
      if (emailValidation.status === 'checking') {
        setError('Vérification de l\'email en cours...');
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
          errors[field.id] = validation.error || 'Valeur invalide';
          hasErrors = true;
        }
      });
    });

    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateBasicForm()) return;
    if (!validateCustomFields()) {
      setError('Veuillez corriger les erreurs dans les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update basic patient info
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
        // Update custom fields
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
      setError('Échec de la mise à jour: ' + (err.message || 'Erreur inconnue'));
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

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="md-down" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('patients.editPatient')}: {patient.first_name} {patient.last_name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Tabs defaultActiveKey="basic-info" className="mb-3">
            {/* Basic Info Tab */}
            <Tab eventKey="basic-info" title="📋 Informations de base">
              <div className="mb-4">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Prénom *</Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom *</Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Téléphone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.linkedDietitians', 'Diététiciens liés')}</Form.Label>
                  <Form.Text className="d-block text-muted mb-1">
                    {t('patients.linkedDietitiansInfo', 'Les diététiciens sont liés automatiquement lors des visites. Gérez les liens depuis la fiche patient.')}
                  </Form.Text>
                  {patient?.assigned_dietitian && (
                    <div className="small">
                      {patient.assigned_dietitian.first_name} {patient.assigned_dietitian.last_name}
                    </div>
                  )}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tags patient</Form.Label>
                  <PatientTagsManager
                    patientId={patient?.id}
                    initialTags={formData.tags}
                    onTagsChange={handleTagsChange}
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Les tags aident à organiser et filtrer les patients
                  </Form.Text>
                </Form.Group>
              </div>
            </Tab>

            {/* Custom Field Categories Tabs */}
            {loadingCustomFields ? (
              <Tab eventKey="loading" title="⏳ Chargement..." disabled>
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              </Tab>
            ) : (
              customFieldCategories.map((category) => (
                <Tab
                  key={category.id}
                  eventKey={`category-${category.id}`}
                  title={category.name}
                >
                  <div className="mb-4">
                    {category.description && (
                      <Alert variant="info" className="mb-3">
                        {category.description}
                      </Alert>
                    )}

                    {category.fields.length === 0 ? (
                      <Alert variant="warning">
                        Aucun champ défini pour cette catégorie
                      </Alert>
                    ) : (
                      <Row>
                        {category.fields.map((field) => (
                          <Col md={6} key={field.id}>
                            <Form.Group className="mb-3">
                              <CustomFieldInput
                                fieldDefinition={field}
                                value={fieldValues[field.id] || ''}
                                onChange={(value) => handleFieldChange(field.id, value)}
                                disabled={loading}
                                error={fieldErrors[field.id]}
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
                  </div>
                </Tab>
              ))
            )}
          </Tabs>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading || loadingCustomFields}>
          {loading ? 'Mise à jour...' : 'Mettre à jour le patient'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditPatientModal;
