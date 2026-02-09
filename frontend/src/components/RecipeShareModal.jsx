/**
 * Recipe Share Modal Component
 * Modal for sharing recipes with patients
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Spinner, ListGroup, Badge, Alert, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { FaSearch, FaShare, FaTimes, FaUser, FaTrash, FaEdit, FaCheck, FaEnvelope, FaGlobe, FaLock } from 'react-icons/fa';
import * as recipeService from '../services/recipeService';
import * as patientService from '../services/patientService';
import { debounce } from 'lodash';

const RecipeShareModal = ({ show, onHide, recipe, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [shares, setShares] = useState([]);
  const [editingShare, setEditingShare] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [revokeAccessId, setRevokeAccessId] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [visibility, setVisibility] = useState('private');
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  // Load existing shares when modal opens
  useEffect(() => {
    if (show && recipe) {
      loadShares();
      setSearchQuery('');
      setPatients([]);
      setSelectedPatient(null);
      setNotes('');
      setSendEmail(false);
      setEditingShare(null);
      setVisibility(recipe.visibility || 'private');
    }
  }, [show, recipe]);

  const loadShares = async () => {
    if (!recipe) return;
    setSharesLoading(true);
    try {
      const data = await recipeService.getRecipeShares(recipe.id);
      setShares(data);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setSharesLoading(false);
    }
  };

  // Debounced patient search
  const searchPatients = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setPatients([]);
        return;
      }
      setSearchLoading(true);
      try {
        const { data } = await patientService.getPatients({ search: query, limit: 10 });
        // Filter out patients who already have access
        const sharedPatientIds = shares.map(s => s.patient?.id);
        const filteredPatients = data.filter(p => !sharedPatientIds.includes(p.id));
        setPatients(filteredPatients);
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    [shares]
  );

  useEffect(() => {
    searchPatients(searchQuery);
  }, [searchQuery, searchPatients]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setPatients([]);
  };

  const handleShare = async () => {
    if (!selectedPatient || !recipe) return;

    setLoading(true);
    try {
      await recipeService.shareRecipe(recipe.id, selectedPatient.id, notes, sendEmail);
      toast.success(t('recipes.shareSuccess', 'Recipe shared successfully'));
      setSelectedPatient(null);
      setNotes('');
      setSendEmail(false);
      loadShares();
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error sharing recipe:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async () => {
    if (!recipe) return;
    const newVisibility = visibility === 'public' ? 'private' : 'public';
    setVisibilityLoading(true);
    try {
      await recipeService.setRecipeVisibility(recipe.id, newVisibility);
      setVisibility(newVisibility);
      toast.success(
        newVisibility === 'public'
          ? t('recipes.visibilityPublic', 'Recipe is now visible to all patients')
          : t('recipes.visibilityPrivate', 'Recipe is now private')
      );
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleRevokeClick = (accessId) => {
    setRevokeAccessId(accessId);
    setShowRevokeModal(true);
  };

  const handleRevokeCancel = () => {
    setRevokeAccessId(null);
    setShowRevokeModal(false);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeAccessId) return;

    try {
      await recipeService.revokeRecipeAccess(revokeAccessId);
      toast.success(t('recipes.revokeSuccess', 'Access revoked successfully'));
      loadShares();
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setRevokeAccessId(null);
      setShowRevokeModal(false);
    }
  };

  const handleEditNotes = (share) => {
    setEditingShare(share.id);
    setEditNotes(share.notes || '');
  };

  const handleSaveNotes = async (accessId) => {
    try {
      await recipeService.updateShareNotes(accessId, editNotes);
      toast.success(t('recipes.notesUpdated', 'Notes updated successfully'));
      setEditingShare(null);
      loadShares();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    }
  };

  const handleCancelEdit = () => {
    setEditingShare(null);
    setEditNotes('');
  };

  const handleResendEmail = async (share) => {
    if (!share.patient?.email) {
      toast.error(t('recipes.noPatientEmail', 'Patient does not have an email address'));
      return;
    }

    setResendingId(share.id);
    try {
      await recipeService.resendShareEmail(recipe.id, share.id);
      toast.success(t('recipes.emailResent', 'Email sent successfully to {{email}}', { email: share.patient.email }));
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error(error.response?.data?.error || t('common.error', 'An error occurred'));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShare className="me-2" />
          {t('recipes.shareRecipe', 'Share Recipe')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {recipe && (
          <Alert variant="info" className="mb-3">
            <strong>{recipe.title}</strong>
          </Alert>
        )}

        {/* Visibility toggle */}
        <div className="mb-4 p-3 border rounded">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-1">
                {visibility === 'public' ? <FaGlobe className="me-2 text-success" /> : <FaLock className="me-2 text-muted" />}
                {t('recipes.visibility', 'Visibility')}
              </h6>
              <small className="text-muted">
                {visibility === 'public'
                  ? t('recipes.visibilityPublicDesc', 'All patients with a portal account can see this recipe')
                  : t('recipes.visibilityPrivateDesc', 'Only individually shared patients can see this recipe')}
              </small>
            </div>
            <Form.Check
              type="switch"
              id="visibility-switch"
              checked={visibility === 'public'}
              onChange={handleVisibilityToggle}
              disabled={visibilityLoading}
              label={visibility === 'public'
                ? t('recipes.public', 'Public')
                : t('recipes.private', 'Private')}
            />
          </div>
        </div>

        {/* Share with new patient */}
        <div className="mb-4">
          <h6>{t('recipes.shareWith', 'Share with Patient')}</h6>

          {selectedPatient ? (
            <div className="d-flex align-items-center gap-2 mb-3">
              <Badge bg="primary" className="d-flex align-items-center gap-2 p-2">
                <FaUser />
                {selectedPatient.first_name} {selectedPatient.last_name}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-white"
                  onClick={() => setSelectedPatient(null)}
                >
                  <FaTimes />
                </Button>
              </Badge>
            </div>
          ) : (
            <div className="position-relative">
              <InputGroup className="mb-2">
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={t('recipes.searchPatients', 'Search patients by name or email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchLoading && (
                  <InputGroup.Text>
                    <Spinner size="sm" />
                  </InputGroup.Text>
                )}
              </InputGroup>

              {patients.length > 0 && (
                <ListGroup className="position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  {patients.map(patient => (
                    <ListGroup.Item
                      key={patient.id}
                      action
                      onClick={() => handleSelectPatient(patient)}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <FaUser className="me-2 text-muted" />
                        <strong>{patient.first_name} {patient.last_name}</strong>
                        {patient.email && (
                          <small className="text-muted ms-2">{patient.email}</small>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          )}

          {selectedPatient && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>{t('recipes.shareNotes', 'Notes for Patient')} ({t('common.optional', 'optional')})</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('recipes.shareNotesPlaceholder', 'Add any special instructions or notes for this patient...')}
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                id="send-email-check"
                className="mb-3"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                label={
                  <span>
                    <FaEnvelope className="me-1" />
                    {t('recipes.sendEmailNotification', 'Send email notification')}
                  </span>
                }
              />

              <Button
                variant="primary"
                onClick={handleShare}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {t('common.sharing', 'Sharing...')}
                  </>
                ) : (
                  <>
                    <FaShare className="me-2" />
                    {t('recipes.share', 'Share')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Current shares */}
        <div>
          <h6>{t('recipes.currentShares', 'Currently Shared With')}</h6>

          {sharesLoading ? (
            <div className="text-center py-3">
              <Spinner />
            </div>
          ) : shares.length === 0 ? (
            <Alert variant="light">
              {t('recipes.noShares', 'This recipe has not been shared with any patients yet.')}
            </Alert>
          ) : (
            <ListGroup>
              {shares.map(share => (
                <ListGroup.Item key={share.id} className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <FaUser className="text-muted" />
                        <strong>
                          {share.patient?.first_name} {share.patient?.last_name}
                        </strong>
                        {share.patient?.email && (
                          <small className="text-muted">({share.patient.email})</small>
                        )}
                      </div>
                      <small className="text-muted">
                        {t('recipes.sharedBy', 'Shared by')} {share.sharedByUser?.first_name} {share.sharedByUser?.last_name}
                        {' - '}
                        {new Date(share.shared_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleResendEmail(share)}
                        disabled={resendingId === share.id || !share.patient?.email}
                        title={share.patient?.email
                          ? t('recipes.resendEmail', 'Resend email')
                          : t('recipes.noPatientEmail', 'No email address')}
                      >
                        {resendingId === share.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <FaEnvelope />
                        )}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleEditNotes(share)}
                        title={t('recipes.editNotes', 'Edit notes')}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRevokeClick(share.id)}
                        title={t('recipes.revoke', 'Revoke access')}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>

                  {editingShare === share.id ? (
                    <div className="d-flex gap-2">
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder={t('recipes.shareNotesPlaceholder', 'Add notes...')}
                      />
                      <div className="d-flex flex-column gap-1">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleSaveNotes(share.id)}
                        >
                          <FaCheck />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes />
                        </Button>
                      </div>
                    </div>
                  ) : share.notes ? (
                    <div className="bg-light p-2 rounded small">
                      <em>{share.notes}</em>
                    </div>
                  ) : null}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('common.close', 'Close')}
        </Button>
      </Modal.Footer>

      {/* Revoke Confirmation Modal */}
      <Modal show={showRevokeModal} onHide={handleRevokeCancel} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('recipes.revokeTitle', 'Revoke Access')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{t('recipes.revokeConfirm', 'Are you sure you want to revoke access to this recipe?')}</p>
          <p className="text-muted small">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleRevokeCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={handleRevokeConfirm}>
            {t('recipes.revoke', 'Revoke')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default RecipeShareModal;
