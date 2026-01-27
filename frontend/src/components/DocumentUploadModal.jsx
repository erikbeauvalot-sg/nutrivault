/**
 * DocumentUploadModal Component
 * Modal for uploading documents with drag-and-drop support
 */

import { useState, useCallback } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import * as documentService from '../services/documentService';

const DocumentUploadModal = ({
  show,
  onHide,
  resourceType,
  resourceId,
  selectedResource,
  onUploadSuccess
}) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Use selectedResource if provided, otherwise use individual props
  const actualResourceType = selectedResource?.resourceType || resourceType;
  const actualResourceId = selectedResource?.resourceId || resourceId;

  // Configure dropzone
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError(t('documents.uploadRejected', 'Some files were rejected. Please check file type and size.'));
      return;
    }

    setFiles(acceptedFiles);
    setError(null);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      setError(t('documents.noFilesSelected', 'Please select files to upload'));
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = documentService.createUploadFormData(
          file,
          actualResourceType,
          actualResourceId,
          description
        );

        const result = await documentService.uploadDocument(formData);

        // Update progress
        setUploadProgress(((index + 1) / files.length) * 100);

        return result;
      });

      await Promise.all(uploadPromises);

      setSuccess(t('documents.uploadSuccess', 'Documents uploaded successfully'));
      setFiles([]);
      setDescription('');

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documents.uploadError', 'Failed to upload documents'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setDescription('');
      setError(null);
      setSuccess(null);
      setUploadProgress(0);
      onHide();
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    return documentService.formatFileSize(bytes);
  };

  const getFileTypeIcon = (file) => {
    return documentService.getFileTypeIcon(file.type);
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('documents.uploadDocuments', 'Upload Documents')}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Dropzone */}
        <Card className="mb-3">
          <Card.Body>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded p-4 text-center ${
                isDragActive ? 'border-primary bg-light' : 'border-secondary'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <div>
                  <div className="mb-2">📂</div>
                  <p className="mb-0">{t('documents.dropFilesHere', 'Drop files here...')}</p>
                </div>
              ) : (
                <div>
                  <div className="mb-2">📎</div>
                  <p className="mb-0">
                    {t('documents.dragDropOrClick', 'Drag & drop files here, or click to select files')}
                  </p>
                  <small className="text-muted">
                    {t('documents.supportedFormats', 'Supported: PDF, Images, Documents (max 10MB each)')}
                  </small>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Selected Files */}
        {files.length > 0 && (
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">{t('documents.selectedFiles', 'Selected Files')} ({files.length})</h6>
            </Card.Header>
            <Card.Body className="p-0">
              {files.map((file, index) => (
                <div key={index} className="d-flex align-items-center p-2 border-bottom">
                  <div className="me-2">{getFileTypeIcon(file)}</div>
                  <div className="flex-grow-1">
                    <div className="fw-bold">{file.name}</div>
                    <small className="text-muted">{formatFileSize(file.size)}</small>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </Card.Body>
          </Card>
        )}

        {/* Description */}
        <Form.Group className="mb-3">
          <Form.Label>{t('documents.description', 'Description')} ({t('common.optional')})</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('documents.descriptionPlaceholder', 'Add a description for these documents...')}
            disabled={uploading}
          />
        </Form.Group>

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <small>{t('documents.uploading', 'Uploading...')}</small>
              <small>{Math.round(uploadProgress)}%</small>
            </div>
            <ProgressBar now={uploadProgress} animated />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? t('documents.uploading', 'Uploading...') : t('documents.upload', 'Upload')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentUploadModal;