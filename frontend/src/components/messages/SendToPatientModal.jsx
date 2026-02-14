import { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiPlus, FiSend } from 'react-icons/fi';
import * as messageService from '../../services/messageService';
import { toast } from 'react-toastify';

/**
 * SendToPatientModal — shared modal for sending a journal or objective reference
 * Props:
 *   show, onClose
 *   patientId — UUID of the patient
 *   type — 'journal' | 'objective'
 *   referenceId — journal_entry_id (int) or objective_number (1-3)
 *   referenceTitle — display title for the reference
 */
const SendToPatientModal = ({ show, onClose, patientId, type, referenceId, referenceTitle }) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!show || !patientId) return;
    setLoading(true);
    messageService.getConversations()
      .then(data => {
        const patientConvos = data.filter(c => c.patient?.id === patientId);
        setConversations(patientConvos);
        if (patientConvos.length === 1) setSelectedConvo(patientConvos[0]);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [show, patientId]);

  const handleCreateAndSend = async () => {
    setCreating(true);
    try {
      const convo = await messageService.createConversation(patientId);
      await doSend(convo.id);
    } catch {
      toast.error(t('messages.createError', 'Erreur'));
    } finally {
      setCreating(false);
    }
  };

  const doSend = async (conversationId) => {
    setSending(true);
    try {
      if (type === 'journal') {
        await messageService.sendFromJournal(conversationId, referenceId, comment.trim() || undefined);
      } else {
        await messageService.sendFromObjective(conversationId, referenceId, comment.trim() || undefined);
      }
      toast.success(t('messages.sentToPatient', 'Envoyé dans la conversation'));
      setComment('');
      setSelectedConvo(null);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.sendError', 'Erreur'));
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!selectedConvo) return;
    doSend(selectedConvo.id);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.1rem' }}>
          <FiSend className="me-2" />
          {type === 'journal'
            ? t('messages.sendFromJournal', 'Envoyer depuis le journal')
            : t('messages.sendFromObjective', "Envoyer l'objectif")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Reference preview */}
        <div className="border rounded p-2 mb-3" style={{ fontSize: '0.85rem', background: '#f8f9fa' }}>
          <small className="text-muted d-block mb-1">
            {type === 'journal' ? t('messages.journalReference', 'Entrée de journal') : t('messages.objectiveReference', 'Objectif')}
          </small>
          <strong>{referenceTitle}</strong>
        </div>

        {/* Optional comment */}
        <Form.Group className="mb-3">
          <Form.Label style={{ fontSize: '0.85rem' }}>
            {t('messages.optionalComment', 'Commentaire (optionnel)')}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={5000}
            placeholder={t('messages.commentPlaceholder', 'Ajouter un commentaire...')}
          />
        </Form.Group>

        {/* Conversation selection */}
        {loading ? (
          <div className="text-center py-3"><Spinner size="sm" animation="border" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-muted mb-2">{t('messages.noConversationWithPatient', 'Aucune conversation avec ce patient')}</p>
            <Button variant="primary" size="sm" onClick={handleCreateAndSend} disabled={creating}>
              {creating ? <Spinner size="sm" animation="border" /> : <><FiPlus className="me-1" />{t('messages.createAndSend', 'Créer et envoyer')}</>}
            </Button>
          </div>
        ) : (
          <>
            <Form.Label style={{ fontSize: '0.85rem' }}>
              {t('messages.selectConversation', 'Choisir la conversation')}
            </Form.Label>
            <ListGroup className="mb-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {conversations.map(c => (
                <ListGroup.Item
                  key={c.id}
                  action
                  active={selectedConvo?.id === c.id}
                  onClick={() => setSelectedConvo(c)}
                  className="py-2"
                  style={{ fontSize: '0.85rem' }}
                >
                  <FiMessageSquare className="me-2" size={14} />
                  {c.title || `${c.patient?.first_name} ${c.patient?.last_name}`}
                  {c.last_message_at && (
                    <small className="text-muted ms-2">
                      {new Date(c.last_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </small>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Modal.Body>
      {conversations.length > 0 && (
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={onClose}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSend} disabled={sending || !selectedConvo}>
            {sending ? <Spinner size="sm" animation="border" /> : <><FiSend className="me-1" />{t('messages.send', 'Envoyer')}</>}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default SendToPatientModal;
