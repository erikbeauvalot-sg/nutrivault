/**
 * Campaigns Widget
 * Displays email campaign statistics for the dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaPaperPlane, FaEnvelopeOpen, FaClock } from 'react-icons/fa';
import * as campaignService from '../../services/campaignService';

const CampaignsWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignData();
  }, []);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);

      // Fetch all campaigns to calculate stats
      const response = await campaignService.getCampaigns({ limit: 100 });
      const campaigns = response.data || [];

      // Calculate stats
      const totalCampaigns = campaigns.length;
      const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;
      const sentCampaigns = campaigns.filter(c => c.status === 'sent').length;
      const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length;

      // Calculate average open rate from sent campaigns
      const sentWithStats = campaigns.filter(c => c.status === 'sent' && c.stats?.openRate);
      const avgOpenRate = sentWithStats.length > 0
        ? Math.round(sentWithStats.reduce((sum, c) => sum + (parseFloat(c.stats?.openRate) || 0), 0) / sentWithStats.length)
        : 0;

      // Total recipients from sent campaigns
      const totalRecipients = campaigns
        .filter(c => c.status === 'sent')
        .reduce((sum, c) => sum + (c.recipient_count || 0), 0);

      setStats({
        total: totalCampaigns,
        drafts: draftCampaigns,
        sent: sentCampaigns,
        scheduled: scheduledCampaigns,
        avgOpenRate,
        totalRecipients
      });

      // Get recent campaigns (last 3)
      const recent = campaigns
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);
      setRecentCampaigns(recent);

    } catch (err) {
      console.error('Error fetching campaign data:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'info',
      sending: 'warning',
      sent: 'success',
      cancelled: 'danger'
    };
    return variants[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <Card className="h-100 border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom">
          <h6 className="mb-0">
            <FaEnvelope className="me-2 text-primary" />
            {t('dashboard.campaigns', 'Campagnes Email')}
          </h6>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" size="sm" variant="primary" />
        </Card.Body>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <FaEnvelope className="me-2 text-primary" />
          {t('dashboard.campaigns', 'Campagnes Email')}
        </h6>
        <Badge
          bg="primary"
          className="cursor-pointer"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/campaigns')}
        >
          {t('common.viewAll', 'Voir tout')}
        </Badge>
      </Card.Header>
      <Card.Body>
        {/* Stats Row */}
        <Row className="mb-3 text-center">
          <Col xs={3}>
            <div className="border-end">
              <div className="h4 mb-0 text-primary">{stats.sent}</div>
              <small className="text-muted">{t('dashboard.sent', 'Envoyées')}</small>
            </div>
          </Col>
          <Col xs={3}>
            <div className="border-end">
              <div className="h4 mb-0 text-info">{stats.scheduled}</div>
              <small className="text-muted">{t('dashboard.scheduled', 'Planifiées')}</small>
            </div>
          </Col>
          <Col xs={3}>
            <div className="border-end">
              <div className="h4 mb-0 text-secondary">{stats.drafts}</div>
              <small className="text-muted">{t('dashboard.drafts', 'Brouillons')}</small>
            </div>
          </Col>
          <Col xs={3}>
            <div>
              <div className="h4 mb-0 text-success">{stats.avgOpenRate}%</div>
              <small className="text-muted">{t('dashboard.openRate', 'Ouverture')}</small>
            </div>
          </Col>
        </Row>

        {/* Stats Summary */}
        <div className="bg-light rounded p-2 mb-3 small">
          <div className="d-flex justify-content-between">
            <span className="text-muted">
              <FaPaperPlane className="me-1" />
              {t('dashboard.totalRecipients', 'Total destinataires')}
            </span>
            <strong>{stats.totalRecipients.toLocaleString()}</strong>
          </div>
        </div>

        {/* Recent Campaigns */}
        <h6 className="small text-muted mb-2">
          {t('dashboard.recentCampaigns', 'Campagnes récentes')}
        </h6>

        {recentCampaigns.length === 0 ? (
          <div className="text-center text-muted py-3">
            <FaEnvelope size={24} className="mb-2 opacity-50" />
            <p className="small mb-0">{t('dashboard.noCampaigns', 'Aucune campagne')}</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {recentCampaigns.map(campaign => (
              <div
                key={campaign.id}
                className="list-group-item px-0 py-2 border-0 d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                <div className="text-truncate me-2">
                  <div className="fw-medium small text-truncate" style={{ maxWidth: '180px' }}>
                    {campaign.name}
                  </div>
                  <small className="text-muted">
                    {campaign.status === 'sent' && campaign.sent_at ? (
                      <><FaPaperPlane size={10} className="me-1" />{formatDate(campaign.sent_at)}</>
                    ) : campaign.status === 'scheduled' && campaign.scheduled_at ? (
                      <><FaClock size={10} className="me-1" />{formatDate(campaign.scheduled_at)}</>
                    ) : (
                      formatDate(campaign.created_at)
                    )}
                  </small>
                </div>
                <Badge bg={getStatusBadge(campaign.status)} className="text-capitalize">
                  {t(`campaigns.status.${campaign.status}`, campaign.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Quick Action */}
        <div className="mt-3 pt-3 border-top">
          <button
            className="btn btn-outline-primary btn-sm w-100"
            onClick={() => navigate('/campaigns/new')}
          >
            <FaEnvelope className="me-2" />
            {t('campaigns.newCampaign', 'Nouvelle campagne')}
          </button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CampaignsWidget;
