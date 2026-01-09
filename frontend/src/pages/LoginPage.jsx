/**
 * Login Page Component
 * Authentication form with username/password and "Remember Me"
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      await login(data.username, data.password, data.rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Container>
        <div className="login-wrapper">
          <Card className="login-card shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h1 className="display-4">🏥</h1>
                <h2 className="mb-2">NutriVault</h2>
                <p className="text-muted">Nutrition Practice Management</p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter username"
                    {...register('username', {
                      required: 'Username is required',
                      minLength: {
                        value: 3,
                        message: 'Username must be at least 3 characters',
                      },
                    })}
                    isInvalid={!!errors.username}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    isInvalid={!!errors.password}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4" controlId="rememberMe">
                  <Form.Check
                    type="checkbox"
                    label="Remember me"
                    {...register('rememberMe')}
                    disabled={loading}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <small className="text-muted">
                  Default credentials: admin / Admin123!
                </small>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default LoginPage;
