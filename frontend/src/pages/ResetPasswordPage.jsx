/**
 * Reset Password Page
 * Public page for setting a new password using a reset token
 * Reuses LoginPage CSS for consistent solarpunk aesthetic
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as authService from '../services/authService';
import './LoginPage.css';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'Le mot de passe doit contenir au moins 8 caractères'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Les mots de passe ne correspondent pas'));
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const msg = err?.error || t('auth.invalidResetToken', 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <Card className="login-card">
            <Card.Body className="p-5 text-center">
              <div className="login-brand-icon">{'\uD83C\uDF31'}</div>
              <h2 className="login-brand-title" style={{ fontSize: '1.5rem' }}>NutriVault</h2>
              <hr className="login-separator" />
              <Alert variant="danger">
                {t('auth.invalidResetToken', 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.')}
              </Alert>
              <Link to="/forgot-password" className="login-btn btn btn-lg w-100 d-inline-flex align-items-center justify-content-center" style={{ textDecoration: 'none' }}>
                {t('auth.requestNewLink', 'Demander un nouveau lien')}
              </Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <Card className="login-card">
            <Card.Body className="p-5 text-center">
              <div className="login-brand-icon">{'\uD83C\uDF31'}</div>
              <h2 className="login-brand-title" style={{ fontSize: '1.5rem' }}>NutriVault</h2>
              <hr className="login-separator" />
              <Alert variant="success" style={{
                background: 'rgba(74, 124, 37, 0.15)',
                border: '1px solid rgba(74, 124, 37, 0.3)',
                borderRadius: '0.75rem',
                color: '#a8c490'
              }}>
                {t('auth.passwordResetSuccess', 'Mot de passe réinitialisé avec succès !')}
              </Alert>
              <Link to="/login" className="login-btn btn btn-lg w-100 d-inline-flex align-items-center justify-content-center" style={{ textDecoration: 'none' }}>
                {t('auth.backToLogin', 'Retour à la connexion')}
              </Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="login-page">
      <div className="login-wrapper">
        <Card className="login-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <div className="login-brand-icon">{'\uD83C\uDF31'}</div>
              <h2 className="login-brand-title">NutriVault</h2>
              <p className="login-brand-subtitle">{t('auth.resetPassword', 'Réinitialiser le mot de passe')}</p>
            </div>

            <hr className="login-separator" />

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>{t('auth.newPassword', 'Nouveau mot de passe')}</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder', 'Minimum 8 caractères')}
                  required
                  minLength={8}
                  disabled={loading}
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="confirmPassword">
                <Form.Label>{t('auth.confirmPassword', 'Confirmer le mot de passe')}</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder', 'Retapez le mot de passe')}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </Form.Group>

              <Button
                type="submit"
                className="w-100 login-btn"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {t('auth.resetPassword', 'Réinitialiser le mot de passe')}
                  </>
                ) : (
                  t('auth.resetPassword', 'Réinitialiser le mot de passe')
                )}
              </Button>
            </Form>

            <div className="text-center mt-3">
              <Link to="/login" style={{ color: 'rgba(196, 164, 52, 0.6)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                {t('auth.backToLogin', 'Retour à la connexion')}
              </Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
