/**
 * EditVisitPage Component
 * Full page for editing existing visits with measurements
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Tab, Tabs, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import visitService from '../services/visitService';

const EditVisitPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState('visit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [visit, setVisit] = useState(null);

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

  const [measurementData, setMeasurementData] = useState({
    weight_kg: '',
    height_cm: '',
    bp_systolic: '',
    bp_diastolic: '',
    waist_circumference_cm: '',
    body_fat_percentage: '',
    muscle_mass_percentage: '',
    notes: ''
  });

  useEffect(() => {
    fetchVisitData();
  }, [id]);

  const fetchVisitData = async () => {
    try {
      setLoading(true);
      const response = await visitService.getVisitById(id);
      const visitData = response.data.data || response.data;
      setVisit(visitData);

      // Pre-populate form with visit data
      const formattedVisitDate = visitData.visit_date
        ? new Date(visitData.visit_date).toISOString().slice(0, 16)
        : '';
      const formattedNextVisitDate = visitData.next_visit_date
        ? new Date(visitData.next_visit_date).toISOString().slice(0, 16)
        : '';

      setFormData({
        patient_id: visitData.patient_id || '',
        dietitian_id: visitData.dietitian_id || '',
        visit_date: formattedVisitDate,
        visit_type: visitData.visit_type || '',
        duration_minutes: visitData.duration_minutes || '',
        status: visitData.status || 'SCHEDULED',
        chief_complaint: visitData.chief_complaint || '',
        assessment: visitData.assessment || '',
        recommendations: visitData.recommendations || '',
        notes: visitData.notes || '',
        next_visit_date: formattedNextVisitDate
      });

      setError(null);
    } catch (err) {
      setError('Failed to load visit: ' + (err.response?.data?.error || err.message));
      console.error('Error fetching visit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleMeasurementChange = (e) => {
    const { name, value } = e.target;
    setMeasurementData(prev => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    navigate('/visits');
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

    setSaving(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        visit_date: new Date(formData.visit_date).toISOString(),
        next_visit_date: formData.next_visit_date && formData.next_visit_date.trim()
          ? new Date(formData.next_visit_date).toISOString()
          : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
      };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') submitData[key] = null;
      });

      await visitService.updateVisit(id, submitData);
      navigate('/visits');
    } catch (err) {
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || 'Failed to update visit';
      setError(errorMsg);
      console.error('Error updating visit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeasurement = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const submitData = {
        weight_kg: measurementData.weight_kg ? parseFloat(measurementData.weight_kg) : null,
        height_cm: measurementData.height_cm ? parseFloat(measurementData.height_cm) : null,
        bp_systolic: measurementData.bp_systolic ? parseInt(measurementData.bp_systolic) : null,
        bp_diastolic: measurementData.bp_diastolic ? parseInt(measurementData.bp_diastolic) : null,
        waist_circumference_cm: measurementData.waist_circumference_cm
          ? parseFloat(measurementData.waist_circumference_cm)
          : null,
        body_fat_percentage: measurementData.body_fat_percentage
          ? parseFloat(measurementData.body_fat_percentage)
          : null,
        muscle_mass_percentage: measurementData.muscle_mass_percentage
          ? parseFloat(measurementData.muscle_mass_percentage)
          : null,
        notes: measurementData.notes || ''
      };

      await visitService.addMeasurements(id, submitData);

      // Refresh visit data to show new measurement
      await fetchVisitData();

      // Reset measurement form
      setMeasurementData({
        weight_kg: '',
        height_cm: '',
        bp_systolic: '',
        bp_diastolic: '',
        waist_circumference_cm: '',
        body_fat_percentage: '',
        muscle_mass_percentage: '',
        notes: ''
      });

      setActiveTab('measurements');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save measurements');
      console.error('Error saving measurements:', err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate BMI
  const calculatedBMI = measurementData.weight_kg && measurementData.height_cm
    ? (measurementData.weight_kg / Math.pow(measurementData.height_cm / 100, 2)).toFixed(1)
    : null;

  // Check permissions
  const canEditVisit = user?.role === 'ADMIN' || user?.role === 'DIETITIAN';

  if (loading) {
    return (
      <Layout>
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">Loading visit data...</div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (!canEditVisit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>Access Denied</Alert.Heading>
            <p>You do not have permission to edit visits.</p>
            <Button variant="outline-danger" onClick={handleBack}>
              Back to Visits
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  if (error && !visit) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger">
            <Alert.Heading>Error Loading Visit</Alert.Heading>
            <p>{error}</p>
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
            <h1 className="mb-0">
              Edit Visit
              {visit?.patient && ` - ${visit.patient.first_name} ${visit.patient.last_name}`}
            </h1>
            <p className="text-muted">
              {visit?.visit_date && new Date(visit.visit_date).toLocaleString()}
            </p>
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
                            <Form.Label>Patient</Form.Label>
                            <Form.Control
                              type="text"
                              value={visit?.patient
                                ? `${visit.patient.first_name} ${visit.patient.last_name}`
                                : ''
                              }
                              disabled
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Patient cannot be changed after visit creation
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Dietitian</Form.Label>
                            <Form.Control
                              type="text"
                              value={visit?.dietitian
                                ? `${visit.dietitian.first_name || ''} ${visit.dietitian.last_name || ''}`.trim() || visit.dietitian.username
                                : ''
                              }
                              disabled
                              readOnly
                            />
                            <Form.Text className="text-muted">
                              Dietitian cannot be changed after visit creation
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Visit Date & Time *</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              name="visit_date"
                              value={formData.visit_date}
                              onChange={handleInputChange}
                              required
                            />
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
                          <h6 className="mb-0">Status & Schedule</h6>
                        </Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                              <option value="SCHEDULED">Scheduled</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="NO_SHOW">No Show</option>
                            </Form.Select>
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

                {/* Measurements Tab */}
                <Tab eventKey="measurements" title={`📏 Measurements (${visit?.measurements?.length || 0})`}>
                  <Row>
                    <Col md={12}>
                      {/* Measurement History */}
                      {visit?.measurements && visit.measurements.length > 0 && (
                        <Card className="mb-3">
                          <Card.Header className="bg-secondary text-white">
                            <h6 className="mb-0">Measurement History</h6>
                          </Card.Header>
                          <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {visit.measurements
                              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                              .map((measurement, index) => (
                                <div key={measurement.id} className="border rounded p-3 mb-2 bg-light">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong>
                                      {index === 0 && '🔵 Latest: '}
                                      {new Date(measurement.created_at).toLocaleString()}
                                    </strong>
                                  </div>
                                  <Row className="small">
                                    {measurement.weight_kg && (
                                      <Col md={3}><strong>Weight:</strong> {measurement.weight_kg} kg</Col>
                                    )}
                                    {measurement.height_cm && (
                                      <Col md={3}><strong>Height:</strong> {measurement.height_cm} cm</Col>
                                    )}
                                    {measurement.bmi && (
                                      <Col md={3}><strong>BMI:</strong> {measurement.bmi}</Col>
                                    )}
                                    {measurement.blood_pressure_systolic && measurement.blood_pressure_diastolic && (
                                      <Col md={3}>
                                        <strong>BP:</strong> {measurement.blood_pressure_systolic}/{measurement.blood_pressure_diastolic}
                                      </Col>
                                    )}
                                    {measurement.waist_circumference_cm && (
                                      <Col md={4}><strong>Waist:</strong> {measurement.waist_circumference_cm} cm</Col>
                                    )}
                                    {measurement.body_fat_percentage && (
                                      <Col md={4}><strong>Body Fat:</strong> {measurement.body_fat_percentage}%</Col>
                                    )}
                                    {measurement.muscle_mass_percentage && (
                                      <Col md={4}><strong>Muscle:</strong> {measurement.muscle_mass_percentage}%</Col>
                                    )}
                                  </Row>
                                  {measurement.notes && (
                                    <div className="mt-2 small"><strong>Notes:</strong> {measurement.notes}</div>
                                  )}
                                </div>
                              ))}
                          </Card.Body>
                        </Card>
                      )}

                      {/* Add New Measurement */}
                      <Card className="mb-3">
                        <Card.Header className="bg-warning">
                          <h6 className="mb-0">Add New Measurement</h6>
                        </Card.Header>
                        <Card.Body>
                          <p className="text-muted small">All fields are optional</p>
                          <Row>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Weight (kg)</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.1"
                                  name="weight_kg"
                                  value={measurementData.weight_kg}
                                  onChange={handleMeasurementChange}
                                  min="1"
                                  max="500"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Height (cm)</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.1"
                                  name="height_cm"
                                  value={measurementData.height_cm}
                                  onChange={handleMeasurementChange}
                                  min="30"
                                  max="300"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>BMI</Form.Label>
                                <Form.Control
                                  type="text"
                                  value={calculatedBMI || '-'}
                                  disabled
                                  readOnly
                                />
                                <Form.Text className="text-muted">Auto-calculated</Form.Text>
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Blood Pressure (Systolic)</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="bp_systolic"
                                  value={measurementData.bp_systolic}
                                  onChange={handleMeasurementChange}
                                  placeholder="e.g., 120"
                                  min="50"
                                  max="300"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Blood Pressure (Diastolic)</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="bp_diastolic"
                                  value={measurementData.bp_diastolic}
                                  onChange={handleMeasurementChange}
                                  placeholder="e.g., 80"
                                  min="30"
                                  max="200"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row>
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Waist Circumference (cm)</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.1"
                                  name="waist_circumference_cm"
                                  value={measurementData.waist_circumference_cm}
                                  onChange={handleMeasurementChange}
                                  min="20"
                                  max="300"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Body Fat (%)</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.1"
                                  name="body_fat_percentage"
                                  value={measurementData.body_fat_percentage}
                                  onChange={handleMeasurementChange}
                                  min="1"
                                  max="80"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Muscle Mass (%)</Form.Label>
                                <Form.Control
                                  type="number"
                                  step="0.1"
                                  name="muscle_mass_percentage"
                                  value={measurementData.muscle_mass_percentage}
                                  onChange={handleMeasurementChange}
                                  min="10"
                                  max="90"
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Measurement Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="notes"
                              value={measurementData.notes}
                              onChange={handleMeasurementChange}
                              placeholder="Additional measurement notes"
                            />
                          </Form.Group>

                          <Button
                            variant="info"
                            onClick={handleAddMeasurement}
                            disabled={saving}
                          >
                            {saving ? 'Adding Measurement...' : 'Add Measurement'}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <Button variant="outline-secondary" onClick={handleBack} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Form>
      </Container>
    </Layout>
  );
};

export default EditVisitPage;
