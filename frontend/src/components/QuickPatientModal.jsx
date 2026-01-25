/**
 * QuickPatientModal Component
 * Simplified patient creation modal for rapid workflow
 * Only requires essential fields - details can be completed later
 */

import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as patientService from '../services/patientService';
import useEmailCheck from '../hooks/useEmailCheck';

const QuickPatientModal = ({ show, onHide, onSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Email availability check with debouncing
  const { checking: checkingEmail, available: emailAvailable, error: emailCheckError } = useEmailCheck(
    formData.email,
    'patient',
    null,
    500
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    // First name and last name are required
    if (!formData.first_name.trim()) {
      setError(t('patients.firstNameRequired', 'First name is required'));
      return false;
    }

    if (!formData.last_name.trim()) {
      setError(t('patients.lastNameRequired', 'Last name is required'));
      return false;
    }

    // At least email OR phone is required
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError(t('patients.emailOrPhoneRequired', 'Email or phone number is required'));
      return false;
    }

    // Basic email validation if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('patients.invalidEmail', 'Invalid email format'));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Only send non-empty fields
      const patientData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() })
      };

      const response = await patientService.createPatient(patientData);

      // Success
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Reset form and close
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      });
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('patients.createError', 'Failed to create patient'));
      console.error('Error creating quick patient:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    });
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          ⚡ {t('patients.quickCreate', 'Quick Patient Creation')}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert variant="info" className="small mb-3">
            <i className="fas fa-info-circle me-2"></i>
            {t('patients.quickCreateInfo', 'Enter essential information only. Complete details can be added later.')}
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.firstName', 'First Name')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder={t('patients.firstNamePlaceholder', 'Enter first name')}
              autoFocus
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.lastName', 'Last Name')} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder={t('patients.lastNamePlaceholder', 'Enter last name')}
              disabled={loading}
              required
            />
          </Form.Group>

          <Alert variant="secondary" className="small mb-3">
            {t('patients.contactRequired', 'At least one contact method is required (email or phone)')}
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.email', 'Email')}
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('patients.emailPlaceholder', 'patient@example.com')}
              disabled={loading}
              isInvalid={formData.email && emailAvailable === false}
              isValid={formData.email && emailAvailable === true}
            />
            {checkingEmail && formData.email && (
              <Form.Text className="text-muted">
                <Spinner animation="border" size="sm" className="me-1" />
                {t('patients.checkingEmail', 'Checking email availability...')}
              </Form.Text>
            )}
            {emailAvailable === false && formData.email && (
              <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                {t('patients.emailTaken', 'This email is already used by another patient')}
              </Form.Control.Feedback>
            )}
            {emailAvailable === true && formData.email && (
              <Form.Control.Feedback type="valid" style={{ display: 'block' }}>
                {t('patients.emailAvailable', 'Email is available')}
              </Form.Control.Feedback>
            )}
            {emailCheckError && (
              <Form.Text className="text-danger">
                {emailCheckError}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {t('patients.phone', 'Phone Number')}
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('patients.phonePlaceholder', '+33 6 12 34 56 78')}
              disabled={loading}
            />
          </Form.Group>

          <Alert variant="success" className="small mb-0">
            <i className="fas fa-check-circle me-2"></i>
            {t('patients.quickCreateSuccess', 'Patient will be created instantly. You can complete additional details from their profile page.')}
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || checkingEmail || (formData.email && emailAvailable === false)}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('common.creating', 'Creating...')}
              </>
            ) : (
              <>
                ⚡ {t('patients.createQuick', 'Create Quick Patient')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default QuickPatientModal;
