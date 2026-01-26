/**
 * BillingTemplatesPage Component
 * Manage billing templates - list, create, edit, delete, clone
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  Dropdown
} from 'react-bootstrap';
import {
  FaPlus,
  FaStar,
  FaRegStar,
  FaSearch,
  FaSync
} from 'react-icons/fa';
import Layout from '../components/layout/Layout';
import billingTemplateService from '../services/billingTemplateService';
import BillingTemplateModal from '../components/BillingTemplateModal';
import ActionButton from '../components/ActionButton';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';

const BillingTemplatesPage = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [activeFilter]);

  /**
   * Fetch all billing templates
   */
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (activeFilter !== 'all') {
        filters.is_active = activeFilter === 'active';
      }

      const response = await billingTemplateService.getAllTemplates(filters);
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.response?.data?.error || 'Failed to load billing templates');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle create new template
   */
  const handleCreate = () => {
    setModalMode('create');
    setSelectedTemplate(null);
    setShowModal(true);
  };

  /**
   * Handle edit template
   */
  const handleEdit = (template) => {
    setModalMode('edit');
    setSelectedTemplate(template);
    setShowModal(true);
  };

  /**
   * Handle delete template
   */
  const handleDelete = (template) => {
    if (template.is_default) {
      setError(t('billingTemplates.cannotDeleteDefault', 'Cannot delete the default template. Set another template as default first.'));
      return;
    }

    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await billingTemplateService.deleteTemplate(templateToDelete.id);
      setSuccess(t('billingTemplates.deleteSuccess', { name: templateToDelete.name, defaultValue: `Template "${templateToDelete.name}" deleted successfully` }));
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err.response?.data?.error || t('billingTemplates.deleteFailed', 'Failed to delete template'));
    } finally {
      setTemplateToDelete(null);
    }
  };

  /**
   * Handle clone template
   */
  const handleClone = async (template) => {
    const newName = prompt(`Enter name for cloned template:`, `${template.name} (Copy)`);

    if (!newName) return;

    try {
      await billingTemplateService.cloneTemplate(template.id, newName);
      setSuccess(`Template cloned successfully as "${newName}"`);
      fetchTemplates();
    } catch (err) {
      console.error('Error cloning template:', err);
      setError(err.response?.data?.error || 'Failed to clone template');
    }
  };

  /**
   * Handle set as default
   */
  const handleSetDefault = async (template) => {
    try {
      await billingTemplateService.setAsDefault(template.id);
      setSuccess(`"${template.name}" set as default template`);
      fetchTemplates();
    } catch (err) {
      console.error('Error setting default template:', err);
      setError(err.response?.data?.error || 'Failed to set default template');
    }
  };

  /**
   * Handle modal save (create or update)
   */
  const handleModalSave = () => {
    setShowModal(false);
    setSuccess(
      modalMode === 'create'
        ? 'Template created successfully'
        : 'Template updated successfully'
    );
    fetchTemplates();
  };

  /**
   * Filter templates by search term
   */
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h1 className="mb-0">📋 Billing Templates</h1>
            <p className="text-muted">Manage reusable billing templates for common services</p>
          </Col>
          <Col xs="auto">
            <Button variant="primary" onClick={handleCreate}>
              <FaPlus className="me-2" />
              New Template
            </Button>
          </Col>
        </Row>

        {/* Alerts */}
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

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={6}>
                <Form.Group>
                  <div className="position-relative">
                    <FaSearch className="position-absolute" style={{ left: '10px', top: '12px', color: '#6c757d' }} />
                    <Form.Control
                      type="text"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '35px' }}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  <option value="all">All Templates</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </Form.Select>
              </Col>
              <Col md={2} className="text-end">
                <Button variant="outline-secondary" onClick={fetchTemplates}>
                  <FaSync className="me-1" />
                  Refresh
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Templates Table */}
        <Card>
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-2 text-muted">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-0">No templates found</p>
                {searchTerm && (
                  <small className="text-muted">Try adjusting your search or filters</small>
                )}
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Name</th>
                    <th>Description</th>
                    <th className="text-center">Items</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      onClick={() => handleEdit(template)}
                      className="clickable-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">
                        {template.is_default ? (
                          <FaStar className="text-warning" title="Default template" />
                        ) : (
                          <FaRegStar className="text-muted" title="Not default" />
                        )}
                      </td>
                      <td>
                        <strong>{template.name}</strong>
                      </td>
                      <td>
                        <small className="text-muted">
                          {template.description || '-'}
                        </small>
                      </td>
                      <td className="text-center">
                        <Badge bg="secondary">{template.item_count}</Badge>
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(template.total_amount)}</strong>
                      </td>
                      <td className="text-center">
                        {template.is_active ? (
                          <Badge bg="success">Active</Badge>
                        ) : (
                          <Badge bg="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons justify-content-end">
                          <ActionButton
                            action="edit"
                            onClick={() => handleEdit(template)}
                            title="Edit"
                          />
                          <ActionButton
                            action="clone"
                            onClick={() => handleClone(template)}
                            title="Clone"
                          />
                          {!template.is_default && (
                            <ActionButton
                              action="setDefault"
                              onClick={() => handleSetDefault(template)}
                              title="Set as Default"
                            />
                          )}
                          <ActionButton
                            action="delete"
                            onClick={() => handleDelete(template)}
                            disabled={template.is_default}
                            title={template.is_default ? 'Cannot delete default template' : 'Delete'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Create/Edit Modal */}
      {showModal && (
        <BillingTemplateModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleModalSave}
          mode={modalMode}
          template={selectedTemplate}
        />
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        show={showDeleteConfirm}
        onHide={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete(null);
        }}
        onConfirm={confirmDeleteTemplate}
        title={t('common.confirmation', 'Confirmation')}
        message={t('billingTemplates.confirmDelete', { name: templateToDelete?.name, defaultValue: `Are you sure you want to delete "${templateToDelete?.name}"?` })}
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </Layout>
  );
};

export default BillingTemplatesPage;
