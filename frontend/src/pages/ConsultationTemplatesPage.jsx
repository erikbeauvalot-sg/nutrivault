import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  InputGroup
} from 'react-bootstrap';
import {
  FaPlus,
  FaSearch,
  FaSync,
  FaCopy,
  FaTrash,
  FaEdit,
  FaShareAlt,
  FaLock
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import consultationTemplateService from '../services/consultationTemplateService';
import { useTranslation } from 'react-i18next';
import '../styles/MobileListCards.css';

const TEMPLATE_TYPE_COLORS = {
  anamnesis: '#e74c3c',
  evaluation: '#3498db',
  meal_plan: '#2ecc71',
  follow_up: '#f39c12',
  general: '#9b59b6',
  custom: '#1abc9c'
};

const ConsultationTemplatesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [typeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (typeFilter) filters.template_type = typeFilter;
      const response = await consultationTemplateService.getTemplates(filters);
      setTemplates(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || t('consultationTemplates.loadError', 'Failed to load templates'));
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template) => {
    const newName = prompt(
      t('consultationTemplates.duplicatePrompt', 'Enter name for the copy:'),
      `${template.name} (${t('common.copy', 'Copy')})`
    );
    if (!newName) return;
    try {
      await consultationTemplateService.duplicateTemplate(template.id, newName);
      setSuccess(t('consultationTemplates.duplicateSuccess', 'Template duplicated successfully'));
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || t('consultationTemplates.duplicateError', 'Failed to duplicate template'));
    }
  };

  const handleDelete = (template) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await consultationTemplateService.deleteTemplate(templateToDelete.id);
      setSuccess(t('consultationTemplates.deleteSuccess', 'Template deleted successfully'));
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || t('consultationTemplates.deleteError', 'Failed to delete template'));
    } finally {
      setTemplateToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const filteredTemplates = templates.filter(tmpl =>
    tmpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tmpl.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemCount = (template) => template.items?.length || 0;

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4 align-items-center">
          <Col>
            <h2 className="mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>
              {t('consultationTemplates.title', 'Consultation Templates')}
            </h2>
            <p className="text-muted mb-0">
              {t('consultationTemplates.subtitle', 'Create and manage reusable consultation templates')}
            </p>
          </Col>
          <Col xs="auto">
            <Button
              variant="primary"
              onClick={() => navigate('/consultation-templates/new')}
              className="d-flex align-items-center gap-2"
            >
              <FaPlus /> {t('consultationTemplates.newTemplate', 'New Template')}
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Filters */}
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body>
            <Row className="align-items-center g-3">
              <Col md={5}>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    placeholder={t('common.search', 'Search...')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col md={4}>
                <Form.Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">{t('consultationTemplates.allTypes', 'All types')}</option>
                  <option value="anamnesis">{t('consultationTemplates.types.anamnesis', 'Anamnesis')}</option>
                  <option value="evaluation">{t('consultationTemplates.types.evaluation', 'Evaluation')}</option>
                  <option value="meal_plan">{t('consultationTemplates.types.meal_plan', 'Meal Plan')}</option>
                  <option value="follow_up">{t('consultationTemplates.types.follow_up', 'Follow-up')}</option>
                  <option value="general">{t('consultationTemplates.types.general', 'General')}</option>
                  <option value="custom">{t('consultationTemplates.types.custom', 'Custom')}</option>
                </Form.Select>
              </Col>
              <Col md={3} className="text-end">
                <Button variant="outline-secondary" onClick={fetchTemplates} className="d-flex align-items-center gap-1 ms-auto">
                  <FaSync /> {t('common.refresh', 'Refresh')}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Template Grid */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2 text-muted">{t('common.loading', 'Loading...')}</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <p className="text-muted fs-5 mb-3">{t('consultationTemplates.noTemplates', 'No templates found')}</p>
              <Button variant="primary" onClick={() => navigate('/consultation-templates/new')}>
                <FaPlus className="me-2" /> {t('consultationTemplates.createFirst', 'Create your first template')}
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-3">
            {filteredTemplates.map(template => (
              <Col key={template.id} xs={12} md={6} lg={4}>
                <Card
                  className="h-100 border-0 shadow-sm"
                  style={{
                    cursor: 'pointer',
                    borderLeft: `4px solid ${template.color || TEMPLATE_TYPE_COLORS[template.template_type] || '#6c757d'}`,
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                  onClick={() => navigate(`/consultation-templates/${template.id}/edit`)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <h6 className="mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                          {template.name}
                        </h6>
                        {template.description && (
                          <small className="text-muted d-block" style={{ lineHeight: 1.3 }}>
                            {template.description.substring(0, 80)}{template.description.length > 80 ? '...' : ''}
                          </small>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        {template.visibility === 'shared' ? (
                          <FaShareAlt className="text-info" title={t('consultationTemplates.shared', 'Shared')} />
                        ) : (
                          <FaLock className="text-muted" title={t('consultationTemplates.private', 'Private')} style={{ fontSize: '0.8em' }} />
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2 mb-3 flex-wrap">
                      <Badge
                        bg="none"
                        style={{
                          backgroundColor: TEMPLATE_TYPE_COLORS[template.template_type] || '#6c757d',
                          fontSize: '0.7rem'
                        }}
                      >
                        {t(`consultationTemplates.types.${template.template_type}`, template.template_type)}
                      </Badge>
                      {template.is_default && (
                        <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
                          {t('common.default', 'Default')}
                        </Badge>
                      )}
                    </div>

                    <div className="text-muted small">
                      <span>{getItemCount(template)} {t('consultationTemplates.itemsCount', 'items')}</span>
                    </div>
                  </Card.Body>

                  <Card.Footer className="bg-transparent border-0 pt-0" onClick={e => e.stopPropagation()}>
                    <div className="d-flex justify-content-end gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => navigate(`/consultation-templates/${template.id}/edit`)} title={t('common.edit', 'Edit')}>
                        <FaEdit />
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => handleDuplicate(template)} title={t('common.duplicate', 'Duplicate')}>
                        <FaCopy />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(template)} title={t('common.delete', 'Delete')}>
                        <FaTrash />
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>

      <ConfirmModal
        show={showDeleteConfirm}
        onHide={() => { setShowDeleteConfirm(false); setTemplateToDelete(null); }}
        onConfirm={confirmDelete}
        title={t('common.confirmation', 'Confirmation')}
        message={t('consultationTemplates.confirmDelete', { name: templateToDelete?.name, defaultValue: `Delete "${templateToDelete?.name}"? If the template has existing notes, it will be deactivated instead.` })}
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </Layout>
  );
};

export default ConsultationTemplatesPage;
