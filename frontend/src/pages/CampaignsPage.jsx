/**
 * Campaigns Page
 * Main page for email campaign management
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Spinner, Badge, Modal, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ActionButton from '../components/ActionButton';
import Pagination from '../components/common/Pagination';
import { useAuth } from '../contexts/AuthContext';
import * as campaignService from '../services/campaignService';

const CampaignsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // State
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(null);

  // Permissions
  const canCreate = hasPermission('campaigns.create');
  const canUpdate = hasPermission('campaigns.update');
  const canDelete = hasPermission('campaigns.delete');
  const canSend = hasPermission('campaigns.send');

  // Status options
  const statusOptions = [
    { value: '', label: t('campaigns.allStatuses', 'All statuses') },
    { value: 'draft', label: t('campaigns.status.draft', 'Draft') },
    { value: 'scheduled', label: t('campaigns.status.scheduled', 'Scheduled') },
    { value: 'sending', label: t('campaigns.status.sending', 'Sending') },
    { value: 'sent', label: t('campaigns.status.sent', 'Sent') },
    { value: 'cancelled', label: t('campaigns.status.cancelled', 'Cancelled') }
  ];

  // Type options
  const typeOptions = [
    { value: '', label: t('campaigns.allTypes', 'All types') },
    { value: 'newsletter', label: t('campaigns.type.newsletter', 'Newsletter') },
    { value: 'promotional', label: t('campaigns.type.promotional', 'Promotional') },
    { value: 'educational', label: t('campaigns.type.educational', 'Educational') },
    { value: 'reminder', label: t('campaigns.type.reminder', 'Reminder') }
  ];

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: 20,
        search: search || undefined,
        status: selectedStatus || undefined,
        campaign_type: selectedType || undefined
      };

      const { data, pagination: pag } = await campaignService.getCampaigns(filters);
      setCampaigns(data);
      setPagination(pag);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error(t('campaigns.loadError', 'Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, selectedStatus, selectedType, t]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Apply filters with debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadCampaigns();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle filter changes
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  // Handle delete
  const handleDeleteClick = (campaign) => {
    setDeletingCampaign(campaign);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingCampaign) return;

    try {
      await campaignService.deleteCampaign(deletingCampaign.id);
      toast.success(t('campaigns.deleteSuccess', 'Campaign deleted successfully'));
      setShowDeleteModal(false);
      setDeletingCampaign(null);
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error(t('campaigns.deleteError', 'Failed to delete campaign'));
    }
  };

  // Handle duplicate
  const handleDuplicate = async (campaign) => {
    try {
      const newCampaign = await campaignService.duplicateCampaign(campaign.id);
      toast.success(t('campaigns.duplicateSuccess', 'Campaign duplicated successfully'));
      navigate(`/campaigns/${newCampaign.id}/edit`);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error(t('campaigns.duplicateError', 'Failed to duplicate campaign'));
    }
  };

  // Get status badge variant
  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'info',
      sending: 'warning',
      sent: 'success',
      cancelled: 'danger'
    };
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {t(`campaigns.status.${status}`, status)}
      </Badge>
    );
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const variants = {
      newsletter: 'primary',
      promotional: 'warning',
      educational: 'info',
      reminder: 'secondary'
    };
    return (
      <Badge bg={variants[type] || 'secondary'} className="text-capitalize">
        {t(`campaigns.type.${type}`, type)}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-1">{t('campaigns.title', 'Email Campaigns')}</h1>
                <p className="text-muted mb-0">
                  {t('campaigns.subtitle', 'Create and manage email marketing campaigns')}
                </p>
              </div>
              {canCreate && (
                <Button
                  variant="primary"
                  onClick={() => navigate('/campaigns/new')}
                >
                  <i className="bi bi-plus-lg me-2"></i>
                  {t('campaigns.create', 'New Campaign')}
                </Button>
              )}
            </div>
          </Col>
        </Row>

        {/* Filters */}
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder={t('campaigns.searchPlaceholder', 'Search campaigns...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={selectedStatus}
                  onChange={handleFilterChange(setSelectedStatus)}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={selectedType}
                  onChange={handleFilterChange(setSelectedType)}
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setSearch('');
                    setSelectedStatus('');
                    setSelectedType('');
                    setCurrentPage(1);
                  }}
                  className="w-100"
                >
                  <i className="bi bi-x-lg me-1"></i>
                  {t('common.clear', 'Clear')}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">{t('common.loading', 'Loading...')}</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-envelope-paper display-4 text-muted mb-3 d-block"></i>
                <h5 className="text-muted">{t('campaigns.noCampaigns', 'No campaigns found')}</h5>
                {canCreate && (
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => navigate('/campaigns/new')}
                  >
                    {t('campaigns.createFirst', 'Create your first campaign')}
                  </Button>
                )}
              </div>
            ) : (
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>{t('campaigns.name', 'Name')}</th>
                    <th>{t('campaigns.campaignType', 'Type')}</th>
                    <th>{t('campaigns.statusLabel', 'Status')}</th>
                    <th className="text-center">{t('campaigns.recipients', 'Recipients')}</th>
                    <th className="text-center">{t('campaigns.openRate', 'Open Rate')}</th>
                    <th>{t('campaigns.sentAt', 'Sent')}</th>
                    <th className="text-end">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => (
                    <tr key={campaign.id}>
                      <td>
                        <div>
                          <strong>{campaign.name}</strong>
                          <br />
                          <small className="text-muted">{campaign.subject}</small>
                        </div>
                      </td>
                      <td>{getTypeBadge(campaign.campaign_type)}</td>
                      <td>{getStatusBadge(campaign.status)}</td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">
                          {campaign.recipient_count || 0}
                        </span>
                      </td>
                      <td className="text-center">
                        {campaign.stats?.openRate ? (
                          <span className={campaign.stats.openRate > 20 ? 'text-success' : 'text-warning'}>
                            {campaign.stats.openRate}%
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {campaign.sent_at ? formatDate(campaign.sent_at) : (
                          campaign.scheduled_at ? (
                            <span className="text-info">
                              <i className="bi bi-clock me-1"></i>
                              {formatDate(campaign.scheduled_at)}
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="text-end">
                        <div className="action-buttons">
                          <ActionButton
                            action="view"
                            onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            title={t('common.view', 'View')}
                          />
                          {canUpdate && ['draft', 'scheduled'].includes(campaign.status) && (
                            <ActionButton
                              action="edit"
                              onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                              title={t('common.edit', 'Edit')}
                            />
                          )}
                          {canCreate && (
                            <ActionButton
                              action="duplicate"
                              onClick={() => handleDuplicate(campaign)}
                              title={t('campaigns.duplicate', 'Duplicate')}
                            />
                          )}
                          {campaign.status === 'sent' && (
                            <ActionButton
                              action="preview"
                              icon="📊"
                              onClick={() => navigate(`/campaigns/${campaign.id}/stats`)}
                              title={t('campaigns.viewStats', 'View Stats')}
                            />
                          )}
                          {canDelete && campaign.status !== 'sending' && (
                            <ActionButton
                              action="delete"
                              onClick={() => handleDeleteClick(campaign)}
                              title={t('common.delete', 'Delete')}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Card.Footer>
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </Card.Footer>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('campaigns.deleteTitle', 'Delete Campaign')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('campaigns.deleteConfirm', 'Are you sure you want to delete the campaign')} <strong>"{deletingCampaign?.name}"</strong>?
            </p>
            <p className="text-muted small">
              {t('campaigns.deleteWarning', 'This action cannot be undone.')}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default CampaignsPage;
