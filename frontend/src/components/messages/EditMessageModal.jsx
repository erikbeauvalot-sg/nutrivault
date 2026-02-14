import { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const EditMessageModal = ({ show, message, onSave, onClose }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (message) setContent(message.content || '');
  }, [message]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(message.id, content.trim());
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1.1rem' }}>
          {t('messages.editMessage', 'Modifier le message')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          as="textarea"
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={5000}
          autoFocus
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={saving}>
          {t('common.cancel', 'Annuler')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? <Spinner size="sm" animation="border" /> : t('common.save', 'Enregistrer')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditMessageModal;
