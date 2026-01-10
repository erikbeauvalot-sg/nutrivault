/**
 * UserModal Component
 * Create and edit user with role assignment
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import userService from '../services/userService';

// Password strength validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

// Validation schemas
const createUserSchema = yup.object().shape({
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must be at most 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),
  email: yup.string()
    .required('Email is required')
    .email('Must be a valid email'),
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  role_id: yup.string().required('Role is required'),
  first_name: yup.string().required('First name is required').max(100),
  last_name: yup.string().required('Last name is required').max(100),
  phone: yup.string().max(20),
  language_preference: yup.string().oneOf(['fr', 'en'], 'Language must be either French or English').default('fr')
});

const editUserSchema = yup.object().shape({
  email: yup.string()
    .required('Email is required')
    .email('Must be a valid email'),
  role_id: yup.string().required('Role is required'),
  first_name: yup.string().required('First name is required').max(100),
  last_name: yup.string().required('Last name is required').max(100),
  phone: yup.string().max(20),
  is_active: yup.boolean(),
  language_preference: yup.string().oneOf(['fr', 'en'], 'Language must be either French or English')
});

const UserModal = ({ show, onHide, mode, user, roles, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: yupResolver(isCreateMode ? createUserSchema : editUserSchema)
  });

  const password = watch('password');

  useEffect(() => {
    if (show) {
      if (user && isEditMode) {
        reset({
          email: user.email,
          role_id: user.role_id,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || '',
          is_active: user.is_active,
          language_preference: user.language_preference || 'fr'
        });
      } else {
        reset({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          role_id: '',
          first_name: '',
          last_name: '',
          phone: '',
          is_active: true,
          language_preference: 'fr'
        });
      }
    }
  }, [show, user, reset, isEditMode]);

  useEffect(() => {
    if (isCreateMode && password) {
      calculatePasswordStrength(password);
    }
  }, [password, isCreateMode]);

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[@$!%*?&#]/.test(pwd)) strength++;

    if (strength <= 2) setPasswordStrength({ label: 'Weak', variant: 'danger' });
    else if (strength <= 4) setPasswordStrength({ label: 'Medium', variant: 'warning' });
    else setPasswordStrength({ label: 'Strong', variant: 'success' });
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Submitting user data:', data);

      if (isCreateMode) {
        const { confirmPassword, ...userData } = data;
        console.log('🆕 Creating user with:', userData);
        const response = await userService.createUser(userData);
        console.log('✅ User created:', response.data);
        onSave(response.data);
      } else {
        console.log('✏️ Updating user with:', data);
        const response = await userService.updateUser(user.id, data);
        console.log('✅ User updated:', response.data);
        onSave(response.data);
      }

      onHide();
    } catch (err) {
      console.error('🔥 Error saving user:', err);
      console.error('🔥 Full response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return null;

    const variants = {
      ADMIN: 'danger',
      DIETITIAN: 'primary',
      ASSISTANT: 'info',
      VIEWER: 'secondary'
    };

    return <Badge bg={variants[role.name] || 'secondary'}>{role.name}</Badge>;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode ? '👤 Create User' : '👤 Edit User'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <h5 className="mb-3">Account Information</h5>
          <Row>
            {isCreateMode && (
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control
                    type="text"
                    {...register('username')}
                    isInvalid={!!errors.username}
                    placeholder="e.g., john.doe"
                  />
                  <Form.Text className="text-muted">
                    3-100 characters, letters, numbers, underscore, and hyphen only
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            )}

            {isEditMode && user && (
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={user.username}
                    disabled
                    readOnly
                  />
                  <Form.Text className="text-muted">Username cannot be changed</Form.Text>
                </Form.Group>
              </Col>
            )}

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  {...register('email')}
                  isInvalid={!!errors.email}
                  placeholder="user@example.com"
                />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Role *</Form.Label>
                <Form.Select
                  {...register('role_id')}
                  isInvalid={!!errors.role_id}
                >
                  <option value="">Select role...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.role_id?.message}</Form.Control.Feedback>
                {watch('role_id') && (
                  <div className="mt-2">
                    Selected: {getRoleBadge(watch('role_id'))}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {isCreateMode && (
            <>
              <h5 className="mb-3 mt-3">Password</h5>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control
                      type="password"
                      {...register('password')}
                      isInvalid={!!errors.password}
                      placeholder="Enter secure password"
                    />
                    <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
                    {passwordStrength && (
                      <div className="mt-2">
                        <Badge bg={passwordStrength.variant}>Strength: {passwordStrength.label}</Badge>
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password *</Form.Label>
                    <Form.Control
                      type="password"
                      {...register('confirmPassword')}
                      isInvalid={!!errors.confirmPassword}
                      placeholder="Re-enter password"
                    />
                    <Form.Control.Feedback type="invalid">{errors.confirmPassword?.message}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Alert variant="info" className="mb-3">
                <strong>Password Requirements:</strong>
                <ul className="mb-0 mt-2">
                  <li>At least 8 characters long</li>
                  <li>Contains at least one uppercase letter (A-Z)</li>
                  <li>Contains at least one lowercase letter (a-z)</li>
                  <li>Contains at least one number (0-9)</li>
                  <li>Contains at least one special character (@$!%*?&#)</li>
                </ul>
              </Alert>
            </>
          )}

          <h5 className="mb-3 mt-3">Personal Information</h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>First Name *</Form.Label>
                <Form.Control
                  type="text"
                  {...register('first_name')}
                  isInvalid={!!errors.first_name}
                  placeholder="John"
                />
                <Form.Control.Feedback type="invalid">{errors.first_name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Last Name *</Form.Label>
                <Form.Control
                  type="text"
                  {...register('last_name')}
                  isInvalid={!!errors.last_name}
                  placeholder="Doe"
                />
                <Form.Control.Feedback type="invalid">{errors.last_name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="tel"
                  {...register('phone')}
                  isInvalid={!!errors.phone}
                  placeholder="+1-555-123-4567"
                />
                <Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Language Preference *</Form.Label>
                <Form.Select
                  {...register('language_preference')}
                  isInvalid={!!errors.language_preference}
                  defaultValue="fr"
                >
                  <option value="fr">🇫🇷 French</option>
                  <option value="en">🇬🇧 English</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.language_preference?.message}</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Preferred language for the user interface
                </Form.Text>
              </Form.Group>
            </Col>

            {isEditMode && (
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Account Status</Form.Label>
                  <Form.Check
                    type="switch"
                    id="is_active"
                    label="Active"
                    {...register('is_active')}
                  />
                  <Form.Text className="text-muted">
                    Inactive users cannot log in
                  </Form.Text>
                </Form.Group>
              </Col>
            )}
          </Row>

          {isEditMode && user && (
            <>
              <h5 className="mb-3 mt-3">Activity</h5>
              <Row>
                <Col md={4}>
                  <strong>Last Login:</strong>
                  <p>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</p>
                </Col>
                <Col md={4}>
                  <strong>Failed Attempts:</strong>
                  <p>
                    {user.failed_login_attempts > 0 ? (
                      <Badge bg="warning">{user.failed_login_attempts}</Badge>
                    ) : (
                      '0'
                    )}
                  </p>
                </Col>
                <Col md={4}>
                  <strong>Locked Until:</strong>
                  <p>
                    {user.locked_until && new Date(user.locked_until) > new Date() ? (
                      <Badge bg="danger">{new Date(user.locked_until).toLocaleString()}</Badge>
                    ) : (
                      'Not locked'
                    )}
                  </p>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : (isCreateMode ? 'Create User' : 'Update User')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default UserModal;
