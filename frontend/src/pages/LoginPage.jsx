/**
 * Login Page Component
 * Authentication form with username/password and "Remember Me"
 * Implements route prefetching for better UX (US-9.2)
 * Supports biometric setup prompt after first login on native
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import usePrefetchRoutes from '../hooks/usePrefetchRoutes';
import useBiometricAuth from '../hooks/useBiometricAuth';
import BiometricSetupPrompt from '../components/BiometricSetupPrompt';
import * as biometricService from '../services/biometricService';
import * as tokenStorage from '../utils/tokenStorage';
import { isNative } from '../utils/platform';
import './LoginPage.css';

const LAST_USERNAME_KEY = 'nutrivault_last_username';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Biometric state
  const { biometricAvailable, biometricName, biometricEnabled, enableBiometric } = useBiometricAuth();
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  // Prefetch critical routes while user is on login page (US-9.2)
  usePrefetchRoutes(true);

  // On native, pre-fill last username and always remember session
  const savedUsername = isNative ? localStorage.getItem(LAST_USERNAME_KEY) || '' : '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: savedUsername,
      rememberMe: isNative ? true : false,
    },
  });

  const navigateAfterLogin = (userData) => {
    const roleName = typeof userData?.role === 'string' ? userData.role : userData?.role?.name;
    if (roleName === 'PATIENT') {
      navigate('/portal');
    } else {
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      // On native, always persist the session
      const rememberMe = isNative ? true : data.rememberMe;
      const userData = await login(data.username, data.password, rememberMe);

      // Save last username on native for pre-fill
      if (isNative) {
        localStorage.setItem(LAST_USERNAME_KEY, data.username);
      }

      // If biometric is already enabled, silently update Keychain with new refresh token
      if (biometricEnabled) {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          await biometricService.saveCredentials(data.username, refreshToken);
        }
        navigateAfterLogin(userData);
        return;
      }

      // If biometric available, not yet enabled, and user hasn't said "don't ask"
      if (biometricAvailable && !biometricService.isBiometricEnabled() && !biometricService.isDontAskAgain()) {
        setPendingLoginData({ username: data.username, userData });
        setShowBiometricPrompt(true);
        return;
      }

      navigateAfterLogin(userData);
    } catch (err) {
      setError(err.error || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (pendingLoginData) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        await enableBiometric(pendingLoginData.username, refreshToken);
      }
      setShowBiometricPrompt(false);
      navigateAfterLogin(pendingLoginData.userData);
      setPendingLoginData(null);
    }
  };

  const handleSkipBiometric = () => {
    setShowBiometricPrompt(false);
    if (pendingLoginData) {
      navigateAfterLogin(pendingLoginData.userData);
      setPendingLoginData(null);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <Card className="login-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <div className="login-brand-icon">{'\uD83C\uDF31'}</div>
              <h2 className="login-brand-title">NutriVault</h2>
              <p className="login-brand-subtitle">{t('app.subtitle', 'Nutrition Practice Management')}</p>
            </div>

            <hr className="login-separator" />

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>{t('auth.usernameOrEmail', 'Nom d\'utilisateur ou email')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('auth.usernameOrEmail', 'Nom d\'utilisateur ou email')}
                  autoCapitalize="none"
                  autoCorrect="off"
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

              {/* On native, session is always persisted — hide checkbox */}
              {!isNative && (
                <Form.Group className="mb-4" controlId="rememberMe">
                  <Form.Check
                    type="checkbox"
                    label={t('auth.rememberMe')}
                    {...register('rememberMe')}
                    disabled={loading}
                  />
                </Form.Group>
              )}

              <Button
                type="submit"
                className="w-100 login-btn"
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
          </Card.Body>
        </Card>
      </div>

      <BiometricSetupPrompt
        show={showBiometricPrompt}
        biometricName={biometricName}
        onEnable={handleEnableBiometric}
        onSkip={handleSkipBiometric}
      />
    </div>
  );
};

export default LoginPage;
