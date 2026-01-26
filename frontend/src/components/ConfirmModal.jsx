/**
 * ConfirmModal Component
 * Reusable confirmation modal to replace window.confirm()
 */

import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  confirmDisabled = false
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || t('common.confirm', 'Confirm')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {cancelLabel || t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant={variant}
          onClick={handleConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel || t('common.confirm', 'Confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
