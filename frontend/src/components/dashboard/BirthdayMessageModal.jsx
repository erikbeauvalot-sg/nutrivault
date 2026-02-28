/**
 * BirthdayMessageModal
 * Opens from BirthdaysWidget to send a birthday message to a patient via messaging system.
 */

import { useState } from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiSend } from 'react-icons/fi';
import { createConversation, sendMessage } from '../../services/messageService';
import { toast } from 'react-toastify';

const BirthdayMessageModal = ({ birthday, onClose }) => {
  const { t } = useTranslation();
  const firstName = birthday?.patient_name?.split(' ')[0] || '';

  const defaultMessage = t('dashboard.birthday.defaultMessage', {
    defaultValue: "Cher(e) {{firstName}}, toute l'équipe vous souhaite un très joyeux anniversaire ! 🎂 Nous espérons que cette nouvelle année vous apporte santé et bonheur.",
    firstName,
  });

  const [content, setContent] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const conv = await createConversation(birthday.patient_id);
      await sendMessage(conv.id, content.trim());
      toast.success(t('dashboard.birthday.sent', 'Message envoyé !'));
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('dashboard.birthday.sendError', "Erreur lors de l'envoi du message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={!!birthday} onHide={onClose} centered>
      <Modal.Header closeButton style={{ backgroundColor: '#fdf2f8', borderBottom: '2px solid #ec4899' }}>
        <Modal.Title style={{ fontSize: '1.1rem', color: '#be185d' }}>
          🎂 {t('dashboard.birthday.modalTitle', "Message d'anniversaire")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
          <strong>{birthday?.patient_name}</strong>
          {birthday?.age ? ` — ${birthday.age} ${t('common.years', 'ans')}` : ''}
        </p>
        {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem' }}>{error}</Alert>}
        <Form.Group>
          <Form.Control
            as="textarea"
            rows={5}
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={1000}
            disabled={sending}
          />
          <Form.Text className="text-muted">{content.length}/1000</Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={sending}>
          {t('common.cancel', 'Annuler')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleSend}
          disabled={sending || !content.trim()}
        >
          {sending
            ? <><Spinner size="sm" animation="border" className="me-1" />{t('dashboard.birthday.sending', 'Envoi...')}</>
            : <><FiSend className="me-1" />{t('messages.send', 'Envoyer')}</>
          }
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BirthdayMessageModal;
