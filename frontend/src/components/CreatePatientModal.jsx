/**
 * CreatePatientModal Component
 * Multi-step modal form for creating new patients
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, ProgressBar, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import PatientTagsManager from './PatientTagsManager';

const CreatePatientModal = ({ show, onHide, onSubmit }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
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
      // Don't show error to user, just leave dropdown empty
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
    notes: '',

    // Tags
    tags: []
  });

  const totalSteps = 4;

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

  const validateStep = (step) => {
    switch (step) {
      case 1: // Personal Information
        if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
          setError('First name, last name, and email are required');
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
      case 2: // Medical Information
        // Medical record number is now optional
        break;
      case 3: // Dietary Information
        // Optional step, no validation required
        break;
      case 4: // Administrative
        // Optional step, no validation required
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

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

      const success = await onSubmit(submitData);
      if (success) {
        handleClose();
      }
    } catch (err) {
      setError(t('errors.failedToCreatePatient', { error: err.message || t('common.unknownError') }));
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h5 className="mb-3">Personal Information</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
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
                  <Form.Label>Last Name *</Form.Label>
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
                  <Form.Label>Email *</Form.Label>
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
                  <Form.Label>Phone</Form.Label>
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
                  <Form.Label>Date of Birth</Form.Label>
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
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>City</Form.Label>
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
                  <Form.Label>State</Form.Label>
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
                  <Form.Label>ZIP Code</Form.Label>
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
                  <Form.Label>Emergency Contact Name</Form.Label>
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
                  <Form.Label>Emergency Contact Phone</Form.Label>
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
        );

      case 2:
        return (
          <div>
            <h5 className="mb-3">Medical Information</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Medical Record Number *</Form.Label>
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
                  <Form.Label>Blood Type</Form.Label>
                  <Form.Select
                    name="blood_type"
                    value={formData.blood_type}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Blood Type</option>
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
                  <Form.Label>Height (cm)</Form.Label>
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
                  <Form.Label>Weight (kg)</Form.Label>
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
              <Form.Label>Insurance Provider</Form.Label>
              <Form.Control
                type="text"
                name="insurance_provider"
                value={formData.insurance_provider}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Insurance Policy Number</Form.Label>
              <Form.Control
                type="text"
                name="insurance_policy_number"
                value={formData.insurance_policy_number}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Primary Care Physician</Form.Label>
              <Form.Control
                type="text"
                name="primary_care_physician"
                value={formData.primary_care_physician}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Allergies</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                placeholder="List any allergies..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Current Medications</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="current_medications"
                value={formData.current_medications}
                onChange={handleInputChange}
                placeholder="List current medications..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Medical Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleInputChange}
                placeholder="List medical conditions..."
              />
            </Form.Group>
          </div>
        );

      case 3:
        return (
          <div>
            <h5 className="mb-3">Dietary Information</h5>
            <Form.Group className="mb-3">
              <Form.Label>Dietary Restrictions</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="dietary_restrictions"
                value={formData.dietary_restrictions}
                onChange={handleInputChange}
                placeholder="e.g., vegetarian, gluten-free, dairy-free..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Food Preferences</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="food_preferences"
                value={formData.food_preferences}
                onChange={handleInputChange}
                placeholder="e.g., likes spicy food, prefers organic..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nutritional Goals</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="nutritional_goals"
                value={formData.nutritional_goals}
                onChange={handleInputChange}
                placeholder="e.g., weight loss, muscle gain, diabetes management..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Exercise Habits</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="exercise_habits"
                value={formData.exercise_habits}
                onChange={handleInputChange}
                placeholder="Describe exercise routine..."
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Smoking Status</Form.Label>
                  <Form.Select
                    name="smoking_status"
                    value={formData.smoking_status}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Status</option>
                    <option value="Never">Never</option>
                    <option value="Former">Former</option>
                    <option value="Current">Current</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Alcohol Consumption</Form.Label>
                  <Form.Select
                    name="alcohol_consumption"
                    value={formData.alcohol_consumption}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Frequency</option>
                    <option value="None">None</option>
                    <option value="Occasional">Occasional</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Heavy">Heavy</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>
        );

      case 4:
        return (
          <div>
            <h5 className="mb-3">Administrative Information</h5>
            <Form.Group className="mb-3">
              <Form.Label>Assigned Dietitian</Form.Label>
              <Form.Select
                name="assigned_dietitian_id"
                value={formData.assigned_dietitian_id}
                onChange={handleInputChange}
              >
                <option value="">Select a dietitian (optional)</option>
                {dietitians.map(dietitian => (
                  <option key={dietitian.id} value={dietitian.id}>
                    {dietitian.first_name} {dietitian.last_name}
                    {dietitian.email && ` (${dietitian.email})`}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Leave empty to assign later or for automatic assignment
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes about the patient..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Patient Tags</Form.Label>
              <PatientTagsManager
                patientId={null} // null for new patient
                initialTags={formData.tags}
                onTagsChange={handleTagsChange}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Add tags to categorize and filter patients (e.g., diabetic, vegetarian, senior)
              </Form.Text>
            </Form.Group>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Patient</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">Step {currentStep} of {totalSteps}</small>
            <small className="text-muted">{Math.round(progress)}% Complete</small>
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
          Cancel
        </Button>
        {currentStep > 1 && (
          <Button variant="outline-primary" onClick={handlePrevious} disabled={loading}>
            Previous
          </Button>
        )}
        {currentStep < totalSteps ? (
          <Button variant="primary" onClick={handleNext} disabled={loading}>
            Next
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Patient'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CreatePatientModal;