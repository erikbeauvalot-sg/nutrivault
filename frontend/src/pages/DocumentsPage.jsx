/**
 * DocumentsPage Component
 * Document management page with upload, download, and organization features
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentUploadModal from '../components/DocumentUploadModal';
import DocumentListComponent from '../components/DocumentListComponent';
import DocumentStatisticsWidget from '../components/DocumentStatisticsWidget';
import * as documentService from '../services/documentService';

const DocumentsPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    if (hasPermission('documents.read')) {
      fetchDocuments();
      fetchStatistics();
    }
  }, [hasPermission]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments();
      const data = response.data?.data || response.data || [];
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(t('documents.failedToLoad') || 'Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await documentService.getDocumentStatistics();
      const data = response.data?.data || response.data;
      setStatistics(data);
    } catch (err) {
      console.error('Error fetching document statistics:', err);
      // Don't set error for statistics failure
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchDocuments();
    fetchStatistics();
  };

  const handleDocumentDeleted = () => {
    fetchDocuments();
    fetchStatistics();
  };

  const handleResourceSelect = (resourceType, resourceId) => {
    setSelectedResource({ resourceType, resourceId });
    setShowUploadModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </Spinner>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="mb-1">{t('documents.title')}</h1>
                <p className="text-muted mb-0">{t('documents.subtitle')}</p>
              </div>
              {hasPermission('documents.create') && (
                <Button
                  variant="primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <i className="fas fa-upload me-2"></i>
                  {t('documents.uploadDocument')}
                </Button>
              )}
            </div>
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

        {/* Statistics Widget */}
        {statistics && (
          <Row className="mb-4">
            <Col>
              <DocumentStatisticsWidget statistics={statistics} />
            </Col>
          </Row>
        )}

        {/* Documents List */}
        <Row>
          <Col>
            <Card>
              <Card.Body>
                <DocumentListComponent
                  documents={documents}
                  onDocumentDeleted={handleDocumentDeleted}
                  onResourceSelect={handleResourceSelect}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Upload Modal */}
        <DocumentUploadModal
          show={showUploadModal}
          onHide={() => {
            setShowUploadModal(false);
            setSelectedResource(null);
          }}
          onUploadSuccess={handleUploadSuccess}
          selectedResource={selectedResource}
        />
      </Container>
    </Layout>
  );
};

export default DocumentsPage;