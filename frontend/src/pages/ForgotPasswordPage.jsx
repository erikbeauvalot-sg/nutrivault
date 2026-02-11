/**
 * Forgot Password Page
 * Public page for requesting a password reset email
 * Reuses LoginPage CSS for consistent solarpunk aesthetic
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as authService from '../services/authService';
import './LoginPage.css';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) return;

    try {
      setLoading(true);
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.error || t('auth.resetRequestError', 'Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      setLoading(false);
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
              <p className="login-brand-subtitle">{t('auth.forgotPassword', 'Mot de passe oublié ?')}</p>
            </div>

            <hr className="login-separator" />

            {sent ? (
              <div className="text-center">
                <Alert variant="success" style={{
                  background: 'rgba(74, 124, 37, 0.15)',
                  border: '1px solid rgba(74, 124, 37, 0.3)',
                  borderRadius: '0.75rem',
                  color: '#a8c490'
                }}>
                  {t('auth.resetEmailSent', 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions de réinitialisation.')}
                </Alert>
                <Link to="/login" className="login-btn btn btn-lg w-100 mt-3 d-inline-flex align-items-center justify-content-center" style={{ textDecoration: 'none' }}>
                  {t('auth.backToLogin', 'Retour à la connexion')}
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <p style={{ color: 'rgba(232, 223, 196, 0.6)', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 200 }}>
                  {t('auth.forgotPasswordDescription', 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.')}
                </p>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4" controlId="email">
                    <Form.Label>{t('auth.email', 'Email')}</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder={t('auth.emailPlaceholder', 'votre@email.com')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 login-btn"
                    size="lg"
                    disabled={loading || !email.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {t('auth.sendResetLink', 'Envoyer le lien')}
                      </>
                    ) : (
                      t('auth.sendResetLink', 'Envoyer le lien')
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-3">
                  <Link to="/login" style={{ color: 'rgba(196, 164, 52, 0.6)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    {t('auth.backToLogin', 'Retour à la connexion')}
                  </Link>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
