/**
 * UserModal Component
 * Create and edit user with role assignment
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import userService from '../services/userService';
import sidebarMenuConfigService from '../services/sidebarMenuConfigService';
import SIDEBAR_ITEMS from '../config/sidebarItemRegistry';
import { useAuth } from '../contexts/AuthContext';
import useEmailCheck from '../hooks/useEmailCheck';

// Password strength validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

// Validation schemas - will be created dynamically with translations
const createUserSchema = (t) => yup.object().shape({
  username: yup.string()
    .required(t('forms.required'))
    .min(3, t('forms.minLength', { count: 3 }))
    .max(100, t('forms.maxLength', { count: 100 }))
    .matches(/^[a-zA-Z0-9_-]+$/, t('users.usernameInvalid')),
  email: yup.string()
    .required(t('forms.required'))
    .email(t('forms.invalidEmail')),
  password: yup.string()
    .required(t('forms.required'))
    .min(8, t('forms.minLength', { count: 8 }))
    .matches(passwordRegex, t('users.passwordRequirements')),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], t('users.passwordsMustMatch'))
    .required(t('forms.required')),
  role_id: yup.string().required(t('forms.required')),
  first_name: yup.string().required(t('forms.required')).max(100, t('forms.maxLength', { count: 100 })),
  last_name: yup.string().required(t('forms.required')).max(100, t('forms.maxLength', { count: 100 })),
  phone: yup.string().max(20),
  language_preference: yup.string().oneOf(['fr', 'en'], t('users.languageInvalid')).default('fr')
});

const editUserSchema = (t) => yup.object().shape({
  email: yup.string()
    .required(t('forms.required'))
    .email(t('forms.invalidEmail')),
  role_id: yup.string().required(t('forms.required')),
  first_name: yup.string().required(t('forms.required')).max(100, t('forms.maxLength', { count: 100 })),
  last_name: yup.string().required(t('forms.required')).max(100, t('forms.maxLength', { count: 100 })),
  phone: yup.string().max(20),
  is_active: yup.boolean(),
  language_preference: yup.string().oneOf(['fr', 'en'], t('users.languageInvalid')),
  home_page: yup.string()
});

const UserModal = ({ show, onHide, mode, user, roles, onSave }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';
  const { user: currentUser } = useAuth();
  const currentRole = typeof currentUser?.role === 'string' ? currentUser.role : currentUser?.role?.name;
  const canSetHomePage = currentRole === 'ADMIN' && (isEditMode || isViewMode);
  const [menuConfigs, setMenuConfigs] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(isCreateMode ? createUserSchema(t) : editUserSchema(t))
  });

  const password = watch('password');
  const email = watch('email');

  // Email availability check with debouncing
  const { checking: checkingEmail, available: emailAvailable, error: emailCheckError } = useEmailCheck(
    email,
    'user',
    isEditMode ? user?.id : null,
    500
  );

  useEffect(() => {
    if (show) {
      if (user && (isEditMode || isViewMode)) {
        reset({
          email: user.email,
          role_id: user.role_id,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone || '',
          is_active: user.is_active,
          language_preference: user.language_preference || 'fr',
          home_page: user.home_page || ''
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
  }, [show, user, reset, isEditMode, isViewMode]);

  // Menu entries available as home page (admin only)
  useEffect(() => {
    if (!show || !canSetHomePage) return;
    sidebarMenuConfigService.getAllConfigs()
      .then(configs => setMenuConfigs((Array.isArray(configs) ? configs : [])
        .filter(c => SIDEBAR_ITEMS[c.item_key])
        .sort((a, b) => (a.section === b.section ? a.display_order - b.display_order : a.section.localeCompare(b.section)))))
      .catch(err => console.error('Error fetching menu entries:', err));
  }, [show, canSetHomePage]);

  // Options arrive after the form reset: re-apply the saved value once they exist
  useEffect(() => {
    if (menuConfigs.length > 0 && user) {
      setValue('home_page', user.home_page || '');
    }
  }, [menuConfigs, user, setValue]);

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

      if (isCreateMode) {
        const { confirmPassword, ...userData } = data;
        const response = await userService.createUser(userData);
        onSave(response.data);
      } else {
        const { home_page: homePage, ...rest } = data;
        const payload = canSetHomePage ? { ...rest, home_page: homePage || null } : rest;
        const response = await userService.updateUser(user.id, payload);
        onSave(response.data);
      }

      onHide();
    } catch (err) {
      console.error('🔥 Error saving user:', err);
      console.error('🔥 Full response:', err.response?.data);
      setError(err.response?.data?.error || t('errors.failedToSaveUser'));
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
    <Modal show={show} onHide={onHide} size="xl" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {isCreateMode ? `👤 ${t('users.createUser')}` : isViewMode ? `👤 ${t('users.viewUser', 'View User')}` : `👤 ${t('users.editUser')}`}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <h5 className="mb-3">{t('users.accountInfo')}</h5>
          <Row>
            {isCreateMode && (
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.username')} *</Form.Label>
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

            {(isEditMode || isViewMode) && user && (
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.username')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={user.username}
                    disabled
                    readOnly
                  />
                  {!isViewMode && <Form.Text className="text-muted">{t('users.usernameCannotBeChanged')}</Form.Text>}
                </Form.Group>
              </Col>
            )}

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.email')} {!isViewMode && '*'}</Form.Label>
                <Form.Control
                  type="email"
                  {...register('email')}
                  isInvalid={!isViewMode && (!!errors.email || (email && emailAvailable === false))}
                  isValid={!isViewMode && email && emailAvailable === true && !errors.email}
                  placeholder="user@example.com"
                  disabled={isViewMode}
                />
                {errors.email && (
                  <Form.Control.Feedback type="invalid">{errors.email.message}</Form.Control.Feedback>
                )}
                {!errors.email && checkingEmail && email && (
                  <Form.Text className="text-muted">
                    <Spinner animation="border" size="sm" className="me-1" />
                    {t('users.checkingEmail', 'Checking email availability...')}
                  </Form.Text>
                )}
                {!errors.email && emailAvailable === false && email && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {t('users.emailTaken', 'This email is already used by another user')}
                  </Form.Control.Feedback>
                )}
                {!errors.email && emailAvailable === true && email && (
                  <Form.Control.Feedback type="valid" style={{ display: 'block' }}>
                    {t('users.emailAvailable', 'Email is available')}
                  </Form.Control.Feedback>
                )}
                {emailCheckError && (
                  <Form.Text className="text-danger">{emailCheckError}</Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.role')} {!isViewMode && '*'}</Form.Label>
                <Form.Select
                  {...register('role_id')}
                  isInvalid={!isViewMode && !!errors.role_id}
                  disabled={isViewMode}
                >
                  <option value="">{t('users.selectRole')}</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </Form.Select>
                {!isViewMode && <Form.Control.Feedback type="invalid">{errors.role_id?.message}</Form.Control.Feedback>}
                {watch('role_id') && (
                  <div className="mt-2">
                    {isViewMode ? '' : 'Selected: '}{getRoleBadge(watch('role_id'))}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {isCreateMode && (
            <>
              <h5 className="mb-3 mt-3">{t('common.password')}</h5>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('common.password')} *</Form.Label>
                    <Form.Control
                      type="password"
                      {...register('password')}
                      isInvalid={!!errors.password}
                      placeholder="Enter secure password"
                    />
                    <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
                    {passwordStrength && (
                      <div className="mt-2">
                        <Badge bg={passwordStrength.variant}>{t('users.passwordStrength')}: {passwordStrength.label}</Badge>
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('users.confirmPassword')} *</Form.Label>
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
                <strong>{t('users.passwordRequirementsTitle')}:</strong>
                <ul className="mb-0 mt-2">
                  <li>{t('users.passwordReqLength')}</li>
                  <li>{t('users.passwordReqUppercase')}</li>
                  <li>{t('users.passwordReqLowercase')}</li>
                  <li>{t('users.passwordReqNumber')}</li>
                  <li>{t('users.passwordReqSpecial')}</li>
                </ul>
              </Alert>
            </>
          )}

          <h5 className="mb-3 mt-3">{t('users.personalInfo')}</h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.firstName')} {!isViewMode && '*'}</Form.Label>
                <Form.Control
                  type="text"
                  {...register('first_name')}
                  isInvalid={!isViewMode && !!errors.first_name}
                  placeholder="John"
                  disabled={isViewMode}
                />
                {!isViewMode && <Form.Control.Feedback type="invalid">{errors.first_name?.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.lastName')} {!isViewMode && '*'}</Form.Label>
                <Form.Control
                  type="text"
                  {...register('last_name')}
                  isInvalid={!isViewMode && !!errors.last_name}
                  placeholder="Doe"
                  disabled={isViewMode}
                />
                {!isViewMode && <Form.Control.Feedback type="invalid">{errors.last_name?.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.phone')}</Form.Label>
                <Form.Control
                  type="tel"
                  {...register('phone')}
                  isInvalid={!isViewMode && !!errors.phone}
                  placeholder="+1-555-123-4567"
                  disabled={isViewMode}
                />
                {!isViewMode && <Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('users.languagePreference')} {!isViewMode && '*'}</Form.Label>
                <Form.Select
                  {...register('language_preference')}
                  isInvalid={!isViewMode && !!errors.language_preference}
                  defaultValue="fr"
                  disabled={isViewMode}
                >
                  <option value="fr">🇫🇷 French</option>
                  <option value="en">🇬🇧 English</option>
                </Form.Select>
                {!isViewMode && <Form.Control.Feedback type="invalid">{errors.language_preference?.message}</Form.Control.Feedback>}
                {!isViewMode && (
                  <Form.Text className="text-muted">
                    Preferred language for the user interface
                  </Form.Text>
                )}
              </Form.Group>
            </Col>

            {(isEditMode || isViewMode) && (
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('users.accountStatus')}</Form.Label>
                  <Form.Check
                    type="switch"
                    id="is_active"
                    label="Active"
                    {...register('is_active')}
                    disabled={isViewMode}
                  />
                  {!isViewMode && (
                    <Form.Text className="text-muted">
                      Inactive users cannot log in
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            )}

            {canSetHomePage && (
              <Col md={6}>
                <Form.Group className="mb-3" controlId="user-home-page">
                  <Form.Label>{t('users.homePage', 'Home page after login')}</Form.Label>
                  <Form.Select {...register('home_page')} disabled={isViewMode}>
                    <option value="">{t('users.homePageFromRole', 'Same as the role')}</option>
                    {menuConfigs.map(config => {
                      const reg = SIDEBAR_ITEMS[config.item_key];
                      return (
                        <option key={config.item_key} value={config.item_key}>
                          {`${reg.icon} ${t(reg.labelKey, config.item_key)}`}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {!isViewMode && (
                    <Form.Text className="text-muted">
                      {t('users.homePageHint', 'Ignored if the page is not in the menu of this user\'s role.')}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            )}
          </Row>

          {(isEditMode || isViewMode) && user && (
            <>
              <h5 className="mb-3 mt-3">{t('users.activity')}</h5>
              <Row>
                <Col md={4}>
                  <strong>{t('users.lastLogin')}:</strong>
                  <p>{user.last_login ? new Date(user.last_login).toLocaleString() : t('users.never')}</p>
                </Col>
                <Col md={4}>
                  <strong>{t('users.failedAttempts')}:</strong>
                  <p>
                    {user.failed_login_attempts > 0 ? (
                      <Badge bg="warning">{user.failed_login_attempts}</Badge>
                    ) : (
                      '0'
                    )}
                  </p>
                </Col>
                <Col md={4}>
                  <strong>{t('users.lockedUntil')}:</strong>
                  <p>
                    {user.locked_until && new Date(user.locked_until) > new Date() ? (
                      <Badge bg="danger">{new Date(user.locked_until).toLocaleString()}</Badge>
                    ) : (
                      t('users.notLocked')
                    )}
                  </p>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {isViewMode ? t('common.close') : t('common.cancel')}
          </Button>
          {!isViewMode && (
            <Button
              variant="primary"
              type="submit"
              disabled={loading || checkingEmail || (email && emailAvailable === false)}
            >
              {loading ? <Spinner animation="border" size="sm" /> : (isCreateMode ? t('users.createUser') : t('users.editUser'))}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default UserModal;
