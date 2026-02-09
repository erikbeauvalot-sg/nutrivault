/**
 * Set Password Page
 * Public page for patients to set their password from invitation link
 */

import { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as portalService from '../../services/portalService';

const SetPasswordPage = () => {
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

    if (!token) {
      setError(t('portal.noToken', 'Lien invalide. Veuillez utiliser le lien reçu par email.'));
      return;
    }

    if (password.length < 8) {
      setError(t('portal.passwordTooShort', 'Le mot de passe doit contenir au moins 8 caractères'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('portal.passwordMismatch', 'Les mots de passe ne correspondent pas'));
      return;
    }

    try {
      setLoading(true);
      await portalService.setPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.error || t('portal.setPasswordError', 'Erreur lors de la définition du mot de passe');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Card style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="p-5 text-center">
            <div className="mb-3" style={{ fontSize: '3rem' }}>🌱</div>
            <h3>NutriVault</h3>
            <Alert variant="danger" className="mt-3">
              {t('portal.noToken', 'Lien invalide. Veuillez utiliser le lien reçu par email.')}
            </Alert>
            <Link to="/login" className="btn btn-outline-primary mt-2">
              {t('portal.goToLogin', 'Aller à la page de connexion')}
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Card style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="p-5 text-center">
            <div className="mb-3" style={{ fontSize: '3rem' }}>✅</div>
            <h3>{t('portal.passwordSetSuccess', 'Mot de passe défini !')}</h3>
            <p className="text-muted">
              {t('portal.canNowLogin', 'Vous pouvez maintenant vous connecter avec votre email.')}
            </p>
            <Link to="/login" className="btn btn-primary mt-2">
              {t('portal.goToLogin', 'Se connecter')}
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Card style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <div style={{ fontSize: '3rem' }}>🌱</div>
            <h3>NutriVault</h3>
            <p className="text-muted">{t('portal.setYourPassword', 'Définissez votre mot de passe')}</p>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('portal.newPassword', 'Nouveau mot de passe')}</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t('portal.passwordPlaceholder', 'Minimum 8 caractères')}
                disabled={loading}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>{t('portal.confirmPassword', 'Confirmer le mot de passe')}</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </Form.Group>

            <Button type="submit" className="w-100" size="lg" disabled={loading}>
              {loading ? (
                <Spinner size="sm" animation="border" />
              ) : (
                t('portal.setPasswordBtn', 'Définir mon mot de passe')
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SetPasswordPage;
