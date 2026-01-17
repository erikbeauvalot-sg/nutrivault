/**
 * EditPatientModal Component
 * Modal form for editing existing patients with pre-populated data
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';

const EditPatientModal = ({ show, onHide, onSubmit, patient }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dietitians, setDietitians] = useState([]);

  useEffect(() => {
    if (show) {
      fetchDietitians();
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
    height_cm: '',
    weight_kg: '',
    blood_type: '',

    // Dietary Information
    dietary_restrictions: '',
    food_preferences: '',
    nutritional_goals: '',
    exercise_habits: '',
    smoking_status: '',
    alcohol_consumption: '',

    // Administrative
    assigned_dietitian_id: '',
    notes: ''
  });

  useEffect(() => {
    if (patient && show) {
      // Pre-populate form with patient data
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
        gender: patient.gender || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip_code: patient.zip_code || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',

        medical_record_number: patient.medical_record_number || '',
        insurance_provider: patient.insurance_provider || '',
        insurance_policy_number: patient.insurance_policy_number || '',
        primary_care_physician: patient.primary_care_physician || '',
        allergies: patient.allergies || '',
        current_medications: patient.current_medications || '',
        medical_conditions: patient.medical_conditions || '',
        height_cm: patient.height_cm || '',
        weight_kg: patient.weight_kg || '',
        blood_type: patient.blood_type || '',

        dietary_restrictions: patient.dietary_restrictions || '',
        food_preferences: patient.food_preferences || '',
        nutritional_goals: patient.nutritional_goals || '',
        exercise_habits: patient.exercise_habits || '',
        smoking_status: patient.smoking_status || '',
        alcohol_consumption: patient.alcohol_consumption || '',

        assigned_dietitian_id: patient.assigned_dietitian_id || '',
        notes: patient.notes || ''
      });
      setError(null);
    }
  }, [patient, show]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setError(t('patients.requiredFields'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError(t('patients.validEmail'));
      return false;
    }
    // Medical record number is now optional
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

      const success = await onSubmit(patient.id, submitData);
      if (success) {
        handleClose();
      }
    } catch (err) {
      setError(t('patients.failedToUpdate') + ': ' + (err.message || t('errors.generic')));
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
      date_of_birth: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_record_number: '',
      insurance_provider: '',
      insurance_policy_number: '',
      primary_care_physician: '',
      allergies: '',
      current_medications: '',
      medical_conditions: '',
      height_cm: '',
      weight_kg: '',
      blood_type: '',
      dietary_restrictions: '',
      food_preferences: '',
      nutritional_goals: '',
      exercise_habits: '',
      smoking_status: '',
      alcohol_consumption: '',
      assigned_dietitian_id: '',
      notes: ''
    });
    setError(null);
    onHide();
  };

  if (!patient) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
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
          {/* Personal Information Section */}
          <div className="mb-4">
            <h5 className="mb-3">{t('patients.personalInfo')}</h5>
            <Row>
              <Col md={6}>
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
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
            <Row>
              <Col md={6}>
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
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.phone')}</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.dateOfBirth')}</Form.Label>
                  <Form.Control
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>{t('patients.streetAddress')}</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('patients.streetAddressPlaceholder')}
              />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.city')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.state')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.zipCode')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.emergencyContactName')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.emergencyContactPhone')}</Form.Label>
                  <Form.Control
                    type="tel"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Medical Information Section */}
          <div className="mb-4">
            <h5 className="mb-3">{t('patients.medicalInfo')}</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('patients.medicalRecordNumber')} *</Form.Label>
                  <Form.Control
                    type="text"
                    name="medical_record_number"
                    value={formData.medical_record_number}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
            <Row>
              <Col md={6}>
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
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
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
            <Form.Group className="mb-3">
              <Form.Label>{t('patients.allergies')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
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
                rows={2}
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
                rows={2}
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleInputChange}
                placeholder={t('patients.listConditions')}
              />
            </Form.Group>
          </div>

          {/* Dietary Information Section */}
          <div className="mb-4">
            <h5 className="mb-3">{t('patients.dietaryInfo')}</h5>
            <Form.Group className="mb-3">
              <Form.Label>{t('patients.dietaryRestrictions')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="dietary_restrictions"
                value={formData.dietary_restrictions}
                onChange={handleInputChange}
                placeholder={t('patients.dietaryRestrictionsPlaceholder')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('patients.foodPreferences')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
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
                rows={2}
                name="nutritional_goals"
                value={formData.nutritional_goals}
                onChange={handleInputChange}
                placeholder={t('patients.nutritionalGoalsPlaceholder')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('patients.exerciseHabits')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="exercise_habits"
                value={formData.exercise_habits}
                onChange={handleInputChange}
                placeholder={t('patients.exerciseHabitsPlaceholder')}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
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
              </Col>
              <Col md={6}>
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
              </Col>
            </Row>
          </div>

          {/* Administrative Information Section */}
          <div className="mb-4">
            <h5 className="mb-3">{t('patients.administrativeInfo')}</h5>
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
              <Form.Label>{t('patients.additionalNotes')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder={t('patients.additionalNotesPlaceholder')}
              />
            </Form.Group>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? t('patients.updating') : t('patients.updatePatient')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditPatientModal;