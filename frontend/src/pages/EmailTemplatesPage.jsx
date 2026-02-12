/**
 * EmailTemplatesPage Component
 * Email template management — grouped by action with clear system/personal distinction.
 * Dietitians see their active templates up front; system defaults collapse behind accordions.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  Accordion,
  ButtonGroup
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import emailTemplateService from '../services/emailTemplateService';
import EmailTemplateModal from '../components/EmailTemplateModal';
import EmailPreviewModal from '../components/EmailPreviewModal';
import EmailTemplateTranslationModal from '../components/EmailTemplateTranslationModal';
import {
  FaPlus,
  FaEnvelope,
  FaFileExport,
  FaFileImport,
  FaMagic,
  FaUndo,
  FaEye,
  FaPen,
  FaCopy,
  FaGlobe,
  FaToggleOn,
  FaToggleOff,
  FaTrash,
  FaCheckCircle
} from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';
import ExportEmailTemplatesModal from '../components/ExportEmailTemplatesModal';
import ImportEmailTemplatesModal from '../components/ImportEmailTemplatesModal';

/**
 * Category metadata: icon, label key, description of when this template fires
 */
const CATEGORY_META = {
  invoice:                { icon: '💰', labelKey: 'emailTemplates.catInvoice',    descKey: 'emailTemplates.catInvoiceDesc' },
  document_share:         { icon: '📄', labelKey: 'emailTemplates.catDocShare',   descKey: 'emailTemplates.catDocShareDesc' },
  payment_reminder:       { icon: '🔔', labelKey: 'emailTemplates.catPayRemind', descKey: 'emailTemplates.catPayRemindDesc' },
  appointment_reminder:   { icon: '📅', labelKey: 'emailTemplates.catApptRemind', descKey: 'emailTemplates.catApptRemindDesc' },
  appointment_invitation: { icon: '🗓️', labelKey: 'emailTemplates.catApptInvite', descKey: 'emailTemplates.catApptInviteDesc' },
  follow_up:              { icon: '📋', labelKey: 'emailTemplates.catFollowUp',  descKey: 'emailTemplates.catFollowUpDesc' },
  general:                { icon: '✉️', labelKey: 'emailTemplates.catGeneral',   descKey: 'emailTemplates.catGeneralDesc' }
};

const EmailTemplatesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const isAdmin = typeof user?.role === 'string' ? user.role === 'ADMIN' : user?.role?.name === 'ADMIN';

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await emailTemplateService.getAllTemplates({});
      const data = response.data?.data || response.data || [];
      setTemplates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.response?.data?.error || t('emailTemplates.fetchError', 'Failed to load email templates'));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Group templates by category, then separate system vs personal
  const groupedByCategory = useMemo(() => {
    const groups = {};

    for (const tpl of templates) {
      const cat = tpl.category || 'general';
      if (!groups[cat]) {
        groups[cat] = { system: [], personal: [] };
      }
      if (tpl.user_id) {
        groups[cat].personal.push(tpl);
      } else {
        groups[cat].system.push(tpl);
      }
    }

    // Sort categories to match CATEGORY_META order
    const orderedCats = Object.keys(CATEGORY_META);
    const result = [];
    for (const cat of orderedCats) {
      if (groups[cat]) {
        result.push({ category: cat, ...groups[cat] });
      }
    }
    // Add any unknown categories at the end
    for (const cat of Object.keys(groups)) {
      if (!orderedCats.includes(cat)) {
        result.push({ category: cat, ...groups[cat] });
      }
    }

    return result;
  }, [templates]);

  // Handlers
  const handleCustomize = async (template) => {
    try {
      await emailTemplateService.customizeTemplate(template.id);
      setSuccess(t('emailTemplates.customizeSuccess', 'Template customized! You can now edit your version.'));
      setTimeout(() => setSuccess(null), 4000);
      fetchTemplates();
    } catch (err) {
      console.error('Error customizing template:', err);
      setError(err.response?.data?.error || t('emailTemplates.customizeFailed', 'Failed to customize template'));
    }
  };

  const handleResetToDefault = async (template) => {
    if (!window.confirm(t('emailTemplates.confirmReset', 'Reset this template to the system default? Your customizations will be lost.'))) return;
    try {
      await emailTemplateService.resetToDefault(template.id);
      setSuccess(t('emailTemplates.resetSuccess', 'Template reset to system default.'));
      setTimeout(() => setSuccess(null), 4000);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || t('emailTemplates.resetFailed', 'Failed to reset template'));
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await emailTemplateService.toggleActive(template.id);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle template status');
    }
  };

  const handleDeleteTemplate = (template) => {
    if (template.is_system) {
      setError(t('emailTemplates.cannotDeleteSystem', 'System templates cannot be deleted.'));
      return;
    }
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await emailTemplateService.deleteTemplate(templateToDelete.id);
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || t('emailTemplates.deleteFailed', 'Failed to delete template'));
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (template) => {
    try {
      await emailTemplateService.duplicateTemplate(template.id, { name: `${template.name} (Copy)`, is_system: false });
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to duplicate template');
    }
  };

  const handleModalClose = (refresh) => {
    setShowTemplateModal(false);
    setShowPreviewModal(false);
    setSelectedTemplate(null);
    if (refresh) fetchTemplates();
  };

  const getCatMeta = (cat) => CATEGORY_META[cat] || { icon: '✉️', labelKey: cat, descKey: '' };

  // Render a single template card — compact row style
  const renderTemplateRow = (tpl, isPersonal) => {
    const isActive = tpl.is_active !== false;

    return (
      <div
        key={tpl.id}
        className={`tpl-row ${!isActive ? 'tpl-inactive' : ''} ${isPersonal ? 'tpl-personal' : 'tpl-system'}`}
      >
        <div className="tpl-row-main">
          <div className="tpl-row-info">
            <div className="tpl-row-name">
              {isPersonal && <FaCheckCircle className="text-success me-2" size={14} title={t('emailTemplates.activeVersion', 'Active — this version is sent')} />}
              <strong>{tpl.name}</strong>
              {isPersonal && (
                <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem' }}>
                  {t('emailTemplates.yourVersionBadge', 'Your Version')}
                </Badge>
              )}
              {!isPersonal && (
                <Badge bg="outline-secondary" className="ms-2 border" style={{ fontSize: '0.65rem', color: '#888' }}>
                  {t('emailTemplates.systemBadge', 'System')}
                </Badge>
              )}
            </div>
            <div className="tpl-row-subject">
              {tpl.subject}
            </div>
          </div>
          <div className="tpl-row-actions">
            {/* Preview — everyone */}
            <Button size="sm" variant="outline-secondary" onClick={() => { setSelectedTemplate(tpl); setShowPreviewModal(true); }} title={t('common.preview', 'Preview')}>
              <FaEye />
            </Button>

            {/* Non-admin: customize system template */}
            {!isAdmin && !tpl.user_id && (
              <Button size="sm" variant="primary" onClick={() => handleCustomize(tpl)} title={t('emailTemplates.customize', 'Customize')}>
                <FaMagic className="me-1" />
                {t('emailTemplates.customize', 'Customize')}
              </Button>
            )}

            {/* Non-admin: edit own / reset */}
            {!isAdmin && tpl.user_id && (
              <>
                <Button size="sm" variant="outline-primary" onClick={() => { setSelectedTemplate(tpl); setShowTemplateModal(true); }} title={t('common.edit', 'Edit')}>
                  <FaPen />
                </Button>
                <Button size="sm" variant="outline-warning" onClick={() => handleResetToDefault(tpl)} title={t('emailTemplates.resetToDefault', 'Reset')}>
                  <FaUndo />
                </Button>
              </>
            )}

            {/* Admin: full controls */}
            {isAdmin && (
              <>
                <Button size="sm" variant="outline-primary" onClick={() => { setSelectedTemplate(tpl); setShowTemplateModal(true); }} title={t('common.edit', 'Edit')}>
                  <FaPen />
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={() => handleDuplicate(tpl)} title={t('common.duplicate', 'Duplicate')}>
                  <FaCopy />
                </Button>
                <Button size="sm" variant="outline-secondary" onClick={() => { setSelectedTemplate(tpl); setShowTranslationModal(true); }} title={t('common.translations', 'Translations')}>
                  <FaGlobe />
                </Button>
                <Button
                  size="sm"
                  variant={isActive ? 'outline-success' : 'outline-secondary'}
                  onClick={() => handleToggleActive(tpl)}
                  title={isActive ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
                >
                  {isActive ? <FaToggleOn /> : <FaToggleOff />}
                </Button>
                {!tpl.is_system && (
                  <Button size="sm" variant="outline-danger" onClick={() => handleDeleteTemplate(tpl)} title={t('common.delete', 'Delete')}>
                    <FaTrash />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && templates.length === 0) {
    return (
      <Layout>
        <Container className="py-4 text-center">
          <Spinner animation="border" />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4" style={{ maxWidth: 960 }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h2 style={{ fontWeight: 800 }}>
              <FaEnvelope className="me-2" style={{ fontSize: '0.85em' }} />
              {t('emailTemplates.title', 'Email Templates')}
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              {isAdmin
                ? t('emailTemplates.subtitleAdmin', 'Manage system email templates and translations')
                : t('emailTemplates.subtitleDiet', 'Customize the emails sent to your patients')}
            </p>
          </div>
          {isAdmin && (
            <ButtonGroup size="sm">
              <Button variant="outline-primary" onClick={() => setShowExportModal(true)}>
                <FaFileExport className="me-1" /> {t('emailTemplates.export', 'Export')}
              </Button>
              <Button variant="outline-primary" onClick={() => setShowImportModal(true)}>
                <FaFileImport className="me-1" /> {t('emailTemplates.import', 'Import')}
              </Button>
              <Button variant="primary" onClick={() => { setSelectedTemplate(null); setShowTemplateModal(true); }}>
                <FaPlus className="me-1" /> {t('emailTemplates.create', 'Create')}
              </Button>
            </ButtonGroup>
          )}
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* How it works — non-admin */}
        {!isAdmin && (
          <Alert variant="light" className="border mb-4" style={{ fontSize: '0.85rem' }}>
            <strong>{t('emailTemplates.howItWorks', 'How it works')}</strong>
            <br />
            {t('emailTemplates.howItWorksDesc', 'Each action (invoice, reminder, etc.) uses a template. Click "Customize" to create your own version — it will be used instead of the system default. You can reset anytime.')}
          </Alert>
        )}

        {/* Grouped by category */}
        {groupedByCategory.length === 0 ? (
          <Alert variant="info">{t('emailTemplates.noTemplates', 'No email templates found.')}</Alert>
        ) : (
          groupedByCategory.map(({ category, system, personal }) => {
            const meta = getCatMeta(category);
            const hasPersonal = personal.length > 0;
            // For non-admin: if user has a personal version, the system one is "overridden"
            const systemOverridden = !isAdmin && hasPersonal;

            return (
              <Card key={category} className="mb-3 tpl-category-card">
                <Card.Header className="d-flex align-items-center gap-2 py-2">
                  <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                  <div className="flex-grow-1">
                    <strong>{t(meta.labelKey, category)}</strong>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      {t(meta.descKey, '')}
                    </div>
                  </div>
                  {hasPersonal && !isAdmin && (
                    <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                      {t('emailTemplates.customized', 'Customized')}
                    </Badge>
                  )}
                </Card.Header>
                <Card.Body className="p-0">
                  {/* Personal overrides — shown prominently */}
                  {personal.map(tpl => renderTemplateRow(tpl, true))}

                  {/* System templates */}
                  {isAdmin ? (
                    // Admin sees everything inline
                    system.map(tpl => renderTemplateRow(tpl, false))
                  ) : (
                    // Non-admin: system defaults behind accordion if user has override
                    system.length > 0 && (
                      systemOverridden ? (
                        <Accordion flush>
                          <Accordion.Item eventKey="0">
                            <Accordion.Header className="tpl-system-accordion-header">
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                {t('emailTemplates.showSystemDefault', 'Show system default')}
                                {' '}({system.length})
                              </span>
                            </Accordion.Header>
                            <Accordion.Body className="p-0">
                              {system.map(tpl => renderTemplateRow(tpl, false))}
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      ) : (
                        // No personal override → show system directly (they need to see it to customize)
                        system.map(tpl => renderTemplateRow(tpl, false))
                      )
                    )
                  )}
                </Card.Body>
              </Card>
            );
          })
        )}

        {/* Modals */}
        {showTemplateModal && (
          <EmailTemplateModal
            show={showTemplateModal}
            onHide={handleModalClose}
            template={selectedTemplate}
          />
        )}
        {showPreviewModal && selectedTemplate && (
          <EmailPreviewModal
            show={showPreviewModal}
            onHide={handleModalClose}
            template={selectedTemplate}
          />
        )}
        {showTranslationModal && selectedTemplate && (
          <EmailTemplateTranslationModal
            show={showTranslationModal}
            onHide={() => setShowTranslationModal(false)}
            template={selectedTemplate}
            onSaved={fetchTemplates}
          />
        )}
        {showExportModal && (
          <ExportEmailTemplatesModal
            show={showExportModal}
            onHide={() => setShowExportModal(false)}
            templates={templates}
          />
        )}
        {showImportModal && (
          <ImportEmailTemplatesModal
            show={showImportModal}
            onHide={() => setShowImportModal(false)}
            onSuccess={fetchTemplates}
            existingTemplates={templates}
          />
        )}
        <ConfirmModal
          show={showDeleteConfirm}
          onHide={() => { setShowDeleteConfirm(false); setTemplateToDelete(null); }}
          onConfirm={confirmDeleteTemplate}
          title={t('common.confirmation', 'Confirmation')}
          message={t('emailTemplates.confirmDelete', { name: templateToDelete?.name, defaultValue: `Delete "${templateToDelete?.name}"?` })}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>

      <style>{`
        .tpl-category-card {
          border: 1px solid var(--nv-warm-200, #e8e2da);
        }
        .tpl-category-card > .card-header {
          background: var(--nv-warm-50, #faf8f5);
          border-bottom: 1px solid var(--nv-warm-200, #e8e2da);
        }
        .tpl-row {
          padding: 0.65rem 1rem;
          border-bottom: 1px solid var(--nv-warm-100, #f0ece6);
        }
        .tpl-row:last-child {
          border-bottom: none;
        }
        .tpl-row.tpl-inactive {
          opacity: 0.5;
        }
        .tpl-row.tpl-personal {
          background: #f0fdf4;
          border-left: 3px solid #22c55e;
        }
        .tpl-row.tpl-system {
          background: white;
        }
        .tpl-row-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .tpl-row-info {
          flex: 1;
          min-width: 0;
        }
        .tpl-row-name {
          display: flex;
          align-items: center;
          font-size: 0.88rem;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .tpl-row-subject {
          font-size: 0.78rem;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 500px;
          font-family: var(--nv-font-mono, monospace);
        }
        .tpl-row-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .tpl-row-actions .btn {
          padding: 0.2rem 0.45rem;
          font-size: 0.78rem;
        }
        .tpl-system-accordion-header .accordion-button {
          padding: 0.4rem 1rem;
          background: var(--nv-warm-50, #faf8f5);
          font-size: 0.8rem;
          box-shadow: none !important;
        }
        .tpl-system-accordion-header .accordion-button:not(.collapsed) {
          background: var(--nv-warm-50, #faf8f5);
          color: inherit;
        }
        .tpl-system-accordion-header .accordion-button::after {
          width: 0.8rem;
          height: 0.8rem;
          background-size: 0.8rem;
        }
        @media (max-width: 640px) {
          .tpl-row-main {
            flex-direction: column;
            align-items: flex-start;
          }
          .tpl-row-actions {
            margin-top: 0.4rem;
          }
        }
      `}</style>
    </Layout>
  );
};

export default EmailTemplatesPage;
