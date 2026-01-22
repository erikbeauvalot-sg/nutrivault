/**
 * VisitModal Component
 * Multi-mode modal for creating, viewing, and editing visits with measurements
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Accordion } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import visitService from '../services/visitService';
import { getPatients } from '../services/patientService';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import CreatePatientModal from './CreatePatientModal';

// Validation schema - will be created dynamically with translations
const visitSchema = (t) => yup.object().shape({
  patient_id: yup.string().required(t('forms.required')),
  dietitian_id: yup.string().required(t('forms.required')),
  visit_date: yup.string().required(t('forms.required')),
  visit_type: yup.string().max(50, t('forms.maxLength', { count: 50 })),
  status: yup.string().oneOf(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  duration_minutes: yup.number().min(1, t('visits.durationMin')).max(480, t('visits.durationMax')).nullable(),
  chief_complaint: yup.string(),
  assessment: yup.string(),
  recommendations: yup.string(),
  notes: yup.string(),
  next_visit_date: yup.string().nullable()
});

const measurementSchema = (t) => yup.object().shape({
  weight_kg: yup.number().min(1).max(500).nullable(),
  height_cm: yup.number().min(30).max(300).nullable(),
  bp_systolic: yup.number().min(50).max(300).nullable(),
  bp_diastolic: yup.number().min(30).max(200).nullable(),
  waist_circumference_cm: yup.number().min(20).max(300).nullable(),
  body_fat_percentage: yup.number().min(1).max(80).nullable(),
  muscle_mass_percentage: yup.number().min(10).max(90).nullable(),
  notes: yup.string()
});

const VisitModal = ({ show, onHide, mode, visit, onSave, preSelectedPatient }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [dietitians, setDietitians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [completeImmediately, setCompleteImmediately] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(visitSchema(t)),
    defaultValues: {
      status: 'SCHEDULED'
    }
  });

  // Watch visit_type to set default duration
  const watchedVisitType = watch('visit_type');

  // Default duration mapping based on visit type
  const getDefaultDuration = (visitType) => {
    const durationMap = {
      'Initial Consultation': 60,
      'Follow-up': 30,
      'Final Assessment': 30,
      'Nutrition Counseling': 45,
      'Other': 60
    };
    return durationMap[visitType] || null;
  };

  const {
    register: registerMeasurement,
    handleSubmit: handleSubmitMeasurement,
    formState: { errors: measurementErrors },
    reset: resetMeasurement,
    watch: watchMeasurement
  } = useForm({
    resolver: yupResolver(measurementSchema(t))
  });

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // Effect to set default duration when visit type changes (only in create mode)
  useEffect(() => {
    if (isCreateMode && watchedVisitType) {
      const defaultDuration = getDefaultDuration(watchedVisitType);
      if (defaultDuration) {
        setValue('duration_minutes', defaultDuration);
      }
    }
  }, [watchedVisitType, isCreateMode, setValue]);

  useEffect(() => {
    if (show) {
      console.log('🔥 VisitModal opened:', { mode, preSelectedPatient: !!preSelectedPatient, visit: !!visit });
      fetchPatients();
      fetchDietitians();
      
      if (visit) {
        const formattedVisitDate = visit.visit_date ? new Date(visit.visit_date).toISOString().slice(0, 16) : '';
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
        reset({ status: 'SCHEDULED' });
        resetMeasurement({});
      }
    }
  }, [show, visit, reset, resetMeasurement]);

  // Separate effect for pre-selecting patient and dietitian when both data is available
  useEffect(() => {
    if (show && mode === 'create' && preSelectedPatient && patients.length > 0 && dietitians.length > 0) {
      console.log('🎯 Pre-selecting patient:', {
        patientId: preSelectedPatient.id,
        patientName: `${preSelectedPatient.first_name} ${preSelectedPatient.last_name}`,
        assignedDietitian: preSelectedPatient.assigned_dietitian,
        patientsLoaded: patients.length > 0,
        dietitiansLoaded: dietitians.length > 0
      });

      // Always set the patient
      setValue('patient_id', preSelectedPatient.id);
      console.log('✅ Patient pre-selected:', preSelectedPatient.id);

      // Set dietitian if available
      if (preSelectedPatient.assigned_dietitian?.id) {
        setValue('dietitian_id', preSelectedPatient.assigned_dietitian.id);
        console.log('✅ Dietitian auto-selected:', preSelectedPatient.assigned_dietitian.id);
      } else {
        console.log('⚠️ No assigned dietitian found for patient');
      }
    }
  }, [show, mode, preSelectedPatient, patients, dietitians, setValue]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients({ limit: 1000 });
      // Handle both POC format and new API format
      const data = response.data?.data || response.data || response;
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

  const handleCreatePatient = async (patientData) => {
    try {
      setLoading(true);
      setError(null);

      // Create the patient via API
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nutrivault_access_token')}`
        },
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        throw new Error('Failed to create patient');
      }

      const result = await response.json();
      const newPatient = result.data || result;

      // Add the new patient to the patients list
      setPatients(prevPatients => [newPatient, ...prevPatients]);

      // Automatically select the newly created patient
      setValue('patient_id', newPatient.id);

      // Close the create patient modal
      setShowCreatePatientModal(false);

      return true;
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(t('errors.failedToCreatePatient', { error: err.message || t('common.unknownError') }));
      return false;
    } finally {
      setLoading(false);
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
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        // Set status to COMPLETED if complete immediately is checked
        status: completeImmediately ? 'COMPLETED' : (data.status || 'SCHEDULED')
      };

      let savedVisit;
      if (isCreateMode) {
        const response = await visitService.createVisit(visitData);
        savedVisit = response.data;
      } else if (isEditMode) {
        const response = await visitService.updateVisit(visit.id, visitData);
        savedVisit = response.data;
      }

      onSave(savedVisit);
      
      // If completed immediately, navigate to billing page after a short delay to allow invoice creation
      if (completeImmediately && savedVisit) {
        console.log('🎯 Visit completed immediately, navigating to billing page...');
        onHide();
        // Small delay to allow backend invoice creation to complete
        setTimeout(() => {
          // If an invoice was created, navigate directly to it
          if (savedVisit.created_invoice) {
            console.log('🚀 Navigating to specific invoice:', savedVisit.created_invoice.id);
            navigate(`/billing/${savedVisit.created_invoice.id}`);
          } else {
            console.log('🚀 Navigating to billing page (no invoice created)');
            navigate('/billing', { state: { refreshFromVisit: true, visitId: savedVisit.id } });
          }
        }, 1000);
      } else {
        onHide();
      }
    } catch (err) {
      console.error('🔥 Error saving visit:', err);
      console.error('🔥 Full error response:', err.response?.data);
      // Get detailed error message from backend if available
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map(d => d.msg).join(', ')
        : err.response?.data?.error || t('errors.failedToSaveVisit');
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
      setError(err.response?.data?.error || t('errors.failedToSaveMeasurements'));
    } finally {
      setLoading(false);
    }
  };

  const weight = watchMeasurement('weight_kg');
  const height = watchMeasurement('height_cm');
  const calculatedBMI = weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : null;

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode && `📅 ${t('visits.createVisit')}`}
          {isViewMode && `📅 ${t('visits.viewVisit')}`}
          {isEditMode && `📅 ${t('visits.editVisit')}`}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <h5 className="mb-3">{t('visits.visitInfo')}</h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('visits.patient')} *</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Select
                    {...register('patient_id')}
                    isInvalid={!!errors.patient_id}
                    disabled={isViewMode || isEditMode}
                    className="flex-grow-1"
                  >
                    <option value="">{t('visits.selectPatient')}</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </Form.Select>
                  {isCreateMode && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowCreatePatientModal(true)}
                      disabled={loading}
                      title={t('patients.createPatient')}
                    >
                      ➕
                    </Button>
                  )}
                </div>
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
                <Form.Label>{t('visits.dietitian')} *</Form.Label>
                <Form.Select
                  {...register('dietitian_id')}
                  isInvalid={!!errors.dietitian_id}
                  disabled={isViewMode || isEditMode}
                >
                  <option value="">{t('visits.selectDietitian')}</option>
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
                <Form.Label>{t('visits.visitDateTime')} *</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="datetime-local"
                    {...register('visit_date')}
                    isInvalid={!!errors.visit_date}
                    disabled={isViewMode}
                    className="flex-grow-1"
                  />
                  {isCreateMode && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const formattedNow = now.toISOString().slice(0, 16);
                        setValue('visit_date', formattedNow);
                      }}
                      disabled={loading}
                      title={t('visits.setToNow', 'Set to current time')}
                    >
                      🕐 {t('visits.now', 'Now')}
                    </Button>
                  )}
                </div>
                <Form.Control.Feedback type="invalid">{errors.visit_date?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('visits.visitType')}</Form.Label>
                <Form.Select {...register('visit_type')} disabled={isViewMode}>
                  <option value="">{t('visits.selectType')}</option>
                  <option value="Initial Consultation">{t('visits.initialConsultation')}</option>
                  <option value="Follow-up">{t('visits.followUp')}</option>
                  <option value="Final Assessment">{t('visits.finalAssessment')}</option>
                  <option value="Nutrition Counseling">{t('visits.nutritionCounseling')}</option>
                  <option value="Other">{t('visits.other')}</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.visit_type?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('visits.duration')}</Form.Label>
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
                  <Form.Label>{t('visits.status')}</Form.Label>
                  <Form.Select {...register('status')} disabled={isViewMode}>
                    <option value="SCHEDULED">{t('visits.scheduled')}</option>
                    <option value="COMPLETED">{t('visits.completed')}</option>
                    <option value="CANCELLED">{t('visits.cancelled')}</option>
                    <option value="NO_SHOW">{t('visits.noShow')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('visits.nextVisitDate')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    {...register('next_visit_date')}
                    disabled={isViewMode}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {isCreateMode && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label={t('visits.completeImmediately', 'Complete visit immediately and create billing')}
                    checked={completeImmediately}
                    onChange={(e) => setCompleteImmediately(e.target.checked)}
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    {t('visits.completeImmediatelyHelp', 'Check this to mark the visit as completed and automatically generate a billing invoice')}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          )}

          <h5 className="mb-3 mt-4">{t('visits.clinicalInfo')}</h5>
          <Form.Group className="mb-3">
            <Form.Label>{t('visits.chiefComplaint')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              {...register('chief_complaint')}
              disabled={isViewMode}
              placeholder="Patient's main concerns or symptoms"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visits.assessment')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('assessment')}
              disabled={isViewMode}
              placeholder="Clinical assessment and findings"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visits.recommendations')}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              {...register('recommendations')}
              disabled={isViewMode}
              placeholder="Treatment plan and dietary recommendations"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('visits.notes')}</Form.Label>
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
                📏 {t('visits.measurements')} {visit?.measurements?.length > 0 && `(${visit.measurements.length} recorded)`}
              </Accordion.Header>
              <Accordion.Body>
                {/* Measurement History - Beta Feature */}
                {visit?.measurements && visit.measurements.length > 0 && (
                  <div className="mb-4">
                    <h6>{t('visits.measurementHistory')}</h6>
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
                                <Col md={3}><strong>{t('visits.weightLabel')}</strong> {measurement.weight_kg} kg</Col>
                              )}
                              {measurement.height_cm && (
                                <Col md={3}><strong>{t('visits.heightLabel')}</strong> {measurement.height_cm} cm</Col>
                              )}
                              {measurement.bmi && (
                                <Col md={3}><strong>{t('visits.bmiLabel')}</strong> {measurement.bmi}</Col>
                              )}
                              {measurement.blood_pressure_systolic && measurement.blood_pressure_diastolic && (
                                <Col md={3}>
                                  <strong>{t('visits.bpLabel')}</strong> {measurement.blood_pressure_systolic}/{measurement.blood_pressure_diastolic}
                                </Col>
                              )}
                              {measurement.waist_circumference_cm && (
                                <Col md={4}><strong>{t('visits.waistLabel')}</strong> {measurement.waist_circumference_cm} cm</Col>
                              )}
                              {measurement.body_fat_percentage && (
                                <Col md={4}><strong>{t('visits.bodyFatLabel')}</strong> {measurement.body_fat_percentage}%</Col>
                              )}
                              {measurement.muscle_mass_percentage && (
                                <Col md={4}><strong>{t('visits.muscleLabel')}</strong> {measurement.muscle_mass_percentage}%</Col>
                              )}
                            </Row>
                            {measurement.notes && (
                              <div className="mt-2 small"><strong>{t('visits.notesLabel')}</strong> {measurement.notes}</div>
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
                    <h6>{t('visits.addNewMeasurement')}</h6>
                    <p className="text-muted small">{t('visits.allFieldsOptional')}</p>
                    <Form onSubmit={handleSubmitMeasurement(onSubmitMeasurements)}>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.weight')}</Form.Label>
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
                            <Form.Label>{t('visits.height')}</Form.Label>
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
                            <Form.Label>{t('visits.bloodPressureSystolic')}</Form.Label>
                            <Form.Control
                              type="number"
                              {...registerMeasurement('bp_systolic')}
                              placeholder="e.g., 120"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.bloodPressureDiastolic')}</Form.Label>
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
                            <Form.Label>{t('visits.waistCircumference')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('waist_circumference_cm')}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.bodyFat')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('body_fat_percentage')}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t('visits.muscleMass')}</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.1"
                              {...registerMeasurement('muscle_mass_percentage')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>{t('visits.measurementNotes')}</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          {...registerMeasurement('notes')}
                          placeholder="Additional measurement notes"
                        />
                      </Form.Group>

                      <Button variant="info" type="submit" disabled={loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : t('visits.addMeasurement')}
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
          {isViewMode ? t('common.close') : t('common.cancel')}
        </Button>
        {!isViewMode && (
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : (isCreateMode ? t('visits.createVisit') : t('visits.editVisit'))}
          </Button>
        )}
      </Modal.Footer>
    </Modal>

    {/* Inline Patient Creation Modal */}
    <CreatePatientModal
      show={showCreatePatientModal}
      onHide={() => setShowCreatePatientModal(false)}
      onSubmit={handleCreatePatient}
    />
  </>
  );
};

export default VisitModal;
