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
      setError('First name, last name, and email are required');
      setActiveTab('personal');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
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
      setError('Failed to create patient: ' + (err.response?.data?.error || err.message));
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
            <Alert.Heading>Access Denied</Alert.Heading>
            <p>You do not have permission to create patients.</p>
            <Button variant="outline-danger" onClick={handleBack}>
              Back to Patients
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
              ← Back to Patients
            </Button>
            <h1 className="mb-0">Create New Patient</h1>
            <p className="text-muted">Enter patient information in the tabs below</p>
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
                <Tab eventKey="personal" title="👤 Personal Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-primary text-white">
                          <h6 className="mb-0">Basic Information</h6>
                        </Card.Header>
                        <Card.Body>
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

                          <Form.Group className="mb-3">
                            <Form.Label>Phone</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Date of Birth</Form.Label>
                            <Form.Control
                              type="date"
                              name="date_of_birth"
                              value={formData.date_of_birth}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

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
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">Address & Contact</h6>
                        </Card.Header>
                        <Card.Body>
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

                          <Form.Group className="mb-3">
                            <Form.Label>City</Form.Label>
                            <Form.Control
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>State</Form.Label>
                            <Form.Control
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>ZIP Code</Form.Label>
                            <Form.Control
                              type="text"
                              name="zip_code"
                              value={formData.zip_code}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <hr />

                          <Form.Group className="mb-3">
                            <Form.Label>Emergency Contact Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="emergency_contact_name"
                              value={formData.emergency_contact_name}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Emergency Contact Phone</Form.Label>
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
                <Tab eventKey="medical" title="🏥 Medical Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-danger text-white">
                          <h6 className="mb-0">Medical Details</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Medical Record Number</Form.Label>
                            <Form.Control
                              type="text"
                              name="medical_record_number"
                              value={formData.medical_record_number}
                              onChange={handleInputChange}
                            />
                          </Form.Group>

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
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-danger text-white">
                          <h6 className="mb-0">Medical History</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Allergies</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
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
                              rows={3}
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
                              rows={3}
                              name="medical_conditions"
                              value={formData.medical_conditions}
                              onChange={handleInputChange}
                              placeholder="List medical conditions..."
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Medical Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="medical_notes"
                              value={formData.medical_notes}
                              onChange={handleInputChange}
                              placeholder="Additional medical notes..."
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Dietary Information Tab */}
                <Tab eventKey="dietary" title="🥗 Dietary Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-success text-white">
                          <h6 className="mb-0">Dietary Preferences</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Dietary Restrictions</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="dietary_restrictions"
                              value={formData.dietary_restrictions}
                              onChange={handleInputChange}
                              placeholder="e.g., vegetarian, gluten-free, dairy-free..."
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Dietary Preferences</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="dietary_preferences"
                              value={formData.dietary_preferences}
                              onChange={handleInputChange}
                              placeholder="General dietary preferences..."
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Food Preferences</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
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
                              rows={3}
                              name="nutritional_goals"
                              value={formData.nutritional_goals}
                              onChange={handleInputChange}
                              placeholder="e.g., weight loss, muscle gain, diabetes management..."
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-success text-white">
                          <h6 className="mb-0">Lifestyle</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Exercise Habits</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="exercise_habits"
                              value={formData.exercise_habits}
                              onChange={handleInputChange}
                              placeholder="Describe exercise routine..."
                            />
                          </Form.Group>

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
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Administrative Tab */}
                <Tab eventKey="admin" title="⚙️ Administrative">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-warning">
                          <h6 className="mb-0">Care Team</h6>
                        </Card.Header>
                        <Card.Body>
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
                            <Form.Check
                              type="checkbox"
                              name="is_active"
                              label="Active Patient"
                              checked={formData.is_active}
                              onChange={handleInputChange}
                            />
                            <Form.Text className="text-muted">
                              Inactive patients won't appear in active patient lists
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-warning">
                          <h6 className="mb-0">Additional Notes</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Administrative Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={5}
                              name="notes"
                              value={formData.notes}
                              onChange={handleInputChange}
                              placeholder="Any additional notes about the patient..."
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
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Creating Patient...' : 'Create Patient'}
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
