/**
 * Patient Portal Documents Page
 * View and download shared documents — responsive card layout on mobile, table on desktop
 */

import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Table, Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as portalService from '../../services/portalService';

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const categoryLabel = (category, t) => {
  const map = {
    recipes: t('portal.docCategory.recipes', 'Recettes'),
    guides: t('portal.docCategory.guides', 'Guides'),
    templates: t('portal.docCategory.templates', 'Modeles'),
    educational: t('portal.docCategory.educational', 'Educatif'),
    medical: t('portal.docCategory.medical', 'Medical'),
    administrative: t('portal.docCategory.administrative', 'Administratif'),
    report: t('portal.docCategory.report', 'Rapport'),
    other: t('portal.docCategory.other', 'Autre')
  };
  return map[category] || category || '—';
};

const canPreview = (mimeType) => {
  if (!mimeType) return false;
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
};

const PatientPortalDocuments = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getDocuments();
        setDocuments(data || []);
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const handleDownload = async (documentId, fileName) => {
    try {
      setDownloading(documentId);
      const blob = await portalService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t('portal.downloadError', 'Erreur lors du telechargement'));
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (doc) => {
    try {
      setPreviewing(doc.id);
      const blob = await portalService.downloadDocument(doc.id);
      const objectUrl = window.URL.createObjectURL(new Blob([blob], { type: doc.mime_type }));
      setPreviewUrl(objectUrl);
      setPreviewDoc(doc);
    } catch (err) {
      toast.error(t('portal.previewError', 'Erreur lors de la visualisation'));
    } finally {
      setPreviewing(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  const renderDocActions = (doc) => (
    <div className="d-flex gap-2">
      {doc && canPreview(doc.mime_type) && (
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={previewing === doc.id}
          onClick={() => handlePreview(doc)}
        >
          {previewing === doc.id ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <>{'\uD83D\uDC41'} {t('portal.view', 'Voir')}</>
          )}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline-primary"
        disabled={downloading === doc?.id}
        onClick={() => handleDownload(doc?.id, doc?.file_name)}
      >
        {downloading === doc?.id ? (
          <Spinner size="sm" animation="border" />
        ) : (
          <>{'\u2B07'} {t('portal.download', 'Telecharger')}</>
        )}
      </Button>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{'\uD83D\uDCC4'} {t('portal.nav.documents', 'Mes documents')}</h2>
        {documents.length > 0 && (
          <span className="text-muted small">
            {documents.length} {t('portal.document', 'document')}{documents.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {documents.length === 0 ? (
        <Alert variant="info">{t('portal.noDocuments', 'Aucun document partage')}</Alert>
      ) : (
        <>
          {/* Desktop: Table view */}
          <Card className="d-none d-md-block">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>{t('portal.fileName', 'Fichier')}</th>
                    <th>{t('portal.category', 'Categorie')}</th>
                    <th>{t('portal.size', 'Taille')}</th>
                    <th>{t('portal.sharedBy', 'Partage par')}</th>
                    <th>{t('portal.date', 'Date')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(share => {
                    const doc = share.document;
                    return (
                      <tr key={share.id}>
                        <td>
                          <strong>{doc?.file_name || '—'}</strong>
                          {doc?.description && (
                            <div className="text-muted small">{doc.description}</div>
                          )}
                        </td>
                        <td>{categoryLabel(doc?.category, t)}</td>
                        <td>{formatFileSize(doc?.file_size)}</td>
                        <td>
                          {share.sharedByUser
                            ? `${share.sharedByUser.first_name} ${share.sharedByUser.last_name}`
                            : '—'}
                        </td>
                        <td>{new Date(share.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="text-nowrap">
                          {renderDocActions(doc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Mobile: Card view */}
          <div className="d-md-none d-flex flex-column gap-2">
            {documents.map(share => {
              const doc = share.document;
              return (
                <Card key={share.id}>
                  <Card.Body className="py-3 px-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong className="d-block text-truncate">{doc?.file_name || '—'}</strong>
                        {doc?.description && (
                          <small className="text-muted d-block text-truncate">{doc.description}</small>
                        )}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2 text-muted" style={{ fontSize: '0.85em' }}>
                      <span>{categoryLabel(doc?.category, t)}</span>
                      <span>{'\u00B7'}</span>
                      <span>{formatFileSize(doc?.file_size)}</span>
                      <span>{'\u00B7'}</span>
                      <span>{new Date(share.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {share.sharedByUser && (
                      <small className="text-muted d-block mb-2">
                        {t('portal.sharedBy', 'Partage par')} {share.sharedByUser.first_name} {share.sharedByUser.last_name}
                      </small>
                    )}
                    {renderDocActions(doc)}
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Preview Modal */}
      <Modal
        show={!!previewUrl}
        onHide={closePreview}
        size="xl"
        centered
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-truncate">{previewDoc?.file_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ minHeight: '50vh' }}>
          {previewUrl && previewDoc?.mime_type === 'application/pdf' && (
            <iframe
              src={previewUrl}
              title={previewDoc.file_name}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          )}
          {previewUrl && previewDoc?.mime_type?.startsWith('image/') && (
            <div className="text-center p-3">
              <img
                src={previewUrl}
                alt={previewDoc.file_name}
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => handleDownload(previewDoc?.id, previewDoc?.file_name)}
          >
            {'\u2B07'} {t('portal.download', 'Telecharger')}
          </Button>
          <Button variant="secondary" onClick={closePreview}>
            {t('common.close', 'Fermer')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PatientPortalDocuments;
