/**
 * ChangePasswordModal Component
 * Password reset functionality for admin and self-service
 */

import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

// Password strength validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

// Validation schema - will be created dynamically with translations
const changePasswordSchema = (t, isAdmin) => yup.object().shape({
  oldPassword: yup.string().when('$isAdmin', {
    is: false,
    then: (schema) => schema.required(t('users.currentPasswordRequired')),
    otherwise: (schema) => schema.notRequired()
  }),
  newPassword: yup.string()
    .required(t('forms.required'))
    .min(8, t('forms.minLength', { count: 8 }))
    .matches(passwordRegex, t('users.passwordRequirements')),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword'), null], t('users.passwordsMustMatch'))
    .required(t('forms.required'))
});

const ChangePasswordModal = ({ show, onHide, userId, username, isAdmin, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const isSelfChange = currentUser.id === userId;
  const canBypassOldPassword = isAdmin && !isSelfChange;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: yupResolver(changePasswordSchema(t, canBypassOldPassword)),
    context: { isAdmin: canBypassOldPassword }
  });

  const newPassword = watch('newPassword');

  useState(() => {
    if (newPassword) {
      calculatePasswordStrength(newPassword);
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

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
      setSuccess(false);

      const passwordData = {
        newPassword: data.newPassword
      };

      // Only include old password if required (not admin resetting another user)
      if (!canBypassOldPassword) {
        passwordData.oldPassword = data.oldPassword;
      }

      await userService.changePassword(userId, passwordData);
      
      setSuccess(true);
      reset();
      
      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1500);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.error || t('errors.failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(false);
    setPasswordStrength(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>🔑 Change Password</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert variant="success">Password changed successfully!</Alert>}

          <Alert variant="info" className="mb-3">
            <strong>Changing password for:</strong> {username}
            {canBypassOldPassword && (
              <div className="mt-2">
                <Badge bg="warning">Admin Reset Mode</Badge>
                <p className="mb-0 mt-1 small">As an administrator, you can reset this password without knowing the current password.</p>
              </div>
            )}
          </Alert>

          {!canBypassOldPassword && (
            <Form.Group className="mb-3">
              <Form.Label>Current Password *</Form.Label>
              <Form.Control
                type="password"
                {...register('oldPassword')}
                isInvalid={!!errors.oldPassword}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <Form.Control.Feedback type="invalid">{errors.oldPassword?.message}</Form.Control.Feedback>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>New Password *</Form.Label>
            <Form.Control
              type="password"
              {...register('newPassword')}
              isInvalid={!!errors.newPassword}
              placeholder="Enter new password"
              autoComplete="new-password"
              onChange={(e) => calculatePasswordStrength(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{errors.newPassword?.message}</Form.Control.Feedback>
            {passwordStrength && (
              <div className="mt-2">
                <Badge bg={passwordStrength.variant}>Strength: {passwordStrength.label}</Badge>
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirm New Password *</Form.Label>
            <Form.Control
              type="password"
              {...register('confirmPassword')}
              isInvalid={!!errors.confirmPassword}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
            <Form.Control.Feedback type="invalid">{errors.confirmPassword?.message}</Form.Control.Feedback>
          </Form.Group>

          <Alert variant="secondary">
            <strong>Password Requirements:</strong>
            <ul className="mb-0 mt-2 small">
              <li>At least 8 characters long</li>
              <li>Contains at least one uppercase letter (A-Z)</li>
              <li>Contains at least one lowercase letter (a-z)</li>
              <li>Contains at least one number (0-9)</li>
              <li>Contains at least one special character (@$!%*?&#)</li>
            </ul>
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Change Password'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
