/**
 * VisitModal Component
 * Multi-mode modal for creating, viewing, and editing visits with measurements
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Accordion } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

// Validation schema
const visitSchema = yup.object().shape({
  patient_id: yup.string().required('Patient is required'),
  dietitian_id: yup.string().required('Dietitian is required'),
  visit_date: yup.string().required('Visit date is required'),
  visit_type: yup.string().max(50, 'Visit type must be at most 50 characters'),
  status: yup.string().oneOf(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  duration_minutes: yup.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration must be at most 480 minutes').nullable(),
  chief_complaint: yup.string(),
  assessment: yup.string(),
  recommendations: yup.string(),
  notes: yup.string(),
  next_visit_date: yup.string().nullable()
});

const measurementSchema = yup.object().shape({
  weight_kg: yup.number().min(1).max(500).nullable(),
  height_cm: yup.number().min(30).max(300).nullable(),
  bp_systolic: yup.number().min(50).max(300).nullable(),
  bp_diastolic: yup.number().min(30).max(200).nullable(),
  waist_circumference_cm: yup.number().min(20).max(300).nullable(),
  body_fat_percentage: yup.number().min(1).max(80).nullable(),
  muscle_mass_percentage: yup.number().min(10).max(90).nullable(),
  notes: yup.string()
});

const VisitModal = ({ show, onHide, mode, visit, onSave }) => {
  console.log('🔧 VisitModal rendered with props:', { show, mode, visit: visit ? 'present' : 'null' });
  if (visit) {
    console.log('🔧 VisitModal visit object:', visit);
  }
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMeasurements, setShowMeasurements] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(visitSchema),
    defaultValues: {
      status: 'SCHEDULED'
    }
  });

  const {
    register: registerMeasurement,
    handleSubmit: handleSubmitMeasurement,
    formState: { errors: measurementErrors },
    reset: resetMeasurement,
    watch: watchMeasurement
  } = useForm({
    resolver: yupResolver(measurementSchema)
  });

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  useEffect(() => {
    console.log('🔧 VisitModal useEffect triggered:', { show, mode, visit: visit ? 'present' : 'null' });
    if (visit) {
      console.log('🔧 VisitModal visit data:', visit);
    }
    
    if (show) {
      fetchPatients();
      fetchDietitians();
      
      if (visit) {
        console.log('🔧 VisitModal setting form values with visit data');
        console.log('🔧 VisitModal visit_date raw:', visit.visit_date);
        const formattedVisitDate = visit.visit_date ? new Date(visit.visit_date).toISOString().slice(0, 16) : '';
        console.log('🔧 VisitModal patient_id:', visit.patient_id, 'type:', typeof visit.patient_id);
        console.log('🔧 VisitModal dietitian_id:', visit.dietitian_id, 'type:', typeof visit.dietitian_id);
        setValue('patient_id', visit.patient_id);
        setValue('dietitian_id', visit.dietitian_id);
        setValue('visit_date', formattedVisitDate);
        setValue('visit_type', visit.visit_type || '');
        setValue('status', visit.status || 'SCHEDULED');
        setValue('duration_minutes', visit.duration_minutes || '');
        setValue('chief_complaint', visit.chief_complaint || '');
        setValue('assessment', visit.assessment || '');
        setValue('recommendations', visit.recommendations || '');
        setValue('notes', visit.notes || '');
        const formattedNextVisitDate = visit.next_visit_date ? new Date(visit.next_visit_date).toISOString().slice(0, 16) : '';
        console.log('🔧 VisitModal next_visit_date formatted:', formattedNextVisitDate);
        setValue('next_visit_date', formattedNextVisitDate);

        if (visit.measurements) {
          // Reset form to empty - measurements now stored as history (Beta feature)
          resetMeasurement({
            weight_kg: '',
            height_cm: '',
            bp_systolic: '',
            bp_diastolic: '',
            waist_circumference_cm: '',
            body_fat_percentage: '',
            muscle_mass_percentage: '',
            notes: ''
          });
        }
      } else if (mode === 'create') {
        console.log('🔧 VisitModal resetting form for create mode');
        reset({ status: 'SCHEDULED' });
        resetMeasurement({});
      }
    }
  }, [show, visit, reset, resetMeasurement]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients({ limit: 1000 });
      const data = response.data || response;
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchDietitians = async () => {
    try {
      // Use new dietitians-only endpoint that doesn't require admin role
      const response = await userService.getDietitians();
      // API response structure: { success: true, data: [...] }
      const data = response.data?.data || response.data || [];
      
      console.log('👥 Dietitians from API:', data);
      
      // The endpoint already filters for active dietitians, so use directly
      setDietitians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching dietitians:', err);
      // If endpoint fails, fall back to current user
      setDietitians([{
        id: user.id,
        username: user.username,
        first_name: user.first_name || user.username,
        last_name: user.last_name || ''
      }]);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      // Convert datetime-local to ISO string
      const visitData = {
        ...data,
        visit_date: new Date(data.visit_date).toISOString(),
        // Handle next_visit_date: only send if it has a value
        next_visit_date: data.next_visit_date && data.next_visit_date.trim() ? new Date(data.next_visit_date).toISOString() : null,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null
      };

      console.log('📝 Submitting visit data:', visitData);

      let savedVisit;
      if (isCreateMode) {
        console.log('🆕 Creating new visit...');
        const response = await visitService.createVisit(visitData);
        savedVisit = response.data;
      } else if (isEditMode) {
        console.log('✏️ Updating visit...');
        const response = await visitService.updateVisit(visit.id, visitData);
        savedVisit = response.data;
      }

      console.log('✅ Visit saved successfully:', savedVisit);
      onSave(savedVisit);
      onHide();
    } catch (err) {
      console.error('🔥 Error saving visit:', err);
      console.error('🔥 Full error response:', err.response?.data);
      // Get detailed error message from backend if available
      const errorMsg = err.response?.data?.details 
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || 'Failed to save visit';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitMeasurements = async (data) => {
    try {
      setLoading(true);
      setError(null);

      const measurementData = {
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
        bp_systolic: data.bp_systolic ? parseInt(data.bp_systolic) : null,
        bp_diastolic: data.bp_diastolic ? parseInt(data.bp_diastolic) : null,
        waist_circumference_cm: data.waist_circumference_cm ? parseFloat(data.waist_circumference_cm) : null,
        body_fat_percentage: data.body_fat_percentage ? parseFloat(data.body_fat_percentage) : null,
        muscle_mass_percentage: data.muscle_mass_percentage ? parseFloat(data.muscle_mass_percentage) : null,
        notes: data.notes || ''
      };

      await visitService.addMeasurements(visit.id, measurementData);
      onSave();
      onHide();
    } catch (err) {
      console.error('Error saving measurements:', err);
      setError(err.response?.data?.error || 'Failed to save measurements');
    } finally {
      setLoading(false);
    }
  };

  const weight = watchMeasurement('weight_kg');
  const height = watchMeasurement('height_cm');
  const calculatedBMI = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode && '📅 Create Visit'}
          {isViewMode && '📅 View Visit'}
          {isEditMode && '📅 Edit Visit'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <h5 className="mb-3">Visit Information</h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Patient *</Form.Label>
                <Form.Select
                  {...register('patient_id')}
                  isInvalid={!!errors.patient_id}
                  disabled={isViewMode || isEditMode}
                >
                  <option value="">Select patient...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </Form.Select>
                {isViewMode && visit?.patient && (
                  <Form.Text className="text-muted">
                    {visit.patient.first_name} {visit.patient.last_name}
                  </Form.Text>
                )}
                <Form.Control.Feedback type="invalid">{errors.patient_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Dietitian *</Form.Label>
                <Form.Select
                  {...register('dietitian_id')}
                  isInvalid={!!errors.dietitian_id}
                  disabled={isViewMode || isEditMode}
                >
                  <option value="">Select dietitian...</option>
                  {dietitians.map(dietitian => {
                    const displayName = dietitian.first_name || dietitian.last_name 
                      ? `${dietitian.first_name || ''} ${dietitian.last_name || ''}`.trim()
                      : dietitian.username;
                    return (
                      <option key={dietitian.id} value={dietitian.id}>
                        {displayName} ({dietitian.username})
                      </option>
                    );
                  })}
                </Form.Select>
                {isViewMode && visit?.dietitian && (
                  <Form.Text className="text-muted">
                    {visit.dietitian.first_name} {visit.dietitian.last_name}
                  </Form.Text>
                )}
                <Form.Control.Feedback type="invalid">{errors.dietitian_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Visit Date & Time *</Form.Label>
                <Form.Control
                  type="datetime-local"
                  {...register('visit_date')}
                  isInvalid={!!errors.visit_date}
                  disabled={isViewMode}
                />
                <Form.Control.Feedback type="invalid">{errors.visit_date?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Visit Type</Form.Label>
                <Form.Select {...register('visit_type')} disabled={isViewMode}>
                  <option value="">Select type...</option>
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Final Assessment">Final Assessment</option>
                  <option value="Nutrition Counseling">Nutrition Counseling</option>
                  <option value="Other">Other</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.visit_type?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Duration (minutes)</Form.Label>
                <Form.Control
                  type="number"
                  {...register('duration_minutes')}
                  isInvalid={!!errors.duration_minutes}
                  disabled={isViewMode}
                  placeholder="e.g., 60"
                />
                <Form.Control.Feedback type="invalid">{errors.duration_minutes?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {(isEditMode || isViewMode) && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select {...register('status')} disabled={isViewMode}>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Next Visit Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    {...register('next_visit_date')}
                    disabled={isViewMode}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <h5 className="mb-3 mt-4">Clinical Information</h5>
          <Form.Group className="mb-3">
            <Form.Label>Chief Complaint</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register('chief_complaint')}
              disabled={isViewMode}
              placeholder="Patient's main concerns or symptoms"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Assessment</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('assessment')}
              disabled={isViewMode}
              placeholder="Clinical assessment and findings"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Recommendations</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('recommendations')}
              disabled={isViewMode}
              placeholder="Treatment plan and dietary recommendations"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register('notes')}
              disabled={isViewMode}
              placeholder="Additional notes"
            />
          </Form.Group>
        </Form>

        {(isEditMode || isViewMode) && (
          <Accordion className="mt-4">
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                📏 Measurements {visit?.measurements?.length > 0 && `(${visit.measurements.length} recorded)`}
              </Accordion.Header>
              <Accordion.Body>
                {/* Measurement History - Beta Feature */}
                {visit?.measurements && visit.measurements.length > 0 && (
                  <div className="mb-4">
                    <h6>Measurement History</h6>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                    </div>
                    <hr />
                  </div>
                )}

                {/* Add New Measurement Form - Only in Edit Mode */}
                {isEditMode && (
                  <>
                    <h6>Add New Measurement</h6>
                    <p className="text-muted small">All fields are optional - record what's available</p>
                    <Form onSubmit={handleSubmitMeasurement(onSubmitMeasurements)}>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Weight (kg)</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('weight_kg')}
                              isInvalid={!!measurementErrors.weight_kg}
                            />
                            <Form.Control.Feedback type="invalid">
                              {measurementErrors.weight_kg?.message}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Height (cm)</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('height_cm')}
                              isInvalid={!!measurementErrors.height_cm}
                            />
                            <Form.Control.Feedback type="invalid">
                              {measurementErrors.height_cm?.message}
                            </Form.Control.Feedback>
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
                              {...registerMeasurement('bp_systolic')}
                              placeholder="e.g., 120"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Blood Pressure (Diastolic)</Form.Label>
                            <Form.Control
                              type="number"
                              {...registerMeasurement('bp_diastolic')}
                              placeholder="e.g., 80"
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
                              {...registerMeasurement('waist_circumference_cm')}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Body Fat %</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('body_fat_percentage')}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Muscle Mass %</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('muscle_mass_percentage')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Measurement Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          {...registerMeasurement('notes')}
                          placeholder="Additional measurement notes"
                        />
                      </Form.Group>

                      <Button variant="info" type="submit" disabled={loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : 'Add Measurement'}
                      </Button>
                    </Form>
                  </>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {isViewMode ? 'Close' : 'Cancel'}
        </Button>
        {!isViewMode && (
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : (isCreateMode ? 'Create Visit' : 'Update Visit')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default VisitModal;
