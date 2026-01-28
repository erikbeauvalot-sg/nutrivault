/**
 * EditPatientPage Component
 * Full page for editing existing patients with custom fields organized by categories
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import ResponsiveTabs, { Tab } from '../components/ResponsiveTabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import userService from '../services/userService';
import customFieldService from '../services/customFieldService';
import CustomFieldInput from '../components/CustomFieldInput';
import PatientMeasuresTable from '../components/PatientMeasuresTable';
import api from '../services/api';

const EditPatientPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('basic-info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exitAfterSave, setExitAfterSave] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dietitians, setDietitians] = useState([]);
  const [patient, setPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom fields state
  const [customFieldCategories, setCustomFieldCategories] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  // Measures refresh trigger
  const [measuresRefreshTrigger, setMeasuresRefreshTrigger] = useState(0);

  // Basic patient info
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    assigned_dietitian_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchPatientData();
    fetchDietitians();
    fetchCustomFields();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/patients/${id}`);
      const patientData = response.data.data || response.data;
      setPatient(patientData);

      // Set basic info
      setFormData({
        first_name: patientData.first_name || '',
        last_name: patientData.last_name || '',
        email: patientData.email || '',
        phone: patientData.phone || '',
        assigned_dietitian_id: patientData.assigned_dietitian_id || '',
        is_active: patientData.is_active !== undefined ? patientData.is_active : true
      });

      setError(null);
    } catch (err) {
      setError(t('patients.failedToUpdate') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      setLoadingCustomFields(true);
      const data = await customFieldService.getPatientCustomFields(id);
      setCustomFieldCategories(data || []);

      // Extract field values from the categories
      const valuesMap = {};
      (data || []).forEach(category => {
        category.fields?.forEach(field => {
          if (field.value !== null && field.value !== undefined) {
            valuesMap[field.definition_id] = field.value;
          }
        });
      });
      setFieldValues(valuesMap);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError('Erreur lors du chargement des champs personnalisés');
    } finally {
      setLoadingCustomFields(false);
    }
  };

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
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

  const handleBack = () => {
    navigate(`/patients/${id}`);
  };

  // Search across custom fields
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { hasResults: false, matchingFields: [], matchingCategory: null };
    }

    const query = searchQuery.toLowerCase();
    const matchingFields = [];
    let matchingCategory = null;

    customFieldCategories.forEach(category => {
      category.fields.forEach(field => {
        const fieldLabel = field.field_label?.toLowerCase() || '';
        const fieldValue = fieldValues[field.definition_id]?.toString()?.toLowerCase() || '';
        const categoryName = category.name?.toLowerCase() || '';

        if (fieldLabel.includes(query) || fieldValue.includes(query) || categoryName.includes(query)) {
          matchingFields.push({
            ...field,
            categoryId: category.id,
            categoryName: category.name
          });
          if (!matchingCategory) {
            matchingCategory = category.id;
          }
        }
      });
    });

    return {
      hasResults: matchingFields.length > 0,
      matchingFields,
      matchingCategory
    };
  }, [searchQuery, customFieldCategories, fieldValues]);

  // Auto-switch to tab with search results
  useEffect(() => {
    if (searchResults.hasResults && searchResults.matchingCategory) {
      setActiveTab(`category-${searchResults.matchingCategory}`);
    }
  }, [searchResults]);

  const validateBasicForm = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('Le prénom et le nom sont requis');
      setActiveTab('basic-info');
      return false;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Format email invalide');
      setActiveTab('basic-info');
      return false;
    }
    return true;
  };

  const validateCustomFields = () => {
    const errors = {};
    let hasErrors = false;
    let firstErrorTab = null;

    customFieldCategories.forEach((category, index) => {
      category.fields.forEach(field => {
        const value = fieldValues[field.definition_id];

        // Check required fields
        if (field.is_required && (value === null || value === undefined || value === '')) {
          errors[field.definition_id] = 'Ce champ est requis';
          hasErrors = true;
          if (!firstErrorTab) {
            firstErrorTab = `category-${category.id}`;
          }
        }
      });
    });

    setFieldErrors(errors);
    if (hasErrors && firstErrorTab) {
      setActiveTab(firstErrorTab);
      setError('Veuillez corriger les erreurs dans les champs');
    }
    return !hasErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateBasicForm()) return;
    if (!validateCustomFields()) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update basic patient info - only send non-empty values
      const basicData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        is_active: formData.is_active
      };

      // Only include optional fields if they have values
      if (formData.email && formData.email.trim()) {
        basicData.email = formData.email.trim();
      }
      if (formData.phone && formData.phone.trim()) {
        basicData.phone = formData.phone.trim();
      }
      if (formData.assigned_dietitian_id && formData.assigned_dietitian_id.trim()) {
        basicData.assigned_dietitian_id = formData.assigned_dietitian_id.trim();
      }

      await api.put(`/api/patients/${id}`, basicData);

      // Update custom fields - only include fields with non-empty values
      const customFieldsData = Object.keys(fieldValues)
        .filter(fieldDefinitionId => {
          const value = fieldValues[fieldDefinitionId];
          return value !== null && value !== undefined && value !== '';
        })
        .map(fieldDefinitionId => ({
          definition_id: fieldDefinitionId,
          value: fieldValues[fieldDefinitionId]
        }));
      if (customFieldsData.length > 0) {
        await customFieldService.updatePatientCustomFields(id, customFieldsData);
      }

      // Navigate based on which button was clicked
      if (exitAfterSave) {
        navigate('/patients');
      } else {
        // Stay on the page - show success message and refresh data
        setSuccessMessage(t('patients.patientUpdated', 'Patient mis à jour avec succès'));
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(t('patients.failedToUpdate') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error updating patient:', err);
    } finally {
      setSaving(false);
    }
  };

  // Check permissions
  const canEditPatient = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">{t('patients.loadingPatientData')}</div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (!canEditPatient) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.accessDenied')}</Alert.Heading>
            <p>{t('patients.noPermissionEdit')}</p>
            <Button variant="outline-danger" onClick={handleBack}>
              {t('patients.viewPatient')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (error && !patient) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.error')}</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={() => navigate('/patients')}>
              {t('patients.backToPatients')}
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid>
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <Button variant="outline-secondary" onClick={handleBack} className="mb-3">
              ← {t('patients.viewPatient')}
            </Button>
            <h1 className="mb-0 h3 h2-md">
              {t('patients.editPatient', 'Modifier le patient')}: {patient?.first_name} {patient?.last_name}
            </h1>
            <p className="text-muted">{t('patients.updateInfo', 'Mettre à jour les informations du patient')}</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Form Tabs */}
        <Form onSubmit={handleSubmit}>
          <Card>
            <Card.Body>
              {/* Search Bar for Custom Fields */}
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <InputGroup>
                    <InputGroup.Text>🔍</InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder={t('common.search', 'Rechercher...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => setSearchQuery('')}
                        title={t('common.clearSearch', 'Effacer la recherche')}
                      >
                        ✕
                      </Button>
                    )}
                  </InputGroup>
                  {searchQuery && (
                    <Form.Text className="text-muted">
                      {searchResults.hasResults ? (
                        <>
                          {searchResults.matchingFields.length} {t('common.fieldsFound', 'champ(s) trouvé(s)')}
                          {searchResults.matchingCategory && ` - ${t('common.switchedToTab', 'basculé vers l\'onglet correspondant')}`}
                        </>
                      ) : (
                        t('common.noFieldsMatch', 'Aucun champ ne correspond à votre recherche')
                      )}
                    </Form.Text>
                  )}
                </Col>
              </Row>

              <ResponsiveTabs activeKey={activeTab} onSelect={setActiveTab} id="edit-patient-tabs">
                {/* 1. Aperçu Tab */}
                <Tab eventKey="basic-info" title={`📋 ${t('patients.basicInformation', 'Aperçu')}`}>
                  <Row>
                    <Col xs={12} md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-primary text-white">
                          <h6 className="mb-0">{t('patients.personalInfo', 'Informations personnelles')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.firstName', 'Prénom')} *</Form.Label>
                            <Form.Control
                              type="text"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.lastName', 'Nom')} *</Form.Label>
                            <Form.Control
                              type="text"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.email', 'Email')}</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.phone', 'Téléphone')}</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12} md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">{t('patients.administrativeTab', 'Administration')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.assignedDietitian', 'Diététicien assigné')}</Form.Label>
                            <Form.Select
                              name="assigned_dietitian_id"
                              value={formData.assigned_dietitian_id}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectDietitianOptional', 'Sélectionner un diététicien (optionnel)')}</option>
                              {dietitians.map(dietitian => (
                                <option key={dietitian.id} value={dietitian.id}>
                                  {dietitian.first_name} {dietitian.last_name}
                                  {dietitian.email && ` (${dietitian.email})`}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                              {t('patients.assignLaterHelp', 'Laisser vide pour assigner plus tard')}
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              name="is_active"
                              label={t('patients.activePatient', 'Patient actif')}
                              checked={formData.is_active}
                              onChange={handleInputChange}
                            />
                            <Form.Text className="text-muted">
                              {t('patients.inactivePatientsNote', 'Les patients inactifs n\'apparaissent pas dans les listes par défaut')}
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {/* Custom Fields marked as "show_in_basic_info", grouped by category */}
                  <Row>
                    {customFieldCategories
                      .filter(category => category.fields.some(field => field.show_in_basic_info))
                      .map((category) => {
                        const basicInfoFields = category.fields.filter(field => field.show_in_basic_info);
                        if (basicInfoFields.length === 0) return null;

                        return (
                          <Col md={12} key={category.id}>
                            <Card className="mb-3">
                              <Card.Header
                                style={{
                                  backgroundColor: category.color || '#3498db',
                                  color: '#fff',
                                  borderLeft: `4px solid ${category.color || '#3498db'}`
                                }}
                              >
                                <h6 className="mb-0">
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '10px',
                                      height: '10px',
                                      backgroundColor: '#fff',
                                      borderRadius: '50%',
                                      marginRight: '8px',
                                      opacity: 0.8
                                    }}
                                  />
                                  {category.name}
                                </h6>
                              </Card.Header>
                              <Card.Body>
                                <Row>
                                  {basicInfoFields.map((field) => (
                                    <Col xs={12} md={6} key={field.definition_id}>
                                      <Form.Group className="mb-3">
                                        <CustomFieldInput
                                          fieldDefinition={field}
                                          value={fieldValues[field.definition_id] || ''}
                                          onChange={handleFieldChange}
                                          disabled={saving}
                                          error={fieldErrors[field.definition_id]}
                                        />
                                        {fieldErrors[field.definition_id] && (
                                          <Form.Text className="text-danger">
                                            {fieldErrors[field.definition_id]}
                                          </Form.Text>
                                        )}
                                      </Form.Group>
                                    </Col>
                                  ))}
                                </Row>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                  </Row>
                </Tab>

                {/* 2. Custom Field Categories Tabs */}
                {loadingCustomFields ? (
                  <Tab eventKey="loading" title="⏳ Chargement..." disabled>
                    <div className="text-center py-5">
                      <Spinner animation="border" />
                      <p className="mt-3">Chargement des champs personnalisés...</p>
                    </div>
                  </Tab>
                ) : (
                  customFieldCategories.map((category) => (
                    <Tab
                      key={category.id}
                      eventKey={`category-${category.id}`}
                      title={
                        <span>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              backgroundColor: category.color || '#3498db',
                              borderRadius: '50%',
                              marginRight: '8px',
                              verticalAlign: 'middle',
                              border: '2px solid rgba(255,255,255,0.5)'
                            }}
                          />
                          {category.name}
                        </span>
                      }
                    >
                      <div
                        className="mb-4"
                        style={{
                          borderLeft: `4px solid ${category.color || '#3498db'}`,
                          paddingLeft: '15px'
                        }}
                      >
                        {category.description && (
                          <Alert
                            variant="info"
                            className="mb-3"
                            style={{
                              borderLeft: `4px solid ${category.color || '#3498db'}`,
                              backgroundColor: `${category.color || '#3498db'}10`
                            }}
                          >
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
                              <Col xs={12} md={6} key={field.definition_id}>
                                <Form.Group className="mb-3">
                                  <CustomFieldInput
                                    fieldDefinition={field}
                                    value={fieldValues[field.definition_id] || ''}
                                    onChange={handleFieldChange}
                                    disabled={saving}
                                    error={fieldErrors[field.definition_id]}
                                  />
                                  {fieldErrors[field.definition_id] && (
                                    <Form.Text className="text-danger">
                                      {fieldErrors[field.definition_id]}
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

                {/* 3. Measures Tab */}
                <Tab eventKey="measures" title={`📏 ${t('measures.healthMeasures', 'Mesures')}`}>
                  <h5 className="mb-3">{t('measures.patientMeasures', 'Patient Measures')}</h5>

                  {/* Measures Table */}
                  <PatientMeasuresTable
                    patientId={id}
                    refreshTrigger={measuresRefreshTrigger}
                  />
                </Tab>
              </ResponsiveTabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
                <Button variant="outline-secondary" onClick={handleBack} disabled={saving}>
                  {t('common.cancel', 'Annuler')}
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="outline-primary"
                    type="submit"
                    disabled={saving || loadingCustomFields}
                    onClick={() => setExitAfterSave(true)}
                  >
                    {saving && exitAfterSave ? t('common.saving', 'Enregistrement...') : t('patients.saveAndExit', 'Enregistrer et sortir')}
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving || loadingCustomFields}
                    onClick={() => setExitAfterSave(false)}
                  >
                    {saving && !exitAfterSave ? t('common.saving', 'Enregistrement...') : t('common.save', 'Enregistrer')}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default EditPatientPage;
