/**
 * DocumentListComponent
 * Component for displaying and managing documents with filtering
 */

import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert, Spinner, Form, Row, Col, InputGroup, Pagination, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';

const DocumentListComponent = ({
  resourceType,
  resourceId,
  showUploadButton = true,
  onUploadClick
}) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [resourceType, resourceId, filters]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        ...(resourceType && { resource_type: resourceType }),
        ...(resourceId && { resource_id: resourceId })
      };

      // Filter out empty values to avoid sending empty strings to the API
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([key, value]) =>
          value !== '' && value !== null && value !== undefined
        )
      );

      const response = await documentService.getDocuments(cleanParams);
      const data = response.data.data || response.data;
      const paginationData = response.data.pagination || response.pagination;

      setDocuments(Array.isArray(data) ? data : []);
      setPagination(paginationData);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documents.failedToLoad', 'Failed to load documents'));
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      setDownloading(document.id);
      const blob = await documentService.downloadDocument(document.id);
      documentService.triggerFileDownload(blob, document.file_name);
    } catch (err) {
      setError(t('documents.downloadError', 'Failed to download document'));
      console.error('Error downloading document:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (document) => {
    try {
      setLoadingPreview(true);
      setPreviewDocument(document);
      setShowPreviewModal(true);

      // Download the file blob with authentication
      const blob = await documentService.downloadDocument(document.id);

      // Create a local blob URL for preview
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(t('documents.downloadError', 'Failed to load preview'));
      console.error('Error loading preview:', err);
      setShowPreviewModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewDocument(null);

    // Clean up blob URL to free memory
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field === 'page' ? value : 1 // Reset to page 1 when changing filters
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    return documentService.formatFileSize(bytes);
  };

  const getFileTypeIcon = (mimeType) => {
    return documentService.getFileTypeIcon(mimeType);
  };

  const getResourceTypeBadge = (type) => {
    const variants = {
      patient: 'primary',
      visit: 'success',
      user: 'info'
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const items = [];
    const { page, totalPages } = pagination;

    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        disabled={page <= 1}
        onClick={() => handleFilterChange('page', page - 1)}
      />
    );

    // Page numbers
    for (let number = Math.max(1, page - 2); number <= Math.min(totalPages, page + 2); number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === page}
          onClick={() => handleFilterChange('page', number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        disabled={page >= totalPages}
        onClick={() => handleFilterChange('page', page + 1)}
      />
    );

    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination>{items}</Pagination>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </Spinner>
          <p className="mt-2">{t('documents.loading', 'Loading documents...')}</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">{t('documents.title', 'Documents')}</h5>
            {pagination && (
              <small className="text-muted">
                {t('documents.showingResults', 'Showing {{count}} of {{total}} documents', {
                  count: documents.length,
                  total: pagination.total
                })}
              </small>
            )}
          </Col>
          {showUploadButton && (
            <Col xs="auto">
              <Button
                variant="primary"
                size="sm"
                onClick={onUploadClick}
              >
                📎 {t('documents.upload', 'Upload')}
              </Button>
            </Col>
          )}
        </Row>

        {/* Filters */}
        <Row className="mt-3">
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>🔍</InputGroup.Text>
              <Form.Control
                type="text"
                placeholder={t('documents.searchPlaceholder', 'Search by filename or description...')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </InputGroup>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body className="p-0">
        {error && (
          <div className="p-3">
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-3">📄</div>
            <h6>{t('documents.noDocuments', 'No documents found')}</h6>
            <p className="text-muted">
              {filters.search
                ? t('documents.noDocumentsSearch', 'No documents match your search criteria')
                : t('documents.noDocumentsYet', 'No documents have been uploaded yet')
              }
            </p>
            {showUploadButton && !filters.search && (
              <Button variant="outline-primary" onClick={onUploadClick}>
                📎 {t('documents.uploadFirst', 'Upload your first document')}
              </Button>
            )}
          </div>
        ) : (
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('documents.file', 'File')}</th>
                <th>{t('documents.type', 'Type')}</th>
                <th>{t('documents.size', 'Size')}</th>
                <th>{t('documents.uploadedBy', 'Uploaded By')}</th>
                <th>{t('documents.uploadedAt', 'Uploaded')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="me-2">{getFileTypeIcon(document.mime_type)}</div>
                      <div>
                        <div className="fw-bold">{document.file_name}</div>
                        {document.description && (
                          <small className="text-muted">{document.description}</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{getResourceTypeBadge(document.resource_type)}</td>
                  <td>{formatFileSize(document.file_size)}</td>
                  <td>
                    {document.uploader?.first_name} {document.uploader?.last_name}
                    {document.uploader?.username && (
                      <small className="text-muted d-block">@{document.uploader.username}</small>
                    )}
                  </td>
                  <td>{formatDate(document.created_at)}</td>
                  <td>
                    {documentService.canPreviewFile(document.mime_type) && (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handlePreview(document)}
                        className="me-1"
                      >
                        👁️ {t('documents.preview', 'Preview')}
                      </Button>
                    )}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      disabled={downloading === document.id}
                      className="me-1"
                    >
                      {downloading === document.id ? '⏳' : '⬇️'} {t('documents.download', 'Download')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>

      {renderPagination()}
    </Card>

    {/* Preview Modal */}
    <Modal
      show={showPreviewModal}
      onHide={handleClosePreview}
      size="lg"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {t('documents.preview', 'Preview')} - {previewDocument?.file_name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {loadingPreview ? (
          <div className="py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </Spinner>
            <p className="mt-2">{t('documents.loading', 'Loading preview...')}</p>
          </div>
        ) : previewDocument && previewUrl ? (
          <div>
            {previewDocument.mime_type.startsWith('image/') ? (
              <img
                src={previewUrl}
                alt={previewDocument.file_name}
                className="img-fluid"
                style={{ maxHeight: '70vh', maxWidth: '100%' }}
              />
            ) : previewDocument.mime_type === 'application/pdf' ? (
              <iframe
                src={previewUrl}
                title={previewDocument.file_name}
                style={{ width: '100%', height: '70vh', border: 'none' }}
              />
            ) : (
              <div className="py-5">
                <div className="mb-3">📄</div>
                <p>{t('documents.previewNotSupported', 'Preview not supported for this file type')}</p>
                <Button
                  variant="outline-primary"
                  onClick={() => handleDownload(previewDocument)}
                >
                  ⬇️ {t('documents.download', 'Download')}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClosePreview}>
          {t('common.close', 'Close')}
        </Button>
        {previewDocument && (
          <Button
            variant="primary"
            onClick={() => {
              handleDownload(previewDocument);
              handleClosePreview();
            }}
          >
            ⬇️ {t('documents.download', 'Download')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default DocumentListComponent;