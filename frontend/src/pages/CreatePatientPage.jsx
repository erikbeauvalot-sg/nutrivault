/**
 * CreatePatientPage Component
 * Full page for creating new patients with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import userService from '../services/userService';
import api from '../services/api';

const CreatePatientPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dietitians, setDietitians] = useState([]);

  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',

    // Medical Information
    medical_record_number: '',
    insurance_provider: '',
    insurance_policy_number: '',
    primary_care_physician: '',
    allergies: '',
    current_medications: '',
    medical_conditions: '',
    medical_notes: '',
    height_cm: '',
    weight_kg: '',
    blood_type: '',

    // Dietary Information
    dietary_restrictions: '',
    dietary_preferences: '',
    food_preferences: '',
    nutritional_goals: '',
    exercise_habits: '',
    smoking_status: '',
    alcohol_consumption: '',

    // Administrative
    assigned_dietitian_id: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    fetchDietitians();
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };

  const handleBack = () => {
    navigate('/patients');
  };

  const validateForm = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setError(t('patients.requiredFields'));
      setActiveTab('personal');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError(t('patients.validEmail'));
      setActiveTab('personal');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Convert empty strings to null for optional fields
      const submitData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      const response = await api.post('/api/patients', submitData);
      const newPatient = response.data.data || response.data;

      // Navigate to the newly created patient's detail page
      navigate(`/patients/${newPatient.id}`);
    } catch (err) {
      setError(t('patients.failedToCreate') + ': ' + (err.response?.data?.error || err.message));
      console.error('Error creating patient:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  const canCreatePatient = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (!canCreatePatient) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>{t('patients.accessDenied')}</Alert.Heading>
            <p>{t('patients.noPermissionCreate')}</p>
            <Button variant="outline-danger" onClick={handleBack}>
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
              ← {t('patients.backToPatients')}
            </Button>
            <h1 className="mb-0">{t('patients.createNewPatient')}</h1>
            <p className="text-muted">{t('patients.enterPatientInfo')}</p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form Tabs */}
        <Form onSubmit={handleSubmit}>
          <Card>
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                {/* Personal Information Tab */}
                <Tab eventKey="personal" title={`👤 ${t('patients.personalInformationTab')}`}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-primary text-white">
                          <h6 className="mb-0">{t('patients.basicInformation')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.firstName')} *</Form.Label>
                            <Form.Control
                              type="text"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.lastName')} *</Form.Label>
                            <Form.Control
                              type="text"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.email')} *</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.phone')}</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.dateOfBirth')}</Form.Label>
                            <Form.Control
                              type="date"
                              name="date_of_birth"
                              value={formData.date_of_birth}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.gender')}</Form.Label>
                            <Form.Select
                              name="gender"
                              value={formData.gender}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectGender')}</option>
                              <option value="Male">{t('patients.male')}</option>
                              <option value="Female">{t('patients.female')}</option>
                              <option value="Other">{t('patients.other')}</option>
                              <option value="Prefer not to say">{t('patients.preferNotToSay')}</option>
                            </Form.Select>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">{t('patients.addressContact')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.address')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              placeholder={t('patients.streetAddressPlaceholder')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.city')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.state')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.zipCode')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="zip_code"
                              value={formData.zip_code}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <hr />

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.emergencyContactName')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="emergency_contact_name"
                              value={formData.emergency_contact_name}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.emergencyContactPhone')}</Form.Label>
                            <Form.Control
                              type="tel"
                              name="emergency_contact_phone"
                              value={formData.emergency_contact_phone}
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Medical Information Tab */}
                <Tab eventKey="medical" title={`🏥 ${t('patients.medicalInformationTab')}`}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-danger text-white">
                          <h6 className="mb-0">{t('patients.medicalDetails')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.medicalRecordNumber')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="medical_record_number"
                              value={formData.medical_record_number}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.bloodType')}</Form.Label>
                            <Form.Select
                              name="blood_type"
                              value={formData.blood_type}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectBloodType')}</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.heightCm')}</Form.Label>
                            <Form.Control
                              type="number"
                              name="height_cm"
                              value={formData.height_cm}
                              onChange={handleInputChange}
                              min="0"
                              step="0.1"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.weightKg')}</Form.Label>
                            <Form.Control
                              type="number"
                              name="weight_kg"
                              value={formData.weight_kg}
                              onChange={handleInputChange}
                              min="0"
                              step="0.1"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.insuranceProvider')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="insurance_provider"
                              value={formData.insurance_provider}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.insurancePolicyNumber')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="insurance_policy_number"
                              value={formData.insurance_policy_number}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.primaryCarePhysician')}</Form.Label>
                            <Form.Control
                              type="text"
                              name="primary_care_physician"
                              value={formData.primary_care_physician}
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-danger text-white">
                          <h6 className="mb-0">{t('patients.medicalHistory')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.allergies')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="allergies"
                              value={formData.allergies}
                              onChange={handleInputChange}
                              placeholder={t('patients.listAllergies')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.currentMedications')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="current_medications"
                              value={formData.current_medications}
                              onChange={handleInputChange}
                              placeholder={t('patients.listMedications')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.medicalConditions')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="medical_conditions"
                              value={formData.medical_conditions}
                              onChange={handleInputChange}
                              placeholder={t('patients.listConditions')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.medicalNotes')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="medical_notes"
                              value={formData.medical_notes}
                              onChange={handleInputChange}
                              placeholder={t('patients.additionalMedicalNotesPlaceholder')}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Dietary Information Tab */}
                <Tab eventKey="dietary" title={`🥗 ${t('patients.dietaryInformationTab')}`}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-success text-white">
                          <h6 className="mb-0">{t('patients.dietaryPreferences')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.dietaryRestrictions')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="dietary_restrictions"
                              value={formData.dietary_restrictions}
                              onChange={handleInputChange}
                              placeholder={t('patients.dietaryRestrictionsPlaceholder')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.dietaryPreferences')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="dietary_preferences"
                              value={formData.dietary_preferences}
                              onChange={handleInputChange}
                              placeholder={t('patients.generalDietaryPreferences')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.foodPreferences')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="food_preferences"
                              value={formData.food_preferences}
                              onChange={handleInputChange}
                              placeholder={t('patients.foodPreferencesPlaceholder')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.nutritionalGoals')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="nutritional_goals"
                              value={formData.nutritional_goals}
                              onChange={handleInputChange}
                              placeholder={t('patients.nutritionalGoalsPlaceholder')}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-success text-white">
                          <h6 className="mb-0">{t('patients.lifestyle')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.exerciseHabits')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="exercise_habits"
                              value={formData.exercise_habits}
                              onChange={handleInputChange}
                              placeholder={t('patients.exerciseHabitsPlaceholder')}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.smokingStatus')}</Form.Label>
                            <Form.Select
                              name="smoking_status"
                              value={formData.smoking_status}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectStatus')}</option>
                              <option value="Never">{t('patients.never')}</option>
                              <option value="Former">{t('patients.former')}</option>
                              <option value="Current">{t('patients.current')}</option>
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.alcoholConsumption')}</Form.Label>
                            <Form.Select
                              name="alcohol_consumption"
                              value={formData.alcohol_consumption}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectFrequency')}</option>
                              <option value="None">{t('patients.none')}</option>
                              <option value="Occasional">{t('patients.occasional')}</option>
                              <option value="Moderate">{t('patients.moderate')}</option>
                              <option value="Heavy">{t('patients.heavy')}</option>
                            </Form.Select>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Administrative Tab */}
                <Tab eventKey="admin" title={`⚙️ ${t('patients.administrativeTab')}`}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-warning">
                          <h6 className="mb-0">{t('patients.careTeam')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.assignedDietitian')}</Form.Label>
                            <Form.Select
                              name="assigned_dietitian_id"
                              value={formData.assigned_dietitian_id}
                              onChange={handleInputChange}
                            >
                              <option value="">{t('patients.selectDietitianOptional')}</option>
                              {dietitians.map(dietitian => (
                                <option key={dietitian.id} value={dietitian.id}>
                                  {dietitian.first_name} {dietitian.last_name}
                                  {dietitian.email && ` (${dietitian.email})`}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                              {t('patients.assignLaterHelp')}
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              name="is_active"
                              label={t('patients.activePatient')}
                              checked={formData.is_active}
                              onChange={handleInputChange}
                            />
                            <Form.Text className="text-muted">
                              {t('patients.inactivePatientsNote')}
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-warning">
                          <h6 className="mb-0">{t('patients.additionalNotes')}</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('patients.administrativeNotes')}</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={5}
                              name="notes"
                              value={formData.notes}
                              onChange={handleInputChange}
                              placeholder={t('patients.additionalNotesPlaceholder')}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={handleBack} disabled={loading}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? t('patients.creating') : t('patients.createPatient')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default CreatePatientPage;
