/**
 * User Form Component
 *
 * Reusable form for creating and editing users
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Validation schema for new users (with password)
const createUserSchema = yup.object({
  first_name: yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string()
    .required('Email is required')
    .email('Invalid email address'),
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  role_id: yup.number()
    .required('Role is required')
    .positive('Role is required')
    .integer('Role is required')
}).required();

// Validation schema for editing users (without password)
const editUserSchema = yup.object({
  first_name: yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string()
    .required('Email is required')
    .email('Invalid email address'),
  role_id: yup.number()
    .required('Role is required')
    .positive('Role is required')
    .integer('Role is required')
}).required();

const UserForm = ({ 
  initialData = null, 
  onSubmit, 
  isLoading = false, 
  roles = [],
  isEdit = false 
}) => {
  const schema = isEdit ? editUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData || {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role_id: ''
    }
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="form-group">
            <label>
              First Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
              {...register('first_name')}
              disabled={isLoading}
            />
            {errors.first_name && (
              <div className="invalid-feedback">
                {errors.first_name?.message}
              </div>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="form-group">
            <label>
              Last Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
              {...register('last_name')}
              disabled={isLoading}
            />
            {errors.last_name && (
              <div className="invalid-feedback">
                {errors.last_name?.message}
              </div>
            )}
          </div>
        </div>

        <div className="col-md-12">
          <div className="form-group">
            <label>
              Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <div className="invalid-feedback">
                {errors.email?.message}
              </div>
            )}
          </div>
        </div>

        {!isEdit && (
          <div className="col-md-12">
            <div className="form-group">
              <label>
                Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <div className="invalid-feedback">
                  {errors.password?.message}
                </div>
              )}
              <small className="form-text text-muted">
                Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*)
              </small>
            </div>
          </div>
        )}

        <div className="col-md-12">
          <div className="form-group">
            <label>
              Role <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${errors.role_id ? 'is-invalid' : ''}`}
              {...register('role_id')}
              disabled={isLoading}
            >
              <option value="">Select a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </select>
            {errors.role_id && (
              <div className="invalid-feedback">
                {errors.role_id?.message}
              </div>
            )}
          </div>
        </div>

        <div className="col-md-12">
          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => reset()}
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                isEdit ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default UserForm;
