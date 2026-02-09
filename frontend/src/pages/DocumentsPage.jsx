/**
 * DocumentsPage Component
 * Document management page with upload, download, and organization features
 * Includes Consultation Guides section
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Tab, Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentListComponent from '../components/DocumentListComponent';
import DocumentStatisticsWidget from '../components/DocumentStatisticsWidget';
import * as documentService from '../services/documentService';

const GUIDE_LABELS = {
  'menopause': 'Ménopause',
  'perte-de-poids': 'Perte de poids',
  'reequilibrage-alimentaire': 'Rééquilibrage alimentaire',
  'sii': 'SII (Intestin Irritable)',
  'pathologies-feminines': 'Pathologies féminines',
  'vegetaliser-alimentation': 'Végétaliser son alimentation',
  'maladies-cardiovasculaires': 'Maladies cardiovasculaires',
  'intolerances-alimentaires': 'Intolérances alimentaires',
};

const DocumentsPage = () => {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');

  // Guides state
  const [guides, setGuides] = useState([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [generatingGuides, setGeneratingGuides] = useState(false);
  const [guidesMessage, setGuidesMessage] = useState(null);

  useEffect(() => {
    if (hasPermission('documents.read')) {
      fetchDocuments();
      fetchStatistics();
      fetchGuides();
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
      setError(t('documents.failedToLoad') || t('errors.failedToLoadDocuments'));
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
    }
  };

  const fetchGuides = async () => {
    try {
      setGuidesLoading(true);
      const response = await documentService.getConsultationGuides();
      const data = response.data?.data || response.data || [];
      setGuides(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching guides:', err);
    } finally {
      setGuidesLoading(false);
    }
  };

  const handleGenerateGuides = async () => {
    try {
      setGeneratingGuides(true);
      setGuidesMessage(null);
      const response = await documentService.generateConsultationGuides();
      const data = response.data || response;
      const created = data.created?.length || 0;
      const existing = data.existing?.length || 0;
      setGuidesMessage({
        type: 'success',
        text: t('documents.guides.generateSuccess', {
          created,
          existing,
          defaultValue: `${created} guide(s) created, ${existing} already existed`
        })
      });
      fetchGuides();
      fetchStatistics();
    } catch (err) {
      console.error('Error generating guides:', err);
      setGuidesMessage({
        type: 'danger',
        text: t('documents.guides.generateError', 'Failed to generate guides')
      });
    } finally {
      setGeneratingGuides(false);
    }
  };

  const handleDownloadGuide = async (guide) => {
    try {
      const blob = await documentService.downloadDocument(guide.id);
      documentService.triggerFileDownload(blob, guide.file_name);
    } catch (err) {
      console.error('Error downloading guide:', err);
    }
  };

  const handlePreviewGuide = async (guide) => {
    try {
      const blob = await documentService.downloadDocument(guide.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error previewing guide:', err);
    }
  };

  const handleDocumentDeleted = () => {
    fetchDocuments();
    fetchStatistics();
  };

  const handleResourceSelect = (resourceType, resourceId) => {
    navigate(`/documents/upload?resourceType=${resourceType}&resourceId=${resourceId}`);
  };

  const getGuideSlug = (guide) => {
    try {
      const tags = typeof guide.tags === 'string' ? JSON.parse(guide.tags) : guide.tags;
      if (Array.isArray(tags)) {
        return tags.find(tag => tag !== 'consultation-guide') || '';
      }
    } catch (e) {}
    return '';
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
              {hasPermission('documents.upload') && activeTab === 'documents' && (
                <Button
                  variant="primary"
                  onClick={() => navigate('/documents/upload')}
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

        {/* Tabs: Documents / Guides */}
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="documents">
                <i className="fas fa-folder me-2"></i>
                {t('documents.allDocuments', 'Documents')}
                <Badge bg="secondary" className="ms-2">{documents.length}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="guides">
                <i className="fas fa-book-medical me-2"></i>
                {t('documents.guides.tab', 'Guides nutritionnels')}
                {guides.length > 0 && (
                  <Badge bg="success" className="ms-2">{guides.length}</Badge>
                )}
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* Documents Tab */}
            <Tab.Pane eventKey="documents">
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
            </Tab.Pane>

            {/* Guides Tab */}
            <Tab.Pane eventKey="guides">
              {guidesMessage && (
                <Alert
                  variant={guidesMessage.type}
                  dismissible
                  onClose={() => setGuidesMessage(null)}
                  className="mb-3"
                >
                  {guidesMessage.text}
                </Alert>
              )}

              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">{t('documents.guides.title', 'Guides de consultation')}</h5>
                    <small className="text-muted">
                      {t('documents.guides.description', 'Guides PDF nutritionnels par type de consultation. Partagez-les avec vos patients.')}
                    </small>
                  </div>
                  {hasPermission('documents.upload') && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={handleGenerateGuides}
                      disabled={generatingGuides}
                    >
                      {generatingGuides ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {t('documents.guides.generating', 'Generating...')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic me-2"></i>
                          {guides.length > 0
                            ? t('documents.guides.regenerate', 'Regénérer les guides')
                            : t('documents.guides.generate', 'Générer les guides')
                          }
                        </>
                      )}
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  {guidesLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : guides.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-book-medical fa-3x text-muted mb-3 d-block"></i>
                      <p className="text-muted mb-3">
                        {t('documents.guides.empty', 'Aucun guide de consultation généré. Cliquez sur le bouton ci-dessus pour créer les 8 guides nutritionnels.')}
                      </p>
                    </div>
                  ) : (
                    <Row xs={1} md={2} lg={3} className="g-3">
                      {guides.map(guide => {
                        const slug = getGuideSlug(guide);
                        const label = GUIDE_LABELS[slug] || guide.file_name;
                        return (
                          <Col key={guide.id}>
                            <Card className="h-100 border" style={{ borderLeft: '4px solid #2D6A4F' }}>
                              <Card.Body className="d-flex flex-column">
                                <div className="mb-2">
                                  <Badge bg="success" className="mb-2">{label}</Badge>
                                </div>
                                <Card.Title className="fs-6 mb-1">{guide.file_name}</Card.Title>
                                <Card.Text className="text-muted small flex-grow-1">
                                  {guide.description}
                                </Card.Text>
                                <div className="d-flex gap-2 mt-2">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handlePreviewGuide(guide)}
                                    title={t('documents.viewDocument', 'View')}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    {t('documents.viewDocument', 'Voir')}
                                  </Button>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleDownloadGuide(guide)}
                                    title={t('documents.downloadDocument', 'Download')}
                                  >
                                    <i className="fas fa-download me-1"></i>
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </Layout>
  );
};

export default DocumentsPage;
