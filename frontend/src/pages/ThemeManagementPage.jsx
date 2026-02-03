import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { createTheme, updateTheme, deleteTheme, duplicateTheme, exportThemes, importThemes } from '../services/themeService';
import Layout from '../components/layout/Layout';

// Color groups for the editor
const COLOR_GROUPS = [
  {
    key: 'primary',
    vars: [
      { key: 'nv-slate', label: 'Slate' },
      { key: 'nv-slate-mid', label: 'Slate Mid' },
      { key: 'nv-slate-bright', label: 'Slate Bright' }
    ]
  },
  {
    key: 'dark',
    vars: [
      { key: 'nv-navy-dark', label: 'Navy Dark' },
      { key: 'nv-navy-deep', label: 'Navy Deep' }
    ]
  },
  {
    key: 'accent',
    vars: [
      { key: 'nv-gold', label: 'Gold' }
    ]
  },
  {
    key: 'surfaces',
    vars: [
      { key: 'nv-parchment', label: 'Parchment' },
      { key: 'nv-parchment-light', label: 'Parchment Light' },
      { key: 'nv-parchment-dark', label: 'Parchment Dark' }
    ]
  },
  {
    key: 'warmScale',
    vars: [
      { key: 'nv-warm-50', label: '50' },
      { key: 'nv-warm-100', label: '100' },
      { key: 'nv-warm-200', label: '200' },
      { key: 'nv-warm-300', label: '300' },
      { key: 'nv-warm-400', label: '400' },
      { key: 'nv-warm-500', label: '500' },
      { key: 'nv-warm-600', label: '600' },
      { key: 'nv-warm-700', label: '700' },
      { key: 'nv-warm-800', label: '800' },
      { key: 'nv-warm-900', label: '900' }
    ]
  },
  {
    key: 'semantic',
    vars: [
      { key: 'nv-success', label: 'Success' },
      { key: 'nv-info', label: 'Info' },
      { key: 'nv-warning', label: 'Warning' },
      { key: 'nv-danger', label: 'Danger' }
    ]
  },
  {
    key: 'bootstrap',
    vars: [
      { key: 'bs-primary', label: 'Primary' },
      { key: 'bs-secondary', label: 'Secondary' },
      { key: 'bs-success', label: 'Success' },
      { key: 'bs-info', label: 'Info' },
      { key: 'bs-warning', label: 'Warning' },
      { key: 'bs-danger', label: 'Danger' },
      { key: 'bs-body-bg', label: 'Body BG' },
      { key: 'bs-body-color', label: 'Body Color' },
      { key: 'bs-light', label: 'Light' },
      { key: 'bs-dark', label: 'Dark' }
    ]
  }
];

const DEFAULT_COLORS = {
  "nv-slate": "#4a6572",
  "nv-slate-mid": "#5a7a88",
  "nv-slate-bright": "#6a8e9e",
  "nv-navy-dark": "#2e3e46",
  "nv-navy-deep": "#1e2c32",
  "nv-gold": "#c4a434",
  "nv-parchment": "#e8dfc4",
  "nv-parchment-light": "#f5f2e8",
  "nv-parchment-dark": "#d4cbb0",
  "nv-warm-50": "#faf8f2",
  "nv-warm-100": "#f5f2e8",
  "nv-warm-200": "#e8e2d0",
  "nv-warm-300": "#d4cbb0",
  "nv-warm-400": "#b8a88a",
  "nv-warm-500": "#8c7e66",
  "nv-warm-600": "#6b5e48",
  "nv-warm-700": "#4a4032",
  "nv-warm-800": "#2e2820",
  "nv-warm-900": "#1a1610",
  "nv-danger": "#c8503c",
  "nv-info": "#3a8a8c",
  "nv-warning": "#c4a434",
  "nv-success": "#4b8c50",
  "bs-primary": "#4a6572",
  "bs-secondary": "#8c7e66",
  "bs-success": "#4b8c50",
  "bs-info": "#3a8a8c",
  "bs-warning": "#c4a434",
  "bs-danger": "#c8503c",
  "bs-body-bg": "#faf8f2",
  "bs-body-color": "#2e2820",
  "bs-light": "#faf8f2",
  "bs-dark": "#1e2c32"
};

const ThemeManagementPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { themes, refreshThemes, currentTheme, applyTheme } = useTheme();

  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColors, setFormColors] = useState({ ...DEFAULT_COLORS });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN';

  const openCreate = () => {
    setEditingTheme(null);
    setFormName('');
    setFormDescription('');
    setFormColors({ ...DEFAULT_COLORS });
    setShowEditor(true);
  };

  const openEdit = (theme) => {
    setEditingTheme(theme);
    setFormName(theme.name);
    setFormDescription(theme.description || '');
    setFormColors({ ...DEFAULT_COLORS, ...theme.colors });
    setShowEditor(true);
  };

  const handleColorChange = (key, value) => {
    setFormColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('themes.nameRequired', 'Theme name is required'));
      return;
    }

    setSaving(true);
    try {
      if (editingTheme) {
        await updateTheme(editingTheme.id, {
          name: formName.trim(),
          description: formDescription.trim() || null,
          colors: formColors
        });
        toast.success(t('themes.updated', 'Theme updated'));
      } else {
        await createTheme({
          name: formName.trim(),
          description: formDescription.trim() || null,
          colors: formColors
        });
        toast.success(t('themes.created', 'Theme created'));
      }

      await refreshThemes();
      setShowEditor(false);

      // Re-apply current theme in case it was edited
      if (editingTheme && currentTheme?.id === editingTheme.id) {
        applyTheme(formColors);
      }
    } catch (error) {
      const msg = error.response?.data?.error || t('themes.saveFailed', 'Failed to save theme');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (theme) => {
    try {
      await duplicateTheme(theme.id);
      await refreshThemes();
      toast.success(t('themes.duplicated', 'Theme duplicated'));
    } catch (error) {
      toast.error(t('themes.duplicateFailed', 'Failed to duplicate theme'));
    }
  };

  const handleDelete = async (theme) => {
    try {
      await deleteTheme(theme.id);
      await refreshThemes();
      setDeleteConfirm(null);
      toast.success(t('themes.deleted', 'Theme deleted'));
    } catch (error) {
      const msg = error.response?.data?.error || t('themes.deleteFailed', 'Failed to delete theme');
      toast.error(msg);
    }
  };

  const triggerDownload = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      const res = await exportThemes();
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(res.data.data, `nutrivault-themes-${today}.json`);
      toast.success(t('themes.exportSuccess', 'Themes exported successfully'));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Export failed');
    }
  };

  const handleExportSingle = async (theme) => {
    try {
      const res = await exportThemes([theme.id]);
      const safeName = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      triggerDownload(res.data.data, `nutrivault-theme-${safeName}.json`);
      toast.success(t('themes.exportSuccess', 'Themes exported successfully'));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Export failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.version || !Array.isArray(parsed.themes)) {
        toast.error(t('themes.invalidFile', 'Invalid file: must be a JSON theme export'));
        return;
      }

      const res = await importThemes(parsed, { skipExisting: true });
      const { created, skipped } = res.data.results;
      toast.success(t('themes.importResults', '{{created}} created, {{skipped}} skipped', { created, skipped }));
      await refreshThemes();
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error(t('themes.invalidFile', 'Invalid file: must be a JSON theme export'));
      } else {
        toast.error(error.response?.data?.error || t('themes.importFailed', 'Failed to import themes'));
      }
    }
  };

  // Preview card showing theme colors
  const PreviewCard = ({ colors }) => (
    <Card className="mt-3" style={{
      background: colors['bs-body-bg'] || '#faf8f2',
      color: colors['bs-body-color'] || '#2e2820',
      border: `1px solid ${colors['nv-warm-200'] || '#e8e2d0'}`
    }}>
      <Card.Header style={{
        background: `linear-gradient(135deg, ${colors['nv-navy-deep'] || '#1e2c32'}, ${colors['nv-slate'] || '#4a6572'})`,
        color: '#fff',
        borderBottom: `2px solid ${colors['nv-gold'] || '#c4a434'}`
      }}>
        <small style={{ fontFamily: 'var(--nv-font-display)' }}>{t('themes.preview', 'Preview')}</small>
      </Card.Header>
      <Card.Body>
        <div className="d-flex gap-2 mb-2 flex-wrap">
          <span className="badge" style={{ backgroundColor: colors['bs-primary'] || '#4a6572', color: '#fff' }}>Primary</span>
          <span className="badge" style={{ backgroundColor: colors['bs-success'] || '#4b8c50', color: '#fff' }}>Success</span>
          <span className="badge" style={{ backgroundColor: colors['bs-warning'] || '#c4a434', color: '#fff' }}>Warning</span>
          <span className="badge" style={{ backgroundColor: colors['bs-danger'] || '#c8503c', color: '#fff' }}>Danger</span>
          <span className="badge" style={{ backgroundColor: colors['bs-info'] || '#3a8a8c', color: '#fff' }}>Info</span>
        </div>
        <div className="d-flex gap-1 mb-2">
          {['nv-warm-50', 'nv-warm-100', 'nv-warm-200', 'nv-warm-300', 'nv-warm-400',
            'nv-warm-500', 'nv-warm-600', 'nv-warm-700', 'nv-warm-800', 'nv-warm-900'].map(key => (
            <div key={key} style={{
              width: 24, height: 24, borderRadius: 4,
              backgroundColor: colors[key] || '#ccc',
              border: '1px solid rgba(0,0,0,0.1)'
            }} title={key} />
          ))}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm" style={{ backgroundColor: colors['nv-slate'] || '#4a6572', color: '#fff' }}>
            {t('common.save', 'Save')}
          </button>
          <button className="btn btn-sm" style={{
            backgroundColor: 'transparent',
            color: colors['nv-warm-600'] || '#6b5e48',
            border: `1px solid ${colors['nv-warm-300'] || '#d4cbb0'}`
          }}>
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Layout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{t('themes.title', 'Theme Management')}</h2>
          {isAdmin && (
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => fileInputRef.current?.click()}>
                {t('themes.import', 'Import')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <Button variant="outline-secondary" onClick={handleExportAll}>
                {t('themes.exportAll', 'Export All')}
              </Button>
              <Button variant="primary" onClick={openCreate}>
                + {t('themes.createTheme', 'New Theme')}
              </Button>
            </div>
          )}
        </div>

        <Row>
          {themes.map((theme) => (
            <Col key={theme.id} md={6} lg={4} className="mb-4">
              <Card className={currentTheme?.id === theme.id ? 'border-primary' : ''}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{theme.name}</strong>
                    {theme.is_system && (
                      <Badge bg="secondary" className="ms-2">{t('themes.system', 'System')}</Badge>
                    )}
                    {currentTheme?.id === theme.id && (
                      <Badge bg="primary" className="ms-2">{t('themes.active', 'Active')}</Badge>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  {theme.description && (
                    <p className="text-muted small mb-2">{theme.description}</p>
                  )}
                  {/* Color swatches */}
                  <div className="d-flex gap-1 flex-wrap mb-3">
                    {['bs-primary', 'nv-gold', 'bs-success', 'bs-info', 'bs-warning', 'bs-danger', 'bs-body-bg', 'nv-navy-deep'].map(key => (
                      <div key={key} style={{
                        width: 28, height: 28, borderRadius: 6,
                        backgroundColor: theme.colors?.[key] || '#ccc',
                        border: '1px solid rgba(0,0,0,0.12)'
                      }} title={key} />
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={() => openEdit(theme)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => handleDuplicate(theme)}>
                        {t('common.duplicate', 'Duplicate')}
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => handleExportSingle(theme)}>
                        {t('themes.export', 'Export')}
                      </Button>
                      {!theme.is_system && (
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleteConfirm(theme)}>
                          {t('common.delete', 'Delete')}
                        </Button>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Editor Modal */}
        <Modal show={showEditor} onHide={() => setShowEditor(false)} size="xl" scrollable>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingTheme
                ? t('themes.editTheme', 'Edit Theme')
                : t('themes.createTheme', 'New Theme')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={7}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('themes.name', 'Name')}</Form.Label>
                  <Form.Control
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t('themes.namePlaceholder', 'Theme name')}
                    disabled={editingTheme?.is_system}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('themes.description', 'Description')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={t('themes.descriptionPlaceholder', 'Optional description')}
                  />
                </Form.Group>

                {COLOR_GROUPS.map((group) => (
                  <div key={group.key} className="mb-4">
                    <h6 className="text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>
                      {t(`themes.group.${group.key}`, group.key)}
                    </h6>
                    <div className="d-flex flex-wrap gap-3">
                      {group.vars.map(({ key, label }) => (
                        <div key={key} className="d-flex align-items-center gap-2">
                          <input
                            type="color"
                            value={formColors[key] || '#000000'}
                            onChange={(e) => handleColorChange(key, e.target.value)}
                            style={{ width: 36, height: 36, padding: 0, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                          />
                          <div>
                            <small className="d-block" style={{ fontSize: '0.7rem', opacity: 0.7 }}>{key}</small>
                            <small className="d-block fw-bold">{label}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Col>
              <Col md={5}>
                <div className="position-sticky" style={{ top: '1rem' }}>
                  <PreviewCard colors={formColors} />
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditor(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              {t('common.save', 'Save')}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation */}
        <Modal show={!!deleteConfirm} onHide={() => setDeleteConfirm(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t('themes.confirmDelete', 'Delete Theme')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('themes.deleteWarning', 'Are you sure you want to delete the theme "{{name}}"? Users with this theme will be switched to the default theme.', { name: deleteConfirm?.name })}
            </p>
            <p className="text-muted small">{t('common.actionCannotBeUndone', 'This action cannot be undone.')}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default ThemeManagementPage;
