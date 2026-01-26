/**
 * EmailTemplatesPage Component
 * Admin-only email template management page
 * Sprint 5: US-5.5.2 - Email Templates
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  Form,
  InputGroup,
  Dropdown,
  ButtonGroup
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import emailTemplateService from '../services/emailTemplateService';
import EmailTemplateModal from '../components/EmailTemplateModal';
import EmailPreviewModal from '../components/EmailPreviewModal';
import EmailTemplateTranslationModal from '../components/EmailTemplateTranslationModal';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaSearch,
  FaFilter,
  FaEnvelope,
  FaGlobe
} from 'react-icons/fa';

const EmailTemplatesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Category options
  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'invoice', label: 'Invoice', icon: '💰' },
    { value: 'document_share', label: 'Document Share', icon: '📄' },
    { value: 'payment_reminder', label: 'Payment Reminder', icon: '🔔' },
    { value: 'appointment_reminder', label: 'Appointment Reminder', icon: '📅' },
    { value: 'follow_up', label: 'Follow-up', icon: '📋' },
    { value: 'general', label: 'General', icon: '✉️' }
  ];

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchTemplates();
    }
  }, [user, categoryFilter, activeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const filters = {};

      if (categoryFilter) filters.category = categoryFilter;
      if (activeFilter !== '') filters.is_active = activeFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await emailTemplateService.getAllTemplates(filters);
      // Backend returns { success: true, data: [...], count: N }
      const templatesData = response.data?.data || response.data || [];
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.response?.data?.error || 'Failed to load email templates');
      setTemplates([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleTranslations = (template) => {
    setSelectedTemplate(template);
    setShowTranslationModal(true);
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const overrides = {
        name: `${template.name} (Copy)`,
        is_system: false
      };
      await emailTemplateService.duplicateTemplate(template.id, overrides);
      fetchTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      alert(err.response?.data?.error || 'Failed to duplicate template');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await emailTemplateService.toggleActive(template.id);
      fetchTemplates();
    } catch (err) {
      console.error('Error toggling template status:', err);
      alert(err.response?.data?.error || 'Failed to toggle template status');
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (template.is_system) {
      alert('System templates cannot be deleted. You can deactivate them instead.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await emailTemplateService.deleteTemplate(template.id);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleModalClose = (refresh) => {
    setShowTemplateModal(false);
    setShowPreviewModal(false);
    setSelectedTemplate(null);
    if (refresh) {
      fetchTemplates();
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : '✉️';
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  if (loading && templates.length === 0) {
    return (
      <Layout>
        <Container className="mt-4">
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="mt-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h2>
                  <FaEnvelope className="me-2" />
                  Email Templates
                </h2>
                <p className="text-muted mb-0">Manage email templates for automated notifications</p>
              </div>
              <Button
                variant="primary"
                onClick={handleCreateTemplate}
              >
                <FaPlus className="me-2" />
                Create Template
              </Button>
            </div>
          </Col>
        </Row>

        {/* Filters */}
        <Row className="mb-4">
          <Col xs={12} md={6} className="mb-3 mb-md-0">
            <Form onSubmit={handleSearch}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="primary" type="submit">
                  Search
                </Button>
              </InputGroup>
            </Form>
          </Col>
          <Col md={3}>
            <Form.Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Templates Grid */}
        <Row>
          {templates.length === 0 ? (
            <Col>
              <Alert variant="info">
                No email templates found. Create your first template to get started!
              </Alert>
            </Col>
          ) : (
            templates.map(template => (
              <Col key={template.id} lg={6} xl={4} className="mb-4">
                <Card className={!template.is_active ? 'opacity-75' : ''}>
                  <Card.Header className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <span className="me-2">{getCategoryIcon(template.category)}</span>
                        <strong>{template.name}</strong>
                      </div>
                      <div>
                        <Badge bg="secondary" className="me-2">
                          {template.slug}
                        </Badge>
                        <Badge bg="info" className="me-2">
                          v{template.version}
                        </Badge>
                        {template.is_system && (
                          <Badge bg="warning" text="dark">
                            System
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {template.is_active ? (
                        <FaToggleOn className="text-success" size={24} />
                      ) : (
                        <FaToggleOff className="text-secondary" size={24} />
                      )}
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-2">
                      <small className="text-muted">Category:</small>
                      <div>
                        <Badge bg="primary">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </div>
                    </div>
                    {template.description && (
                      <div className="mb-2">
                        <small className="text-muted">Description:</small>
                        <div className="text-truncate" title={template.description}>
                          {template.description}
                        </div>
                      </div>
                    )}
                    <div>
                      <small className="text-muted">Subject:</small>
                      <div className="text-truncate font-monospace small" title={template.subject}>
                        {template.subject}
                      </div>
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <ButtonGroup size="sm" className="w-100">
                      <Button
                        variant="outline-primary"
                        onClick={() => handlePreviewTemplate(template)}
                        title="Preview"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => handleEditTemplate(template)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-info"
                        onClick={() => handleDuplicateTemplate(template)}
                        title="Duplicate"
                      >
                        <FaCopy />
                      </Button>
                      <Button
                        variant="outline-success"
                        onClick={() => handleTranslations(template)}
                        title="Translations"
                      >
                        <FaGlobe />
                      </Button>
                      <Button
                        variant={template.is_active ? 'outline-warning' : 'outline-success'}
                        onClick={() => handleToggleActive(template)}
                        title={template.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {template.is_active ? <FaToggleOff /> : <FaToggleOn />}
                      </Button>
                      <Button
                        variant="outline-danger"
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={template.is_system}
                        title={template.is_system ? 'System templates cannot be deleted' : 'Delete'}
                      >
                        <FaTrash />
                      </Button>
                    </ButtonGroup>
                  </Card.Footer>
                </Card>
              </Col>
            ))
          )}
        </Row>

        {/* Modals */}
        {showTemplateModal && (
          <EmailTemplateModal
            show={showTemplateModal}
            onHide={handleModalClose}
            template={selectedTemplate}
          />
        )}

        {showPreviewModal && selectedTemplate && (
          <EmailPreviewModal
            show={showPreviewModal}
            onHide={handleModalClose}
            template={selectedTemplate}
          />
        )}

        {showTranslationModal && selectedTemplate && (
          <EmailTemplateTranslationModal
            show={showTranslationModal}
            onHide={() => setShowTranslationModal(false)}
            template={selectedTemplate}
            onSaved={fetchTemplates}
          />
        )}
      </Container>
    </Layout>
  );
};

export default EmailTemplatesPage;
