/**
 * Login Page
 * User authentication form
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Container, Form, Button, Alert, Card, Row, Col
} from 'react-bootstrap';
import useAuth from '../hooks/useAuth';
import '../styles/login.css';

// Validation schema
const validationSchema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: yup.boolean()
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, loading } = useAuth();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(validationSchema)
  });

  const onSubmit = async (data) => {
    setSubmitError(null);

    try {
      await login(data.username, data.password, data.rememberMe);

      // Redirect to dashboard or requested page
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    } catch (err) {
      setSubmitError(err.message || 'Login failed. Please try again.');
    }
  };

  const displayError = submitError || authError;

  return (
    <Container fluid className="login-container">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xs={12} sm={10} md={6} lg={5}>
          <Card className="login-card shadow-lg">
            <Card.Body className="p-5">
              {/* Logo/Branding */}
              <div className="text-center mb-4">
                <h1 className="login-title">NutriVault</h1>
                <p className="login-subtitle">Nutrition Practice Management</p>
              </div>

              {/* Error Alert */}
              {displayError && (
                <Alert variant="danger" dismissible onClose={() => setSubmitError(null)}>
                  <strong>Login Failed</strong>
                  {' '}
                  {displayError}
                </Alert>
              )}

              {/* Login Form */}
              <Form onSubmit={handleSubmit(onSubmit)}>
                {/* Username Field */}
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="username">Username</Form.Label>
                  <Form.Control
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    {...register('username')}
                    isInvalid={!!errors.username}
                    disabled={loading}
                    autoFocus
                  />
                  {errors.username && (
                    <Form.Control.Feedback type="invalid" className="d-block">
                      {errors.username.message}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                {/* Password Field */}
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="password">Password</Form.Label>
                  <Form.Control
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    {...register('password')}
                    isInvalid={!!errors.password}
                    disabled={loading}
                  />
                  {errors.password && (
                    <Form.Control.Feedback type="invalid" className="d-block">
                      {errors.password.message}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                {/* Remember Me Checkbox */}
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="rememberMe"
                    label="Remember me (keeps you logged in for 7 days)"
                    {...register('rememberMe')}
                    disabled={loading}
                  />
                </Form.Group>

                {/* Submit Button */}
                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 login-btn"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>

              {/* Footer Info */}
              <div className="text-center mt-4 text-muted small">
                <p>Demo credentials for testing:</p>
                <p>Username: admin | Password: (check your notes)</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginPage;
