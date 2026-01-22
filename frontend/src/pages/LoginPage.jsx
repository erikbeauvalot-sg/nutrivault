/**
 * Login Page Component
 * Authentication form with username/password and "Remember Me"
 * Implements route prefetching for better UX (US-9.2)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import usePrefetchRoutes from '../hooks/usePrefetchRoutes';
import './LoginPage.css';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefetch critical routes while user is on login page (US-9.2)
  usePrefetchRoutes(true);

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
      setError(err.error || t('auth.invalidCredentials'));
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
                  <Form.Label>{t('auth.username')}</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={t('auth.username')}
                    {...register('username', {
                      required: t('forms.required'),
                      minLength: {
                        value: 3,
                        message: t('forms.minLength', { count: 3 }),
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
                  <Form.Label>{t('auth.password')}</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder={t('auth.password')}
                    {...register('password', {
                      required: t('forms.required'),
                      minLength: {
                        value: 8,
                        message: t('forms.minLength', { count: 8 }),
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
                    label={t('auth.rememberMe')}
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
                      {t('auth.loginButton')}
                    </>
                  ) : (
                    t('auth.loginButton')
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
