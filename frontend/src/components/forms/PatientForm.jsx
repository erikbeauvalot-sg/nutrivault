/**
 * Patient Form Component
 * Reusable form for creating and editing patients
 */

import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

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
    <div>
      {/* Basic Information */}
      <h4 className="mb-3">Basic Information</h4>
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>First Name <span className="text-danger">*</span></label>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                  placeholder="Enter first name"
                />
              )}
            />
            {errors.firstName && (
              <div className="invalid-feedback">
                {errors.firstName?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Last Name <span className="text-danger">*</span></label>
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                  placeholder="Enter last name"
                />
              )}
            />
            {errors.lastName && (
              <div className="invalid-feedback">
                {errors.lastName?.message}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>Email</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="patient@example.com"
                />
              )}
            />
            {errors.email && (
              <div className="invalid-feedback">
                {errors.email?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Phone</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="tel"
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  placeholder="(555) 123-4567"
                />
              )}
            />
            {errors.phone && (
              <div className="invalid-feedback">
                {errors.phone?.message}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>Date of Birth</label>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                />
              )}
            />
            {errors.dateOfBirth && (
              <div className="invalid-feedback">
                {errors.dateOfBirth?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Gender</label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`form-control ${errors.gender ? 'is-invalid' : ''}`}
                >
                  <option value="">Select gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              )}
            />
            {errors.gender && (
              <div className="invalid-feedback">
                {errors.gender?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <h4 className="mb-3 mt-4">Address Information</h4>
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="form-group">
            <label>Street Address</label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                  placeholder="123 Main St"
                />
              )}
            />
            {errors.address && (
              <div className="invalid-feedback">
                {errors.address?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-5">
          <div className="form-group">
            <label>City</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                  placeholder="City"
                />
              )}
            />
            {errors.city && (
              <div className="invalid-feedback">
                {errors.city?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label>State</label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                  placeholder="State"
                />
              )}
            />
            {errors.state && (
              <div className="invalid-feedback">
                {errors.state?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-3">
          <div className="form-group">
            <label>ZIP Code</label>
            <Controller
              name="zipCode"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.zipCode ? 'is-invalid' : ''}`}
                  placeholder="12345"
                />
              )}
            />
            {errors.zipCode && (
              <div className="invalid-feedback">
                {errors.zipCode?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <h4 className="mb-3 mt-4">Emergency Contact</h4>
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>Contact Name</label>
            <Controller
              name="emergencyContactName"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className={`form-control ${errors.emergencyContactName ? 'is-invalid' : ''}`}
                  placeholder="Emergency contact name"
                />
              )}
            />
            {errors.emergencyContactName && (
              <div className="invalid-feedback">
                {errors.emergencyContactName?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Contact Phone</label>
            <Controller
              name="emergencyContactPhone"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="tel"
                  className={`form-control ${errors.emergencyContactPhone ? 'is-invalid' : ''}`}
                  placeholder="(555) 123-4567"
                />
              )}
            />
            {errors.emergencyContactPhone && (
              <div className="invalid-feedback">
                {errors.emergencyContactPhone?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <h4 className="mb-3 mt-4">Medical Information</h4>
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="form-group">
            <label>Medical History</label>
            <Controller
              name="medicalHistory"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`form-control ${errors.medicalHistory ? 'is-invalid' : ''}`}
                  rows={3}
                  placeholder="Relevant medical history"
                />
              )}
            />
            {errors.medicalHistory && (
              <div className="invalid-feedback">
                {errors.medicalHistory?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>Allergies</label>
            <Controller
              name="allergies"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`form-control ${errors.allergies ? 'is-invalid' : ''}`}
                  rows={2}
                  placeholder="Known allergies"
                />
              )}
            />
            {errors.allergies && (
              <div className="invalid-feedback">
                {errors.allergies?.message}
              </div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group">
            <label>Current Medications</label>
            <Controller
              name="currentMedications"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`form-control ${errors.currentMedications ? 'is-invalid' : ''}`}
                  rows={2}
                  placeholder="Current medications"
                />
              )}
            />
            {errors.currentMedications && (
              <div className="invalid-feedback">
                {errors.currentMedications?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-12">
          <div className="form-group">
            <label>Dietary Restrictions</label>
            <Controller
              name="dietaryRestrictions"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`form-control ${errors.dietaryRestrictions ? 'is-invalid' : ''}`}
                  rows={2}
                  placeholder="Dietary restrictions or preferences"
                />
              )}
            />
            {errors.dietaryRestrictions && (
              <div className="invalid-feedback">
                {errors.dietaryRestrictions?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <h4 className="mb-3 mt-4">Additional Notes</h4>
      <div className="row mb-3">
        <div className="col-md-12">
          <div className="form-group">
            <label>Notes</label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                  rows={3}
                  placeholder="Additional notes"
                />
              )}
            />
            {errors.notes && (
              <div className="invalid-feedback">
                {errors.notes?.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex gap-2 justify-content-end mt-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmit)}
        >
          {isSubmitting ? 'Saving...' : 'Save Patient'}
        </button>
      </div>
    </div>
  );
}

export default PatientForm;
