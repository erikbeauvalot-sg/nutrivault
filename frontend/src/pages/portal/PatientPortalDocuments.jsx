/**
 * Patient Portal Documents Page
 * View and download shared documents
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
    templates: t('portal.docCategory.templates', 'Modèles'),
    educational: t('portal.docCategory.educational', 'Éducatif'),
    medical: t('portal.docCategory.medical', 'Médical'),
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
      toast.error(t('portal.downloadError', 'Erreur lors du téléchargement'));
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

  return (
    <div>
      <h2 className="mb-4">📄 {t('portal.nav.documents', 'Mes documents')}</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {documents.length === 0 ? (
        <Alert variant="info">{t('portal.noDocuments', 'Aucun document partagé')}</Alert>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>{t('portal.fileName', 'Fichier')}</th>
                  <th>{t('portal.category', 'Catégorie')}</th>
                  <th>{t('portal.size', 'Taille')}</th>
                  <th>{t('portal.sharedBy', 'Partagé par')}</th>
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
                        {doc && canPreview(doc.mime_type) && (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="me-2"
                            disabled={previewing === doc.id}
                            onClick={() => handlePreview(doc)}
                          >
                            {previewing === doc.id ? (
                              <Spinner size="sm" animation="border" />
                            ) : (
                              <>👁 {t('portal.view', 'Voir')}</>
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
                            <>⬇ {t('portal.download', 'Télécharger')}</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        show={!!previewUrl}
        onHide={closePreview}
        size="xl"
        centered
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>{previewDoc?.file_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ minHeight: '70vh' }}>
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
            ⬇ {t('portal.download', 'Télécharger')}
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
