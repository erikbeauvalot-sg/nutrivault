/**
 * DocumentEmailModal Component
 * Modal for sending one or more documents as attachments of a single email to a patient
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Alert, Card, Spinner, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';

// Lowercase and strip accents so "eric" matches "Éric"
const normalize = (value) => (value || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const searchTerms = (value) => normalize(value).split(/\s+/).filter(Boolean);

// Every search term must appear in the patient's name or email
const matchesTerms = (patient, terms) => {
  const haystack = normalize(`${patient.last_name} ${patient.first_name} ${patient.email || ''}`);
  return terms.every(term => haystack.includes(term));
};

const comparePatients = (a, b) =>
  (a.last_name || '').localeCompare(b.last_name || '', undefined, { sensitivity: 'base' }) ||
  (a.first_name || '').localeCompare(b.first_name || '', undefined, { sensitivity: 'base' });

const DocumentEmailModal = ({
  show,
  onHide,
  documents = [],
  patients = [],
  defaultPatient = null,
  onEmailSent
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [message, setMessage] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Patients sorted by "Last name First name" and filtered by the search field
  const filteredPatients = useMemo(() => {
    const terms = searchTerms(patientSearch);
    return patients
      .filter(patient => matchesTerms(patient, terms))
      .sort(comparePatients);
  }, [patients, patientSearch]);

  // Keep the chosen patient visible in the list even if it no longer matches the search
  const patientOptions = useMemo(() => {
    const chosen = patients.find(p => p.id === selectedPatientId);
    if (chosen && !filteredPatients.includes(chosen)) {
      return [chosen, ...filteredPatients];
    }
    return filteredPatients;
  }, [patients, filteredPatients, selectedPatientId]);

  // Preselect the patient when the modal is opened from a patient context
  useEffect(() => {
    if (show && defaultPatient) {
      setSelectedPatientId(defaultPatient.id);
    }
  }, [show, defaultPatient]);

  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const tooManyDocuments = documents.length > documentService.MAX_EMAIL_DOCUMENTS;
  const tooLarge = totalSize > documentService.MAX_EMAIL_ATTACHMENTS_SIZE;
  const isMultiple = documents.length > 1;

  // Get selected patient for display
  const selectedPatient = defaultPatient && defaultPatient.id === selectedPatientId
    ? defaultPatient
    : patients.find(p => p.id === selectedPatientId);

  const handleSendEmail = async () => {
    if (!selectedPatientId) {
      setError(t('documentEmail.selectPatient', 'Please select a patient'));
      return;
    }

    if (!selectedPatient?.email) {
      setError(t('documentEmail.noEmail', 'Selected patient does not have an email address'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await documentService.sendDocumentsByEmail(
        documents.map(doc => doc.id),
        selectedPatientId,
        message || null
      );

      setSuccess(isMultiple
        ? t('documentEmail.sentMultiple', '{{count}} documents sent successfully to {{email}}', { count: documents.length, email: selectedPatient.email })
        : t('documentEmail.sent', 'Document sent successfully to {{email}}', { email: selectedPatient.email }));

      if (onEmailSent) {
        onEmailSent(response.data);
      }

      // Close modal after short delay
      setTimeout(() => {
        handleClose(true);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documentEmail.sendError', 'Failed to send email'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (force = false) => {
    if (force === true || !loading) {
      setError(null);
      setSuccess(null);
      setSelectedPatientId('');
      setMessage('');
      setPatientSearch('');
      onHide();
    }
  };

  // Don't render if no document is selected
  if (documents.length === 0) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isMultiple
            ? t('documentEmail.titleMultiple', 'Send {{count}} documents by email', { count: documents.length })
            : t('documentEmail.title', 'Send Document by Email')}
        </Modal.Title>
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

        {/* Documents Info */}
        <Card className="mb-3 bg-light">
          <ListGroup variant="flush" style={{ maxHeight: '12rem', overflowY: 'auto' }}>
            {documents.map(doc => (
              <ListGroup.Item key={doc.id} className="bg-light py-2">
                <div className="d-flex align-items-center">
                  <span className="me-2">{documentService.getFileTypeIcon(doc.mime_type)}</span>
                  <div className="text-truncate">
                    <strong>{doc.file_name}</strong>
                    <br />
                    <small className="text-muted">
                      {documentService.formatFileSize(doc.file_size || 0)}
                    </small>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
          {isMultiple && (
            <Card.Footer className="py-1 text-end">
              <small className="text-muted">
                {t('documentEmail.totalSize', 'Total: {{size}}', { size: documentService.formatFileSize(totalSize) })}
              </small>
            </Card.Footer>
          )}
        </Card>

        {tooManyDocuments && (
          <Alert variant="warning">
            {t('documentEmail.tooManyDocuments', 'You can send at most {{max}} documents in one email.', { max: documentService.MAX_EMAIL_DOCUMENTS })}
          </Alert>
        )}

        {tooLarge && (
          <Alert variant="warning">
            {t('documentEmail.tooLarge', 'Attachments exceed the {{max}} limit for one email. Remove some documents.', { max: documentService.formatFileSize(documentService.MAX_EMAIL_ATTACHMENTS_SIZE) })}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>{t('documentEmail.patient', 'Patient')} *</Form.Label>
          {defaultPatient ? (
            <Form.Control
              plaintext
              readOnly
              value={`${defaultPatient.first_name} ${defaultPatient.last_name}${defaultPatient.email ? ` (${defaultPatient.email})` : ''}`}
            />
          ) : (
            <>
            <Form.Control
              type="search"
              className="mb-2"
              value={patientSearch}
              onChange={(e) => {
                const value = e.target.value;
                setPatientSearch(value);
                // Auto-select when the search narrows down to a single patient with an email
                const terms = searchTerms(value);
                const matches = terms.length > 0 ? patients.filter(patient => matchesTerms(patient, terms)) : [];
                if (matches.length === 1 && matches[0].email) {
                  setSelectedPatientId(matches[0].id);
                }
              }}
              placeholder={t('documentEmail.searchPatient', 'Search by last name, first name or email...')}
              aria-label={t('documentEmail.searchPatient', 'Search by last name, first name or email...')}
              disabled={loading}
            />
            <Form.Select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={loading}
              aria-label={t('documentEmail.patient', 'Patient')}
            >
              <option value="">
                {patientSearch
                  ? t('documentEmail.matchingPatients', '-- {{count}} matching patient(s) --', { count: filteredPatients.length })
                  : t('documentEmail.choosePatient', '-- Choose a patient --')}
              </option>
              {patientOptions.map(patient => (
                <option
                  key={patient.id}
                  value={patient.id}
                  disabled={!patient.email}
                >
                  {patient.last_name} {patient.first_name}
                  {patient.email ? ` (${patient.email})` : ` - ${t('documentEmail.noEmailShort', 'No email')}`}
                </option>
              ))}
            </Form.Select>
            </>
          )}
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
              {isMultiple
                ? t('documentEmail.willSendToMultiple', 'The documents will be sent as attachments of a single email to:')
                : t('documentEmail.willSendTo', 'The document will be sent as an attachment to:')} <strong>{selectedPatient.email}</strong>
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
          disabled={loading || !!success || !selectedPatientId || !selectedPatient?.email || tooManyDocuments || tooLarge}
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
