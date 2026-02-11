/**
 * CameraButton
 * Shows a button with action sheet: "Take Photo" / "Choose from Library".
 * Only visible on native platforms.
 * Calls cameraService and returns a File to the parent via onCapture callback.
 */

import { useState } from 'react';
import { Button, Modal, ListGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiCamera, FiImage } from 'react-icons/fi';
import { isNative } from '../utils/platform';
import * as cameraService from '../services/cameraService';

const CameraButton = ({ onCapture, disabled = false }) => {
  const { t } = useTranslation();
  const [showSheet, setShowSheet] = useState(false);

  if (!isNative) return null;

  const handleTakePhoto = async () => {
    setShowSheet(false);
    const result = await cameraService.takePhoto();
    if (result) {
      // Add preview URL matching dropzone convention
      result.file.preview = result.dataUrl;
      onCapture(result.file);
    }
  };

  const handlePickGallery = async () => {
    setShowSheet(false);
    const result = await cameraService.pickFromGallery();
    if (result) {
      result.file.preview = result.dataUrl;
      onCapture(result.file);
    }
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => setShowSheet(true)}
        disabled={disabled}
        className="d-flex align-items-center gap-1 mb-2"
      >
        <FiCamera size={16} />
        {t('camera.addPhoto', 'Add Photo')}
      </Button>

      {/* Action sheet modal */}
      <Modal
        show={showSheet}
        onHide={() => setShowSheet(false)}
        centered
        size="sm"
        dialogClassName="camera-action-sheet"
      >
        <Modal.Body className="p-0">
          <ListGroup variant="flush">
            <ListGroup.Item
              action
              onClick={handleTakePhoto}
              className="d-flex align-items-center gap-2 py-3"
            >
              <FiCamera size={20} />
              {t('camera.takePhoto', 'Take Photo')}
            </ListGroup.Item>
            <ListGroup.Item
              action
              onClick={handlePickGallery}
              className="d-flex align-items-center gap-2 py-3"
            >
              <FiImage size={20} />
              {t('camera.chooseFromLibrary', 'Choose from Library')}
            </ListGroup.Item>
            <ListGroup.Item
              action
              onClick={() => setShowSheet(false)}
              className="text-center text-muted py-3"
            >
              {t('common.cancel', 'Cancel')}
            </ListGroup.Item>
          </ListGroup>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CameraButton;
