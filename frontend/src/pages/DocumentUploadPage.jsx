/**
 * DocumentUploadPage Component
 * Dedicated page for uploading documents with drag-and-drop support
 */

import { useState, useCallback, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, ProgressBar, Form, Breadcrumb } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { formatDate } from '../utils/dateUtils';
import * as documentService from '../services/documentService';
import api from '../services/api';

const DocumentUploadPage = () => {
  const { t, i18n } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState(searchParams.get('resourceType') || '');
  const [resourceId, setResourceId] = useState(searchParams.get('resourceId') || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Resource lists
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Load resources when resourceType changes
  useEffect(() => {
    if (resourceType === 'patient') {
      loadPatients();
    } else if (resourceType === 'user') {
      loadUsers();
    } else if (resourceType === 'visit') {
      loadVisits();
    }
  }, [resourceType]);

  const loadPatients = async () => {
    try {
      setLoadingResources(true);
      const response = await api.get('/api/patients?limit=1000'); // Get all patients
      const data = response.data?.data || response.data;
      setPatients(Array.isArray(data) ? data : []);
      console.log('Loaded patients:', data);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(t('documents.failedToLoadPatients', 'Failed to load patients'));
    } finally {
      setLoadingResources(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingResources(true);
      const response = await api.get('/api/users?limit=1000'); // Get all users
      const data = response.data?.data || response.data;
      setUsers(Array.isArray(data) ? data : []);
      console.log('Loaded users:', data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(t('documents.failedToLoadUsers', 'Failed to load users'));
    } finally {
      setLoadingResources(false);
    }
  };

  const loadVisits = async () => {
    try {
      setLoadingResources(true);
      const response = await api.get('/api/visits?limit=1000'); // Get all visits
      const data = response.data?.data || response.data;
      setVisits(Array.isArray(data) ? data : []);
      console.log('Loaded visits:', data);
    } catch (err) {
      console.error('Error loading visits:', err);
      setError(t('documents.failedToLoadVisits', 'Failed to load visits'));
    } finally {
      setLoadingResources(false);
    }
  };

  const getResourceDisplayName = (resource, type) => {
    if (type === 'patient') {
      return `${resource.first_name} ${resource.last_name}`;
    } else if (type === 'user') {
      return `${resource.first_name} ${resource.last_name} (${resource.username})`;
    } else if (type === 'visit') {
      const visitDate = formatDate(resource.visit_date, i18n.language);
      const patientName = resource.patient ? `${resource.patient.first_name} ${resource.patient.last_name}` : '';
      return `${visitDate} - ${patientName}`;
    }
    return '';
  };

  const handleResourceTypeChange = (newType) => {
    setResourceType(newType);
    setResourceId(''); // Reset resource ID when type changes
  };

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
    disabled: uploading
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      setError(t('documents.noFilesSelected', 'Please select files to upload'));
      return;
    }

    // Resource type and ID are optional - for general library uploads
    // Only validate if one is set but not the other
    if ((resourceType && !resourceId) || (!resourceType && resourceId)) {
      setError(t('documents.resourceIncomplete', 'Please specify both resource type and ID, or leave both empty for library upload'));
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
          resourceType || null,
          resourceId || null,
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

      // Redirect back to documents page after a short delay
      setTimeout(() => {
        navigate('/documents');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documents.uploadError', 'Failed to upload documents'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  if (!hasPermission('documents.upload')) {
    return (
      <Layout>
        <Container className="py-4">
          <Alert variant="danger">
            {t('common.accessDenied', 'Access denied')}
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        {/* Breadcrumb */}
        <Row className="mb-4">
          <Col>
            <Breadcrumb>
              <Breadcrumb.Item href="/dashboard">{t('navigation.dashboard')}</Breadcrumb.Item>
              <Breadcrumb.Item href="/documents">{t('navigation.documents', 'Documents')}</Breadcrumb.Item>
              <Breadcrumb.Item active>{t('documents.uploadDocument', 'Upload Document')}</Breadcrumb.Item>
            </Breadcrumb>
          </Col>
        </Row>

        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h1 className="mb-1">{t('documents.uploadDocument', 'Upload Document')}</h1>
            <p className="text-muted mb-0">{t('documents.uploadSubtitle', 'Upload documents and associate them with patients, visits, or users')}</p>
          </Col>
        </Row>

        {/* Error Alert */}
        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Success Alert */}
        {success && (
          <Row className="mb-4">
            <Col>
              <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            </Col>
          </Row>
        )}

        <Row>
          <Col lg={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">{t('documents.resourceAssociation', 'Resource Association')} ({t('common.optional')})</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">
                  {t('documents.resourceAssociationHelp', 'Associate this document with a patient, visit, or user. Leave empty for general library documents.')}
                </p>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('documents.resourceType', 'Resource Type')}</Form.Label>
                      <Form.Select
                        value={resourceType}
                        onChange={(e) => handleResourceTypeChange(e.target.value)}
                        disabled={uploading}
                      >
                        <option value="">{t('documents.noAssociation', 'No association (library)')}</option>
                        <option value="patient">{t('patients.patient', 'Patient')}</option>
                        <option value="visit">{t('visits.visit', 'Visit')}</option>
                        <option value="user">{t('users.user', 'User')}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {resourceType === 'patient' && t('patients.selectPatient', 'Select Patient')}
                        {resourceType === 'visit' && t('visits.selectVisit', 'Select Visit')}
                        {resourceType === 'user' && t('users.selectUser', 'Select User')}
                        {!resourceType && t('documents.resourceSelection', 'Resource Selection')}
                      </Form.Label>
                      <Form.Select
                        value={resourceId}
                        onChange={(e) => setResourceId(e.target.value)}
                        disabled={uploading || !resourceType || loadingResources}
                      >
                        <option value="">{loadingResources ? t('common.loading', 'Loading...') : t('common.select', 'Select...')}</option>
                        {resourceType === 'patient' && patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {getResourceDisplayName(patient, 'patient')}
                          </option>
                        ))}
                        {resourceType === 'user' && users.map(user => (
                          <option key={user.id} value={user.id}>
                            {getResourceDisplayName(user, 'user')}
                          </option>
                        ))}
                        {resourceType === 'visit' && visits.map(visit => (
                          <option key={visit.id} value={visit.id}>
                            {getResourceDisplayName(visit, 'visit')}
                          </option>
                        ))}
                      </Form.Select>
                      {resourceType && !loadingResources && (
                        <Form.Text className="text-muted">
                          {resourceType === 'patient' && t('documents.selectPatientHelp', 'Select the patient to associate this document with')}
                          {resourceType === 'visit' && t('documents.selectVisitHelp', 'Select the visit to associate this document with')}
                          {resourceType === 'user' && t('documents.selectUserHelp', 'Select the user to associate this document with')}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">{t('documents.fileUpload', 'File Upload')}</h5>
              </Card.Header>
              <Card.Body>
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded p-4 text-center mb-3 ${
                    isDragActive ? 'border-primary bg-light' : 'border-secondary'
                  } ${uploading ? 'opacity-50' : ''}`}
                  style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  <input {...getInputProps()} />
                  <div className="py-4">
                    <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                    {isDragActive ? (
                      <p className="mb-0">{t('documents.dropFilesHere', 'Drop the files here...')}</p>
                    ) : (
                      <div>
                        <p className="mb-1">{t('documents.dragDropFiles', 'Drag & drop files here, or click to select')}</p>
                        <p className="text-muted small mb-0">
                          {t('documents.supportedFormats', 'Supported formats: PDF, JPG, PNG, DOC, DOCX, TXT, RTF (max 10MB)')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mb-3">
                    <h6>{t('documents.selectedFiles', 'Selected Files')}:</h6>
                    {files.map((file, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
                        <div className="d-flex align-items-center">
                          <span className="me-2">{getFileTypeIcon(file)}</span>
                          <div>
                            <div className="fw-bold">{file.name}</div>
                            <small className="text-muted">{formatFileSize(file.size)}</small>
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <i className="fas fa-times"></i>
                        </Button>
                      </div>
                    ))}
                  </div>
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
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">{t('documents.uploadSummary', 'Upload Summary')}</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>{t('documents.filesSelected', 'Files Selected')}:</strong> {files.length}
                </div>
                <div className="mb-3">
                  <strong>{t('documents.resourceType', 'Resource Type')}:</strong> {resourceType || t('common.none', 'None')}
                </div>
                {resourceId && resourceType && (
                  <div className="mb-3">
                    <strong>
                      {resourceType === 'patient' && t('patients.patient', 'Patient')}
                      {resourceType === 'visit' && t('visits.visit', 'Visit')}
                      {resourceType === 'user' && t('users.user', 'User')}
                      :
                    </strong>{' '}
                    {(() => {
                      if (resourceType === 'patient') {
                        const patient = patients.find(p => p.id === resourceId);
                        return patient ? getResourceDisplayName(patient, 'patient') : '-';
                      } else if (resourceType === 'visit') {
                        const visit = visits.find(v => v.id === resourceId);
                        return visit ? getResourceDisplayName(visit, 'visit') : '-';
                      } else if (resourceType === 'user') {
                        const user = users.find(u => u.id === resourceId);
                        return user ? getResourceDisplayName(user, 'user') : '-';
                      }
                      return '-';
                    })()}
                  </div>
                )}
                <div className="mb-3">
                  <strong>{t('documents.totalSize', 'Total Size')}:</strong> {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
                </div>
              </Card.Body>
            </Card>

            <div className="d-grid gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
              >
                {uploading ? t('documents.uploading', 'Uploading...') : t('documents.upload', 'Upload')}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate('/documents')}
                disabled={uploading}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default DocumentUploadPage;