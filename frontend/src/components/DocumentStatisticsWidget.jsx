/**
 * DocumentStatisticsWidget Component
 * Widget displaying document statistics and counts
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';

const DocumentStatisticsWidget = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocumentStatistics();
      const data = response.data.data || response.data;
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('documents.failedToLoadStats', 'Failed to load statistics'));
      console.error('Error fetching document stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    return documentService.formatFileSize(bytes);
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
          <p className="mb-0 mt-2 small">{t('common.loading')}</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            <small>{error}</small>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <small className="text-muted">{t('documents.noStatsAvailable', 'No statistics available')}</small>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">{t('documents.statistics', 'Document Statistics')}</h6>
      </Card.Header>
      <Card.Body>
        <Row className="text-center">
          <Col xs={6} md={3} className="mb-3">
            <div className="h4 mb-1">{stats.totalDocuments || 0}</div>
            <small className="text-muted">{t('documents.totalDocuments', 'Total Documents')}</small>
          </Col>
          <Col xs={6} md={3} className="mb-3">
            <div className="h4 mb-1">{formatFileSize(stats.totalSize || 0)}</div>
            <small className="text-muted">{t('documents.totalSize', 'Total Size')}</small>
          </Col>
          <Col xs={6} md={3} className="mb-3">
            <div className="h4 mb-1">{stats.byType?.find(t => t.resource_type === 'patient')?.count || 0}</div>
            <small className="text-muted">{t('documents.patientDocuments', 'Patient Docs')}</small>
          </Col>
          <Col xs={6} md={3} className="mb-3">
            <div className="h4 mb-1">{stats.byType?.find(t => t.resource_type === 'visit')?.count || 0}</div>
            <small className="text-muted">{t('documents.visitDocuments', 'Visit Docs')}</small>
          </Col>
        </Row>

        {stats.byType && stats.byType.length > 0 && (
          <div className="mt-3">
            <small className="text-muted d-block mb-2">{t('documents.breakdownByType', 'Breakdown by type')}:</small>
            {stats.byType.map((typeStat) => (
              <div key={typeStat.resource_type} className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-capitalize">{typeStat.resource_type}</small>
                <small className="fw-bold">{typeStat.count}</small>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DocumentStatisticsWidget;