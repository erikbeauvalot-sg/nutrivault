import { useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Form, Row, Col, Button, Card } from 'react-bootstrap';
import { PlusCircle, Trash } from 'react-bootstrap-icons';

// Validation Schema
const visitFormSchema = yup.object().shape({
  patientId: yup
    .number()
    .required('Patient is required')
    .positive('Please select a valid patient'),
  visitDate: yup
    .date()
    .required('Visit date is required')
    .typeError('Invalid date'),
  visitType: yup
    .string()
    .required('Visit type is required')
    .oneOf(
      ['Initial Consultation', 'Follow-up', 'Nutrition Assessment', 'Meal Planning', 'Weight Management'],
      'Invalid visit type'
    ),
  status: yup
    .string()
    .required('Status is required')
    .oneOf(['Scheduled', 'Completed', 'Cancelled', 'In Progress'], 'Invalid status'),
  notes: yup.string().max(2000, 'Notes cannot exceed 2000 characters'),
  measurements: yup.array().of(
    yup.object().shape({
      measurementType: yup.string().required('Measurement type is required'),
      value: yup
        .number()
        .required('Value is required')
        .positive('Value must be positive')
        .typeError('Value must be a number'),
      unit: yup.string().required('Unit is required'),
    })
  ),
});

const VisitForm = ({ initialData = {}, onSubmit, patients = [] }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(visitFormSchema),
    defaultValues: {
      patientId: initialData.patientId || '',
      visitDate: initialData.visitDate
        ? new Date(initialData.visitDate).toISOString().slice(0, 16)
        : '',
      visitType: initialData.visitType || '',
      status: initialData.status || 'Scheduled',
      notes: initialData.notes || '',
      measurements: initialData.measurements || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'measurements',
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData.id) {
      reset({
        patientId: initialData.patientId || '',
        visitDate: initialData.visitDate
          ? new Date(initialData.visitDate).toISOString().slice(0, 16)
          : '',
        visitType: initialData.visitType || '',
        status: initialData.status || 'Scheduled',
        notes: initialData.notes || '',
        measurements: initialData.measurements || [],
      });
    }
  }, [initialData, reset]);

  const addMeasurement = () => {
    append({
      measurementType: '',
      value: '',
      unit: '',
    });
  };

  const handleFormSubmit = async (data) => {
    try {
      // Convert visitDate to ISO format
      const formattedData = {
        ...data,
        visitDate: new Date(data.visitDate).toISOString(),
      };
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const measurementTypes = [
    { value: 'weight', label: 'Weight', defaultUnit: 'kg' },
    { value: 'height', label: 'Height', defaultUnit: 'cm' },
    { value: 'bmi', label: 'BMI', defaultUnit: 'kg/m²' },
    { value: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', defaultUnit: 'mmHg' },
    { value: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', defaultUnit: 'mmHg' },
    { value: 'waist_circumference', label: 'Waist Circumference', defaultUnit: 'cm' },
    { value: 'body_fat_percentage', label: 'Body Fat %', defaultUnit: '%' },
    { value: 'glucose', label: 'Blood Glucose', defaultUnit: 'mg/dL' },
  ];

  return (
    <Form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Visit Information</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            {/* Patient Selection */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Patient <span className="text-danger">*</span>
                </Form.Label>
                <Controller
                  name="patientId"
                  control={control}
                  render={({ field }) => (
                    <Form.Select
                      {...field}
                      isInvalid={!!errors.patientId}
                      disabled={!!initialData.id}
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.patientId?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Visit Date */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Visit Date & Time <span className="text-danger">*</span>
                </Form.Label>
                <Controller
                  name="visitDate"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="datetime-local"
                      isInvalid={!!errors.visitDate}
                    />
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.visitDate?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            {/* Visit Type */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Visit Type <span className="text-danger">*</span>
                </Form.Label>
                <Controller
                  name="visitType"
                  control={control}
                  render={({ field }) => (
                    <Form.Select {...field} isInvalid={!!errors.visitType}>
                      <option value="">Select Visit Type</option>
                      <option value="Initial Consultation">Initial Consultation</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Nutrition Assessment">Nutrition Assessment</option>
                      <option value="Meal Planning">Meal Planning</option>
                      <option value="Weight Management">Weight Management</option>
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.visitType?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Status */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Status <span className="text-danger">*</span>
                </Form.Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Form.Select {...field} isInvalid={!!errors.status}>
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </Form.Select>
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.status?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Notes */}
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      as="textarea"
                      rows={4}
                      placeholder="Enter visit notes, observations, recommendations..."
                      isInvalid={!!errors.notes}
                    />
                  )}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.notes?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Measurements Section */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Measurements</h5>
          <Button variant="success" size="sm" onClick={addMeasurement}>
            <PlusCircle className="me-2" />
            Add Measurement
          </Button>
        </Card.Header>
        <Card.Body>
          {fields.length === 0 ? (
            <p className="text-muted text-center py-3">
              No measurements added yet. Click "Add Measurement" to start recording.
            </p>
          ) : (
            fields.map((field, index) => (
              <Card key={field.id} className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Measurement Type</Form.Label>
                        <Controller
                          name={`measurements.${index}.measurementType`}
                          control={control}
                          render={({ field }) => (
                            <Form.Select
                              {...field}
                              isInvalid={!!errors.measurements?.[index]?.measurementType}
                            >
                              <option value="">Select Type</option>
                              {measurementTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </Form.Select>
                          )}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.measurements?.[index]?.measurementType?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Value</Form.Label>
                        <Controller
                          name={`measurements.${index}.value`}
                          control={control}
                          render={({ field }) => (
                            <Form.Control
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              isInvalid={!!errors.measurements?.[index]?.value}
                            />
                          )}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.measurements?.[index]?.value?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Unit</Form.Label>
                        <Controller
                          name={`measurements.${index}.unit`}
                          control={control}
                          render={({ field }) => (
                            <Form.Control
                              {...field}
                              type="text"
                              placeholder="e.g., kg, cm"
                              isInvalid={!!errors.measurements?.[index]?.unit}
                            />
                          )}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.measurements?.[index]?.unit?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-start">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => remove(index)}
                        className="mt-4"
                      >
                        <Trash />
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))
          )}
        </Card.Body>
      </Card>

      {/* Submit Buttons */}
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" type="button" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData.id ? 'Update Visit' : 'Create Visit'}
        </Button>
      </div>
    </Form>
  );
};

export default VisitForm;
