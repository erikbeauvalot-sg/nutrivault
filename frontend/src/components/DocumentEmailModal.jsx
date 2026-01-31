/**
 * DocumentEmailModal Component
 * Modal for sending documents as email attachments to patients
 */

import { useState } from 'react';
import { Modal, Button, Form, Alert, Card, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';

const DocumentEmailModal = ({
  show,
  onHide,
  document,
  patients = [],
  onEmailSent
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [message, setMessage] = useState('');

  const handleSendEmail = async () => {
    if (!selectedPatientId) {
      setError(t('documentEmail.selectPatient', 'Please select a patient'));
      return;
    }

    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    if (!selectedPatient?.email) {
      setError(t('documentEmail.noEmail', 'Selected patient does not have an email address'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await documentService.sendDocumentByEmail(
        document.id,
        selectedPatientId,
        message || null
      );

      setSuccess(t('documentEmail.sent', 'Document sent successfully to {{email}}', { email: selectedPatient.email }));

      // Reset form
      setSelectedPatientId('');
      setMessage('');

      if (onEmailSent) {
        onEmailSent(response.data);
      }

      // Close modal after short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documentEmail.sendError', 'Failed to send email'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(null);
      setSelectedPatientId('');
      setMessage('');
      onHide();
    }
  };

  // Get selected patient for display
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Don't render if no document is selected
  if (!document) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{t('documentEmail.title', 'Send Document by Email')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        {/* Document Info */}
        <Card className="mb-3 bg-light">
          <Card.Body className="py-2">
            <div className="d-flex align-items-center">
              <span className="me-2">{documentService.getFileTypeIcon(document.mime_type)}</span>
              <div>
                <strong>{document.file_name}</strong>
                <br />
                <small className="text-muted">
                  {documentService.formatFileSize(document.file_size || 0)}
                </small>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Form.Group className="mb-3">
          <Form.Label>{t('documentEmail.selectPatient', 'Select Patient')} *</Form.Label>
          <Form.Select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={loading}
          >
            <option value="">{t('documentEmail.choosePatient', '-- Choose a patient --')}</option>
            {patients.map(patient => (
              <option
                key={patient.id}
                value={patient.id}
                disabled={!patient.email}
              >
                {patient.first_name} {patient.last_name}
                {patient.email ? ` (${patient.email})` : ` - ${t('documentEmail.noEmailShort', 'No email')}`}
              </option>
            ))}
          </Form.Select>
          {selectedPatient && !selectedPatient.email && (
            <Form.Text className="text-danger">
              {t('documentEmail.patientNoEmail', 'This patient does not have an email address configured.')}
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{t('documentEmail.message', 'Message')} ({t('common.optional')})</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('documentEmail.messagePlaceholder', 'Add a personal message to include in the email...')}
            maxLength={1000}
            disabled={loading}
          />
          <Form.Text className="text-muted">
            {message.length}/1000
          </Form.Text>
        </Form.Group>

        {selectedPatient?.email && (
          <Alert variant="info" className="mb-0">
            <small>
              {t('documentEmail.willSendTo', 'The document will be sent as an attachment to:')} <strong>{selectedPatient.email}</strong>
            </small>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSendEmail}
          disabled={loading || !selectedPatientId || !selectedPatient?.email}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('documentEmail.sending', 'Sending...')}
            </>
          ) : (
            <>
              {t('documentEmail.send', 'Send Email')}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentEmailModal;
