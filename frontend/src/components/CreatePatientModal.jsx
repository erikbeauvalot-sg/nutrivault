/**
 * CreatePatientModal Component
 * Multi-step modal form for creating new patients with custom fields
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import PatientTagsManager from './PatientTagsManager';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from './CustomFieldInput';

const CreatePatientModal = ({ show, onHide, onSubmit }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dietitians, setDietitians] = useState([]);

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

  // Calculate total steps: 1 (basic info) + number of custom field categories + 1 (tags)
  const totalSteps = 1 + customFieldCategories.length + 1;

  useEffect(() => {
    if (show) {
      fetchDietitians();
      fetchCustomFields();
    }
  }, [show]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
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

  const validateStep = (step) => {
    if (step === 1) {
      // Basic info validation
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setError('Le prénom et le nom sont requis');
        return false;
      }
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Format email invalide');
        return false;
      }
    } else if (step > 1 && step <= customFieldCategories.length + 1) {
      // Custom fields validation for category at index (step - 2)
      const categoryIndex = step - 2;
      const category = customFieldCategories[categoryIndex];

      if (category) {
        const errors = {};
        let hasErrors = false;

        category.fields.forEach(field => {
          const value = fieldValues[field.id];
          const validation = field.validateValue ? field.validateValue(value) : { isValid: true };

          if (!validation.isValid) {
            errors[field.id] = validation.error || 'Valeur invalide';
            hasErrors = true;
          }
        });

        setFieldErrors(errors);
        if (hasErrors) {
          setError('Veuillez corriger les erreurs dans les champs');
          return false;
        }
      }
    }
    // Last step (tags) has no validation
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      setError(null);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      // Create patient with basic info
      const basicData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        assigned_dietitian_id: formData.assigned_dietitian_id || null,
        tags: formData.tags
      };

      const success = await onSubmit(basicData);

      if (success && success.id) {
        // Update custom fields for the newly created patient
        const customFieldsData = Object.keys(fieldValues)
          .filter(fieldId => fieldValues[fieldId] !== '' && fieldValues[fieldId] !== null)
          .map(fieldDefinitionId => ({
            field_definition_id: fieldDefinitionId,
            value: fieldValues[fieldDefinitionId]
          }));

        if (customFieldsData.length > 0) {
          await customFieldService.updatePatientCustomFields(success.id, customFieldsData);
        }

        handleClose();
      } else if (success === true) {
        // Legacy support if onSubmit just returns true
        handleClose();
      }
    } catch (err) {
      console.error('Error creating patient:', err);
      setError('Échec de la création: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
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
    onHide();
  };

  const renderStepContent = () => {
    if (loadingCustomFields && currentStep > 1 && currentStep <= customFieldCategories.length + 1) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Chargement des champs personnalisés...</p>
        </div>
      );
    }

    if (currentStep === 1) {
      // Step 1: Basic Info
      return (
        <div>
          <h5 className="mb-3">📋 Informations de base</h5>
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
                />
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
            <Form.Label>Diététicien assigné</Form.Label>
            <Form.Select
              name="assigned_dietitian_id"
              value={formData.assigned_dietitian_id}
              onChange={handleInputChange}
            >
              <option value="">Sélectionner un diététicien (optionnel)</option>
              {dietitians.map(dietitian => (
                <option key={dietitian.id} value={dietitian.id}>
                  {dietitian.first_name} {dietitian.last_name}
                  {dietitian.email && ` (${dietitian.email})`}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Laisser vide pour assigner plus tard
            </Form.Text>
          </Form.Group>
        </div>
      );
    } else if (currentStep > 1 && currentStep <= customFieldCategories.length + 1) {
      // Steps 2 to N: Custom field categories
      const categoryIndex = currentStep - 2;
      const category = customFieldCategories[categoryIndex];

      if (!category) {
        return <Alert variant="warning">Catégorie introuvable</Alert>;
      }

      return (
        <div>
          <h5 className="mb-3">{category.name}</h5>
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
      );
    } else {
      // Last step: Tags
      return (
        <div>
          <h5 className="mb-3">🏷️ Tags et finalisation</h5>
          <Form.Group className="mb-3">
            <Form.Label>Tags patient</Form.Label>
            <PatientTagsManager
              patientId={null}
              initialTags={formData.tags}
              onTagsChange={handleTagsChange}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Ajouter des tags pour catégoriser et filtrer les patients
            </Form.Text>
          </Form.Group>

          <Alert variant="success" className="mt-4">
            <strong>✅ Prêt à créer le patient</strong>
            <p className="mb-0 mt-2">
              Cliquez sur "Créer le patient" pour finaliser la création.
            </p>
          </Alert>
        </div>
      );
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Créer un nouveau patient</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">Étape {currentStep} sur {totalSteps}</small>
            <small className="text-muted">{Math.round(progress)}% complété</small>
          </div>
          <ProgressBar now={progress} className="mb-3" />
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form>
          {renderStepContent()}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        {currentStep > 1 && (
          <Button variant="outline-primary" onClick={handlePrevious} disabled={loading}>
            Précédent
          </Button>
        )}
        {currentStep < totalSteps ? (
          <Button variant="primary" onClick={handleNext} disabled={loading || loadingCustomFields}>
            Suivant
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer le patient'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePatientModal;
