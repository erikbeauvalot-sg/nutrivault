/**
 * Patient Portal Invoices Page
 * View invoices (SENT, PAID, OVERDUE), preview PDF inline, and download
 */

import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Table, Button, Badge, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import * as portalService from '../../services/portalService';

const statusBadge = (status, t) => {
  const map = {
    PAID: { bg: 'success', label: t('portal.invoiceStatus.paid', 'Paid') },
    OVERDUE: { bg: 'warning', label: t('portal.invoiceStatus.overdue', 'Overdue') },
    SENT: { bg: 'info', label: t('portal.invoiceStatus.sent', 'Sent') }
  };
  const s = map[status] || { bg: 'secondary', label: status };
  return <Badge bg={s.bg}>{s.label}</Badge>;
};

const formatAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
};

const PatientPortalInvoices = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await portalService.getInvoices();
        setInvoices(data || []);
      } catch (err) {
        setError(t('portal.loadError', 'Erreur lors du chargement'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const handleDownloadPDF = async (invoice) => {
    try {
      setDownloading(invoice.id);
      const blob = await portalService.downloadInvoicePDF(invoice.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoice_number}.pdf`);
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

  const handlePreview = async (invoice) => {
    try {
      setPreviewing(invoice.id);
      const blob = await portalService.downloadInvoicePDF(invoice.id);
      const objectUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPreviewUrl(objectUrl);
      setPreviewInvoice(invoice);
    } catch (err) {
      toast.error(t('portal.previewError', 'Erreur lors de la visualisation'));
    } finally {
      setPreviewing(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewInvoice(null);
  };

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  const renderActions = (inv) => (
    <div className="d-flex gap-2">
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={previewing === inv.id}
        onClick={(e) => { e.stopPropagation(); handlePreview(inv); }}
      >
        {previewing === inv.id ? (
          <Spinner size="sm" animation="border" />
        ) : (
          <>{'\uD83D\uDC41'} {t('portal.view', 'Voir')}</>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline-primary"
        disabled={downloading === inv.id}
        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); }}
      >
        {downloading === inv.id ? (
          <Spinner size="sm" animation="border" />
        ) : (
          <>{'\u2B07'} {t('portal.downloadPdf', 'PDF')}</>
        )}
      </Button>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{'\uD83D\uDCB0'} {t('portal.nav.invoices', 'Mes factures')}</h2>
        {invoices.length > 0 && (
          <span className="text-muted small">
            {invoices.length} {t('portal.invoice', 'facture')}{invoices.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {invoices.length === 0 ? (
        <Alert variant="info">{t('portal.noInvoices', 'Aucune facture')}</Alert>
      ) : (
        <>
          {/* Desktop: Table view */}
          <Card className="d-none d-md-block">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>{t('portal.invoiceNumber', 'N° Facture')}</th>
                    <th>{t('portal.invoiceDate', 'Date')}</th>
                    <th>{t('portal.dueDate', 'Echeance')}</th>
                    <th>{t('portal.amountTotal', 'Total')}</th>
                    <th>{t('portal.amountDue', 'Reste du')}</th>
                    <th>{t('portal.status', 'Statut')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => handlePreview(inv)}>
                      <td>
                        <strong>{inv.invoice_number}</strong>
                        {inv.service_description && (
                          <div className="text-muted small">{inv.service_description}</div>
                        )}
                      </td>
                      <td>{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</td>
                      <td>{new Date(inv.due_date).toLocaleDateString('fr-FR')}</td>
                      <td>{formatAmount(inv.amount_total)}</td>
                      <td>{formatAmount(inv.amount_due)}</td>
                      <td>{statusBadge(inv.status, t)}</td>
                      <td className="text-nowrap">
                        {renderActions(inv)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Mobile: Card view */}
          <div className="d-md-none d-flex flex-column gap-2">
            {invoices.map(inv => (
              <Card key={inv.id} style={{ cursor: 'pointer' }} onClick={() => handlePreview(inv)}>
                <Card.Body className="py-3 px-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong className="d-block">{inv.invoice_number}</strong>
                      {inv.service_description && (
                        <small className="text-muted d-block text-truncate">{inv.service_description}</small>
                      )}
                    </div>
                    {statusBadge(inv.status, t)}
                  </div>
                  <div className="d-flex flex-wrap gap-2 mb-2 text-muted" style={{ fontSize: '0.85em' }}>
                    <span>{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</span>
                    <span>{'\u00B7'}</span>
                    <span>{t('portal.amountTotal', 'Total')}: {formatAmount(inv.amount_total)}</span>
                    {parseFloat(inv.amount_due) > 0 && (
                      <>
                        <span>{'\u00B7'}</span>
                        <span>{t('portal.amountDue', 'Reste du')}: {formatAmount(inv.amount_due)}</span>
                      </>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {renderActions(inv)}
                  </div>
                </Card.Body>
              </Card>
            ))}
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
          <Modal.Title className="text-truncate">
            {t('portal.invoiceNumber', 'Facture')} {previewInvoice?.invoice_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ minHeight: '50vh' }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              title={`Invoice ${previewInvoice?.invoice_number}`}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => previewInvoice && handleDownloadPDF(previewInvoice)}
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

export default PatientPortalInvoices;
