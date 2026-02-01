/**
 * SharingHistory Component
 * Displays document and recipe sharing history for a patient
 */

import { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import * as documentService from '../services/documentService';
import * as recipeService from '../services/recipeService';
import { formatDate } from '../utils/dateUtils';

const SharingHistory = ({ patientId }) => {
  const { t } = useTranslation();
  const [documentShares, setDocumentShares] = useState([]);
  const [recipeShares, setRecipeShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (patientId) {
      loadShares();
    }
  }, [patientId]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const [docShares, recShares] = await Promise.all([
        documentService.getPatientDocumentShares(patientId),
        recipeService.getPatientRecipes(patientId)
      ]);
      setDocumentShares(Array.isArray(docShares) ? docShares : []);
      setRecipeShares(Array.isArray(recShares) ? recShares : []);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    return '📄';
  };

  const totalShares = documentShares.length + recipeShares.length;

  const allShares = [
    ...documentShares.map(s => ({
      type: 'document',
      id: s.id,
      title: s.document?.original_name || s.document?.file_name || 'Document',
      sharedBy: s.sharedByUser,
      sharedAt: s.created_at,
      extra: {
        fileSize: s.document?.file_size,
        mimeType: s.document?.mime_type
      }
    })),
    ...recipeShares.map(s => ({
      type: 'recipe',
      id: s.id,
      title: s.recipe?.title || 'Recipe',
      sharedBy: s.sharedByUser,
      sharedAt: s.shared_at || s.created_at,
      extra: {
        category: s.recipe?.category?.name,
        notes: s.notes
      }
    }))
  ].sort((a, b) => new Date(b.sharedAt) - new Date(a.sharedAt));

  const filteredShares = activeTab === 'all'
    ? allShares
    : allShares.filter(s => s.type === activeTab);

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">{t('sharing.history', 'Historique des partages')}</h5>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" className="me-2" />
          {t('common.loading', 'Chargement...')}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{t('sharing.history', 'Historique des partages')}</h5>
        <Badge bg="secondary">{totalShares}</Badge>
      </Card.Header>
      <Card.Body>
        {totalShares === 0 ? (
          <div className="text-center py-4 text-muted">
            <div className="mb-2" style={{ fontSize: '2rem' }}>📤</div>
            <p className="mb-0">{t('sharing.noShares', 'Aucun partage pour ce patient')}</p>
          </div>
        ) : (
          <>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-3"
            >
              <Tab
                eventKey="all"
                title={<span>{t('common.all', 'Tous')} <Badge bg="secondary" pill>{allShares.length}</Badge></span>}
              />
              <Tab
                eventKey="document"
                title={<span>📄 {t('documents.title', 'Documents')} <Badge bg="secondary" pill>{documentShares.length}</Badge></span>}
              />
              <Tab
                eventKey="recipe"
                title={<span>🍽️ {t('recipes.title', 'Recettes')} <Badge bg="secondary" pill>{recipeShares.length}</Badge></span>}
              />
            </Tabs>

            <Table responsive hover size="sm">
              <thead>
                <tr>
                  <th>{t('sharing.type', 'Type')}</th>
                  <th>{t('sharing.item', 'Élément')}</th>
                  <th>{t('sharing.sharedBy', 'Partagé par')}</th>
                  <th>{t('sharing.sharedAt', 'Date')}</th>
                  <th>{t('sharing.details', 'Détails')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredShares.map(share => (
                  <tr key={`${share.type}-${share.id}`}>
                    <td>
                      {share.type === 'document' ? (
                        <Badge bg="info">
                          {getFileTypeIcon(share.extra?.mimeType)} {t('sharing.document', 'Document')}
                        </Badge>
                      ) : (
                        <Badge bg="success">
                          🍽️ {t('sharing.recipe', 'Recette')}
                        </Badge>
                      )}
                    </td>
                    <td>
                      <strong>{share.title}</strong>
                    </td>
                    <td>
                      {share.sharedBy ? (
                        `${share.sharedBy.first_name || ''} ${share.sharedBy.last_name || share.sharedBy.username || ''}`.trim()
                      ) : '-'}
                    </td>
                    <td>{formatDate(share.sharedAt)}</td>
                    <td>
                      {share.type === 'document' ? (
                        <small className="text-muted">
                          {formatFileSize(share.extra?.fileSize)}
                        </small>
                      ) : (
                        share.extra?.category && (
                          <Badge bg="light" text="dark" pill>
                            {share.extra.category}
                          </Badge>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default SharingHistory;
