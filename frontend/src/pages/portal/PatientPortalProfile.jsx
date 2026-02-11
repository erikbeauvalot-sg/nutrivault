/**
 * Patient Portal Profile Page
 * View/edit profile, change password, select theme
 */

import { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FiShield, FiLogOut, FiSun } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as portalService from '../../services/portalService';
import useBiometricAuth from '../../hooks/useBiometricAuth';
import * as tokenStorage from '../../utils/tokenStorage';
import { isNative } from '../../utils/platform';
import NotificationPreferences from '../../components/NotificationPreferences';

const PatientPortalProfile = () => {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { themes, currentTheme, setTheme } = useTheme();
  const { biometricAvailable, biometricName, biometricEnabled, enableBiometric, disableBiometric } = useBiometricAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('fr');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    if (isNative) {
      tokenStorage.clearTokens();
      tokenStorage.clearUser();
      logout().catch(() => {});
      window.location.replace('/login');
      return;
    }
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.href = '/login';
  };

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getProfile();
        setProfile(data);
        setPhone(data?.phone || '');
        setLanguage(data?.language_preference || 'fr');
      } catch (err) {
        toast.error(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await portalService.updateProfile({ phone, language_preference: language });
      toast.success(t('portal.profileUpdated', 'Profil mis à jour'));
    } catch (err) {
      toast.error(t('portal.updateError', 'Erreur lors de la mise à jour'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('portal.passwordMismatch', 'Les mots de passe ne correspondent pas'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('portal.passwordTooShort', 'Le mot de passe doit contenir au moins 8 caractères'));
      return;
    }
    try {
      setChangingPassword(true);
      await portalService.changePassword(currentPassword, newPassword);
      toast.success(t('portal.passwordChanged', 'Mot de passe modifié'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err?.response?.data?.error || t('portal.passwordError', 'Erreur lors du changement de mot de passe');
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)' }}>{'\uD83D\uDC64'} {t('portal.nav.profile', 'Mon profil')}</h2>

      <Row className="g-3">
        {/* Profile Info */}
        <Col xs={12} md={6}>
          <Card>
            <Card.Header>{t('portal.personalInfo', 'Informations personnelles')}</Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>{t('portal.name', 'Nom')} :</strong>{' '}
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="mb-3">
                <strong>{t('portal.email', 'Email')} :</strong>{' '}
                {profile?.email}
              </div>
              <div className="mb-3">
                <strong>{t('portal.portalSince', 'Portail activé le')} :</strong>{' '}
                {profile?.portal_activated_at
                  ? new Date(profile.portal_activated_at).toLocaleDateString('fr-FR')
                  : '—'}
              </div>

              <hr />

              <Form onSubmit={handleUpdateProfile}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.phone', 'Téléphone')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.language', 'Langue')}</Form.Label>
                  <Form.Select value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </Form.Select>
                </Form.Group>

                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" animation="border" /> : t('common.save', 'Enregistrer')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Change Password */}
        <Col xs={12} md={6}>
          <Card>
            <Card.Header>{t('portal.changePassword', 'Changer le mot de passe')}</Card.Header>
            <Card.Body>
              <Form onSubmit={handleChangePassword}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.currentPassword', 'Mot de passe actuel')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.newPassword', 'Nouveau mot de passe')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Form.Text className="text-muted">
                    {t('portal.passwordMinLength', 'Minimum 8 caractères')}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('portal.confirmPassword', 'Confirmer le mot de passe')}</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </Form.Group>

                <Button type="submit" variant="warning" disabled={changingPassword}>
                  {changingPassword ? <Spinner size="sm" animation="border" /> : t('portal.changePassword', 'Changer le mot de passe')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        {/* Notification Preferences (native only) */}
        <Col xs={12}>
          <NotificationPreferences />
        </Col>

        {/* Security — Biometric (native only) */}
        {biometricAvailable && (
          <Col xs={12}>
            <Card>
              <Card.Header>
                <FiShield className="me-2" />
                {t('portal.security', 'Security')}
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <strong>{biometricName}</strong>
                    <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                      {t('portal.biometricDescription', { type: biometricName }, `Quickly unlock the app with ${biometricName}`)}
                    </p>
                  </div>
                  <Form.Check
                    type="switch"
                    id="biometric-toggle"
                    checked={biometricEnabled}
                    onChange={async (e) => {
                      if (e.target.checked) {
                        const refreshToken = tokenStorage.getRefreshToken();
                        if (refreshToken && user?.username) {
                          await enableBiometric(user.username, refreshToken);
                          toast.success(t('portal.biometricEnabled', { type: biometricName }, `${biometricName} enabled`));
                        }
                      } else {
                        await disableBiometric();
                        toast.success(t('portal.biometricDisabled', { type: biometricName }, `${biometricName} disabled`));
                      }
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Appearance — Theme (native: replaces navbar ThemeSelector) */}
        {themes && themes.length > 0 && (
          <Col xs={12}>
            <Card>
              <Card.Header>
                <FiSun className="me-2" />
                {t('portal.appearance', 'Apparence')}
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Label>{t('portal.theme', 'Thème')}</Form.Label>
                  <Form.Select
                    value={currentTheme?.id || ''}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>{theme.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Logout button */}
        <Col xs={12}>
          <Button
            variant="danger"
            size="lg"
            className="w-100"
            onClick={handleLogout}
          >
            <FiLogOut className="me-2" />
            {t('navigation.logout')}
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default PatientPortalProfile;
