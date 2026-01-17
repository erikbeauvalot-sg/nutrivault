/**
 * CreateVisitPage Component
 * Full page for creating new visits with organized form sections
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import userService from '../services/userService';

const CreateVisitPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [completeImmediately, setCompleteImmediately] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    dietitian_id: '',
    visit_date: '',
    visit_type: '',
    duration_minutes: '',
    status: 'SCHEDULED',
    chief_complaint: '',
    assessment: '',
    recommendations: '',
    notes: '',
    next_visit_date: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchDietitians();

    // Handle pre-selected patient from navigation
    if (location.state?.selectedPatient) {
      const patient = location.state.selectedPatient;
      setFormData(prev => ({
        ...prev,
        patient_id: patient.id,
        dietitian_id: patient.assigned_dietitian?.id || ''
      }));
    }
  }, [location.state]);

  // Set default duration when visit type changes
  useEffect(() => {
    if (formData.visit_type) {
      const durationMap = {
        'Initial Consultation': 60,
        'Follow-up': 30,
        'Final Assessment': 30,
        'Nutrition Counseling': 45,
        'Other': 60
      };
      const defaultDuration = durationMap[formData.visit_type];
      if (defaultDuration && !formData.duration_minutes) {
        setFormData(prev => ({ ...prev, duration_minutes: defaultDuration }));
      }
    }
  }, [formData.visit_type]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients({ limit: 1000 });
      const data = response.data?.data || response.data || response;
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchDietitians = async () => {
    try {
      const response = await userService.getDietitians();
      const data = response.data?.data || response.data || [];
      setDietitians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching dietitians:', err);
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
    navigate('/visits');
  };

  const setToNow = () => {
    const now = new Date();
    const formattedNow = now.toISOString().slice(0, 16);
    setFormData(prev => ({ ...prev, visit_date: formattedNow }));
  };

  const validateForm = () => {
    if (!formData.patient_id || !formData.dietitian_id || !formData.visit_date) {
      setError('Patient, dietitian, and visit date are required');
      setActiveTab('visit');
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
      const submitData = {
        ...formData,
        visit_date: new Date(formData.visit_date).toISOString(),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? new Date(formData.next_visit_date).toISOString()
          : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        status: completeImmediately ? 'COMPLETED' : formData.status
      };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') submitData[key] = null;
      });

      const response = await visitService.createVisit(submitData);
      const savedVisit = response.data;

      // If completed immediately, navigate to billing page
      if (completeImmediately && savedVisit) {
        if (savedVisit.created_invoice) {
          navigate(`/billing/${savedVisit.created_invoice.id}`);
        } else {
          navigate('/billing', { state: { refreshFromVisit: true, visitId: savedVisit.id } });
        }
      } else {
        navigate('/visits');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || 'Failed to create visit';
      setError(errorMsg);
      console.error('Error creating visit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  const canCreateVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN' || user?.role === 'ASSISTANT';

  if (!canCreateVisit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>Access Denied</Alert.Heading>
            <p>You do not have permission to create visits.</p>
            <Button variant="outline-danger" onClick={handleBack}>
              Back to Visits
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
              ← Back to Visits
            </Button>
            <h1 className="mb-0">Schedule New Visit</h1>
            <p className="text-muted">Enter visit details in the tabs below</p>
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
                {/* Visit Information Tab */}
                <Tab eventKey="visit" title="📅 Visit Information">
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-primary text-white">
                          <h6 className="mb-0">Basic Details</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Patient *</Form.Label>
                            <Form.Select
                              name="patient_id"
                              value={formData.patient_id}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Select a patient</option>
                              {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.first_name} {patient.last_name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Dietitian *</Form.Label>
                            <Form.Select
                              name="dietitian_id"
                              value={formData.dietitian_id}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Select a dietitian</option>
                              {dietitians.map(dietitian => {
                                const displayName = dietitian.first_name || dietitian.last_name
                                  ? `${dietitian.first_name || ''} ${dietitian.last_name || ''}`.trim()
                                  : dietitian.username;
                                return (
                                  <option key={dietitian.id} value={dietitian.id}>
                                    {displayName}
                                  </option>
                                );
                              })}
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Visit Date & Time *</Form.Label>
                            <div className="d-flex gap-2">
                              <Form.Control
                                type="datetime-local"
                                name="visit_date"
                                value={formData.visit_date}
                                onChange={handleInputChange}
                                required
                                className="flex-grow-1"
                              />
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={setToNow}
                                title="Set to current time"
                              >
                                🕐 Now
                              </Button>
                            </div>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Visit Type</Form.Label>
                            <Form.Select
                              name="visit_type"
                              value={formData.visit_type}
                              onChange={handleInputChange}
                            >
                              <option value="">Select type</option>
                              <option value="Initial Consultation">Initial Consultation</option>
                              <option value="Follow-up">Follow-up</option>
                              <option value="Final Assessment">Final Assessment</option>
                              <option value="Nutrition Counseling">Nutrition Counseling</option>
                              <option value="Other">Other</option>
                            </Form.Select>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Duration (minutes)</Form.Label>
                            <Form.Control
                              type="number"
                              name="duration_minutes"
                              value={formData.duration_minutes}
                              onChange={handleInputChange}
                              placeholder="e.g., 60"
                              min="1"
                              max="480"
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header className="bg-info text-white">
                          <h6 className="mb-0">Options</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Check
                              type="checkbox"
                              name="completeImmediately"
                              label="Complete visit immediately and create billing"
                              checked={completeImmediately}
                              onChange={(e) => setCompleteImmediately(e.target.checked)}
                            />
                            <Form.Text className="text-muted">
                              Check this to mark the visit as completed and automatically generate a billing invoice
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Next Visit Date</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              name="next_visit_date"
                              value={formData.next_visit_date}
                              onChange={handleInputChange}
                            />
                            <Form.Text className="text-muted">
                              Schedule a follow-up appointment
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>

                {/* Clinical Information Tab */}
                <Tab eventKey="clinical" title="🏥 Clinical Information">
                  <Row>
                    <Col md={12}>
                      <Card className="mb-3">
                        <Card.Header className="bg-success text-white">
                          <h6 className="mb-0">Clinical Details</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Chief Complaint</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="chief_complaint"
                              value={formData.chief_complaint}
                              onChange={handleInputChange}
                              placeholder="Patient's main concerns or symptoms"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Assessment</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              name="assessment"
                              value={formData.assessment}
                              onChange={handleInputChange}
                              placeholder="Clinical assessment and findings"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Recommendations</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              name="recommendations"
                              value={formData.recommendations}
                              onChange={handleInputChange}
                              placeholder="Treatment plan and dietary recommendations"
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Additional Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="notes"
                              value={formData.notes}
                              onChange={handleInputChange}
                              placeholder="Any additional notes about this visit"
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
                  {loading ? 'Creating Visit...' : 'Create Visit'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default CreateVisitPage;
