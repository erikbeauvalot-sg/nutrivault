/**
 * Campaign Stats Page
 * Shows detailed statistics for a campaign
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, ProgressBar, Form, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import * as campaignService from '../services/campaignService';

const CampaignStatsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  // State
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Load campaign stats
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await campaignService.getCampaignStats(id);
      setCampaign(data.campaign);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading campaign stats:', error);
      toast.error(t('campaigns.loadError', 'Failed to load campaign'));
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  // Load recipients
  const loadRecipients = useCallback(async () => {
    try {
      setRecipientsLoading(true);
      const filters = {
        page: currentPage,
        limit: 50,
        status: statusFilter || undefined,
        search: searchFilter || undefined
      };

      const { data, pagination: pag } = await campaignService.getCampaignRecipients(id, filters);
      setRecipients(data);
      setPagination(pag);
    } catch (error) {
      console.error('Error loading recipients:', error);
    } finally {
      setRecipientsLoading(false);
    }
  }, [id, currentPage, statusFilter, searchFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!loading) {
      loadRecipients();
    }
  }, [loadRecipients, loading]);

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

  // Get status badge
  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      sent: 'success',
      failed: 'danger',
      bounced: 'warning'
    };
    return (
      <Badge bg={variants[status] || 'secondary'}>
        {t(`campaigns.recipientStatus.${status}`, status)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <Button
              variant="link"
              className="p-0 mb-2 text-decoration-none"
              onClick={() => navigate('/campaigns')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              {t('campaigns.backToList', 'Back to campaigns')}
            </Button>
            <h1 className="h3 mb-0">{campaign?.name}</h1>
            <p className="text-muted mb-0">{campaign?.subject}</p>
          </Col>
        </Row>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="h-100">
              <Card.Body className="text-center">
                <div className="display-6 text-primary fw-bold">{stats?.total || 0}</div>
                <div className="text-muted">{t('campaigns.totalRecipients', 'Total Recipients')}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100">
              <Card.Body className="text-center">
                <div className="display-6 text-success fw-bold">{stats?.sent || 0}</div>
                <div className="text-muted">{t('campaigns.delivered', 'Delivered')}</div>
                <ProgressBar
                  now={stats?.total ? (stats.sent / stats.total) * 100 : 0}
                  variant="success"
                  className="mt-2"
                  style={{ height: '4px' }}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100">
              <Card.Body className="text-center">
                <div className="display-6 text-info fw-bold">{stats?.opened || 0}</div>
                <div className="text-muted">
                  {t('campaigns.opened', 'Opened')}
                  <span className="ms-1 text-info">({stats?.openRate || 0}%)</span>
                </div>
                <ProgressBar
                  now={parseFloat(stats?.openRate) || 0}
                  variant="info"
                  className="mt-2"
                  style={{ height: '4px' }}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100">
              <Card.Body className="text-center">
                <div className="display-6 text-warning fw-bold">{stats?.clicked || 0}</div>
                <div className="text-muted">
                  {t('campaigns.clicked', 'Clicked')}
                  <span className="ms-1 text-warning">({stats?.clickRate || 0}%)</span>
                </div>
                <ProgressBar
                  now={parseFloat(stats?.clickRate) || 0}
                  variant="warning"
                  className="mt-2"
                  style={{ height: '4px' }}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Additional Stats */}
        <Row className="mb-4">
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('campaigns.deliveryStatus', 'Delivery Status')}</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('campaigns.sent', 'Sent')}</span>
                  <Badge bg="success">{stats?.sent || 0}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('campaigns.pending', 'Pending')}</span>
                  <Badge bg="secondary">{stats?.pending || 0}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>{t('campaigns.failed', 'Failed')}</span>
                  <Badge bg="danger">{stats?.failed || 0}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span>{t('campaigns.bounced', 'Bounced')}</span>
                  <Badge bg="warning">{stats?.bounced || 0}</Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('campaigns.campaignInfo', 'Campaign Info')}</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">{t('campaigns.campaignType', 'Type')}</span>
                  <span className="text-capitalize">{campaign?.campaign_type}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">{t('campaigns.statusLabel', 'Status')}</span>
                  <Badge bg={campaign?.status === 'sent' ? 'success' : 'secondary'}>
                    {t(`campaigns.status.${campaign?.status}`, campaign?.status)}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">{t('campaigns.sentAt', 'Sent at')}</span>
                  <span>{formatDate(campaign?.sent_at)}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">{t('campaigns.recipients', 'Recipients')}</span>
                  <span>{campaign?.recipient_count || 0}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recipients Table */}
        <Card>
          <Card.Header>
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-0">{t('campaigns.recipientsList', 'Recipients')}</h5>
              </Col>
              <Col md={3}>
                <Form.Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t('campaigns.allStatuses', 'All statuses')}</option>
                  <option value="sent">{t('campaigns.recipientStatus.sent', 'Sent')}</option>
                  <option value="pending">{t('campaigns.recipientStatus.pending', 'Pending')}</option>
                  <option value="failed">{t('campaigns.recipientStatus.failed', 'Failed')}</option>
                  <option value="bounced">{t('campaigns.recipientStatus.bounced', 'Bounced')}</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <InputGroup size="sm">
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder={t('campaigns.searchRecipients', 'Search...')}
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </InputGroup>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="p-0">
            {recipientsLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" />
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-4 text-muted">
                {t('campaigns.noRecipients', 'No recipients found')}
              </div>
            ) : (
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>{t('campaigns.recipient', 'Recipient')}</th>
                    <th>{t('campaigns.statusLabel', 'Status')}</th>
                    <th>{t('campaigns.sentAt', 'Sent')}</th>
                    <th>{t('campaigns.openedAt', 'Opened')}</th>
                    <th>{t('campaigns.clickedAt', 'Clicked')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map(recipient => (
                    <tr key={recipient.id}>
                      <td>
                        {recipient.patient ? (
                          <div>
                            <div>{recipient.patient.name}</div>
                            <small className="text-muted">{recipient.email}</small>
                          </div>
                        ) : (
                          recipient.email
                        )}
                      </td>
                      <td>{getStatusBadge(recipient.status)}</td>
                      <td>{formatDate(recipient.sent_at)}</td>
                      <td>
                        {recipient.opened_at ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            {formatDate(recipient.opened_at)}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {recipient.clicked_at ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            {formatDate(recipient.clicked_at)}
                          </span>
                        ) : '-'}
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
      </Container>
    </Layout>
  );
};

export default CampaignStatsPage;
