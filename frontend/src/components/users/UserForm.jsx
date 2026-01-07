/**
 * User Form Component
 *
 * Reusable form for creating and editing users
 */

import { useEffect } from 'react';
import { Form, Row, Col, Button, Spinner } from 'react-bootstrap';
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
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              First Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              {...register('first_name')}
              isInvalid={!!errors.first_name}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.first_name?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Last Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              {...register('last_name')}
              isInvalid={!!errors.last_name}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.last_name?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Group>
            <Form.Label>
              Email <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="email"
              {...register('email')}
              isInvalid={!!errors.email}
              disabled={isLoading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        {!isEdit && (
          <Col md={12}>
            <Form.Group>
              <Form.Label>
                Password <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="password"
                {...register('password')}
                isInvalid={!!errors.password}
                disabled={isLoading}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*)
              </Form.Text>
            </Form.Group>
          </Col>
        )}

        <Col md={12}>
          <Form.Group>
            <Form.Label>
              Role <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              {...register('role_id')}
              isInvalid={!!errors.role_id}
              disabled={isLoading}
            >
              <option value="">Select a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.role_id?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={12}>
          <div className="d-flex gap-2 justify-content-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update User' : 'Create User'
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

export default UserForm;
