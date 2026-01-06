/**
 * Patient Form Component
 * Reusable form for creating and editing patients
 */

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Form, Row, Col, Button } from 'react-bootstrap';

// Validation schema
const patientSchema = yup.object({
  firstName: yup.string().required('First name is required').max(100),
  lastName: yup.string().required('Last name is required').max(100),
  email: yup.string().email('Invalid email format').nullable(),
  phone: yup.string()
    .matches(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number format')
    .nullable(),
  dateOfBirth: yup.date()
    .nullable()
    .max(new Date(), 'Date of birth cannot be in the future'),
  gender: yup.string().oneOf(['male', 'female', 'other', 'prefer_not_to_say'], 'Invalid gender').nullable(),
  address: yup.string().max(255).nullable(),
  city: yup.string().max(100).nullable(),
  state: yup.string().max(50).nullable(),
  zipCode: yup.string().max(20).nullable(),
  emergencyContactName: yup.string().max(100).nullable(),
  emergencyContactPhone: yup.string()
    .matches(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number format')
    .nullable(),
  medicalHistory: yup.string().nullable(),
  allergies: yup.string().nullable(),
  currentMedications: yup.string().nullable(),
  dietaryRestrictions: yup.string().nullable(),
  notes: yup.string().nullable()
}).required();

function PatientForm({ initialData = {}, onSubmit, onCancel, isSubmitting = false }) {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(patientSchema),
    defaultValues: {
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '',
      gender: initialData.gender || '',
      address: initialData.address || '',
      city: initialData.city || '',
      state: initialData.state || '',
      zipCode: initialData.zipCode || '',
      emergencyContactName: initialData.emergencyContactName || '',
      emergencyContactPhone: initialData.emergencyContactPhone || '',
      medicalHistory: initialData.medicalHistory || '',
      allergies: initialData.allergies || '',
      currentMedications: initialData.currentMedications || '',
      dietaryRestrictions: initialData.dietaryRestrictions || '',
      notes: initialData.notes || ''
    }
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Information */}
      <h4 className="mb-3">Basic Information</h4>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.firstName}
                  placeholder="Enter first name"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.firstName?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.lastName}
                  placeholder="Enter last name"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.lastName?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="email"
                  isInvalid={!!errors.email}
                  placeholder="patient@example.com"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Phone</Form.Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="tel"
                  isInvalid={!!errors.phone}
                  placeholder="(555) 123-4567"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.phone?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Date of Birth</Form.Label>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="date"
                  isInvalid={!!errors.dateOfBirth}
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.dateOfBirth?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Gender</Form.Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Form.Select {...field} isInvalid={!!errors.gender}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Form.Select>
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.gender?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* Address Information */}
      <h4 className="mb-3 mt-4">Address Information</h4>
      <Row className="mb-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Street Address</Form.Label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.address}
                  placeholder="123 Main St"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.address?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={5}>
          <Form.Group>
            <Form.Label>City</Form.Label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.city}
                  placeholder="City"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.city?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>State</Form.Label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.state}
                  placeholder="State"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.state?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>ZIP Code</Form.Label>
            <Controller
              name="zipCode"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.zipCode}
                  placeholder="12345"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.zipCode?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* Emergency Contact */}
      <h4 className="mb-3 mt-4">Emergency Contact</h4>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Contact Name</Form.Label>
            <Controller
              name="emergencyContactName"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="text"
                  isInvalid={!!errors.emergencyContactName}
                  placeholder="Emergency contact name"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.emergencyContactName?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Contact Phone</Form.Label>
            <Controller
              name="emergencyContactPhone"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  type="tel"
                  isInvalid={!!errors.emergencyContactPhone}
                  placeholder="(555) 123-4567"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.emergencyContactPhone?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* Medical Information */}
      <h4 className="mb-3 mt-4">Medical Information</h4>
      <Row className="mb-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Medical History</Form.Label>
            <Controller
              name="medicalHistory"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  as="textarea"
                  rows={3}
                  isInvalid={!!errors.medicalHistory}
                  placeholder="Relevant medical history"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.medicalHistory?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Allergies</Form.Label>
            <Controller
              name="allergies"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  as="textarea"
                  rows={2}
                  isInvalid={!!errors.allergies}
                  placeholder="Known allergies"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.allergies?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Current Medications</Form.Label>
            <Controller
              name="currentMedications"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  as="textarea"
                  rows={2}
                  isInvalid={!!errors.currentMedications}
                  placeholder="Current medications"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.currentMedications?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Dietary Restrictions</Form.Label>
            <Controller
              name="dietaryRestrictions"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  as="textarea"
                  rows={2}
                  isInvalid={!!errors.dietaryRestrictions}
                  placeholder="Dietary restrictions or preferences"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.dietaryRestrictions?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* Additional Notes */}
      <h4 className="mb-3 mt-4">Additional Notes</h4>
      <Row className="mb-3">
        <Col md={12}>
          <Form.Group>
            <Form.Label>Notes</Form.Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Form.Control
                  {...field}
                  as="textarea"
                  rows={3}
                  isInvalid={!!errors.notes}
                  placeholder="Additional notes or comments"
                />
              )}
            />
            <Form.Control.Feedback type="invalid">
              {errors.notes?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* Action Buttons */}
      <div className="d-flex gap-2 justify-content-end mt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Patient'}
        </Button>
      </div>
    </Form>
  );
}

export default PatientForm;
