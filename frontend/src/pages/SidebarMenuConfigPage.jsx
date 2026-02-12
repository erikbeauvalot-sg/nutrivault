/**
 * SidebarMenuConfigPage
 * Admin page for managing sidebar menu order, visibility, and role access.
 * Uses drag-and-drop for reordering (same DnD library as CustomFieldsPage).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Form, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import sidebarMenuConfigService from '../services/sidebarMenuConfigService';
import SIDEBAR_ITEMS from '../config/sidebarItemRegistry';

const AVAILABLE_ROLES = ['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'];

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result.map((item, idx) => ({ ...item, display_order: idx + 1 }));
};

const SidebarMenuConfigPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState([]);

  // Guard: admin only
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;
  useEffect(() => {
    if (userRole && userRole !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sidebarMenuConfigService.getAllConfigs();
      const normalized = data.map(c => ({
        ...c,
        allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
          (typeof c.allowed_roles === 'string' ? JSON.parse(c.allowed_roles) : ['ADMIN', 'DIETITIAN'])
      }));
      setConfigs(normalized);
      setOriginalConfigs(JSON.parse(JSON.stringify(normalized)));
      setHasChanges(false);
    } catch (err) {
      console.error('Error fetching sidebar configs:', err);
      setError(t('sidebarConfig.fetchError', 'Failed to load sidebar configuration'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const mainItems = useMemo(() =>
    configs.filter(c => c.section === 'main').sort((a, b) => a.display_order - b.display_order),
    [configs]
  );

  const settingsItems = useMemo(() =>
    configs.filter(c => c.section === 'settings').sort((a, b) => a.display_order - b.display_order),
    [configs]
  );

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const section = result.source.droppableId;

    if (section !== destination.droppableId) return;

    const sectionItems = section === 'main' ? [...mainItems] : [...settingsItems];
    const reordered = reorder(sectionItems, source.index, destination.index);

    setConfigs(prev => {
      const other = prev.filter(c => c.section !== section);
      return [...other, ...reordered];
    });
    setHasChanges(true);
  };

  const toggleVisibility = (itemKey) => {
    setConfigs(prev => prev.map(c =>
      c.item_key === itemKey ? { ...c, is_visible: !c.is_visible } : c
    ));
    setHasChanges(true);
  };

  const toggleRole = (itemKey, role) => {
    // ADMIN role cannot be unchecked (lock-out prevention)
    if (role === 'ADMIN') return;

    setConfigs(prev => prev.map(c => {
      if (c.item_key !== itemKey) return c;
      const roles = Array.isArray(c.allowed_roles) ? [...c.allowed_roles] : [];
      const idx = roles.indexOf(role);
      if (idx >= 0) {
        roles.splice(idx, 1);
      } else {
        roles.push(role);
      }
      return { ...c, allowed_roles: roles };
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const items = configs.map(c => ({
        item_key: c.item_key,
        section: c.section,
        display_order: c.display_order,
        is_visible: c.is_visible,
        allowed_roles: c.allowed_roles
      }));
      const data = await sidebarMenuConfigService.bulkUpdate(items);
      const normalized = data.map(c => ({
        ...c,
        allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
          (typeof c.allowed_roles === 'string' ? JSON.parse(c.allowed_roles) : ['ADMIN', 'DIETITIAN'])
      }));
      setConfigs(normalized);
      setOriginalConfigs(JSON.parse(JSON.stringify(normalized)));
      setHasChanges(false);
      setSuccess(t('sidebarConfig.saveSuccess', 'Sidebar configuration saved'));
      // Clear localStorage cache so sidebar reloads
      localStorage.removeItem('sidebarMenuConfigs');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving sidebar configs:', err);
      setError(t('sidebarConfig.saveError', 'Failed to save sidebar configuration'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await sidebarMenuConfigService.resetToDefaults();
      const normalized = data.map(c => ({
        ...c,
        allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
          (typeof c.allowed_roles === 'string' ? JSON.parse(c.allowed_roles) : ['ADMIN', 'DIETITIAN'])
      }));
      setConfigs(normalized);
      setOriginalConfigs(JSON.parse(JSON.stringify(normalized)));
      setHasChanges(false);
      setShowResetConfirm(false);
      localStorage.removeItem('sidebarMenuConfigs');
      setSuccess(t('sidebarConfig.resetSuccess', 'Sidebar configuration reset to defaults'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error resetting sidebar configs:', err);
      setError(t('sidebarConfig.resetError', 'Failed to reset sidebar configuration'));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setConfigs(JSON.parse(JSON.stringify(originalConfigs)));
    setHasChanges(false);
  };

  const getItemLabel = (itemKey) => {
    const reg = SIDEBAR_ITEMS[itemKey];
    if (!reg) return itemKey;
    return t(reg.labelKey, itemKey);
  };

  const getItemIcon = (itemKey) => {
    const reg = SIDEBAR_ITEMS[itemKey];
    return reg?.icon || '•';
  };

  const renderSectionItems = (items, droppableId) => (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`sidebar-config-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
        >
          {items.map((item, index) => (
            <Draggable key={item.item_key} draggableId={item.item_key} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className={`sidebar-config-item ${snapshot.isDragging ? 'dragging' : ''} ${!item.is_visible ? 'hidden-item' : ''}`}
                >
                  <div className="sidebar-config-item-left">
                    <span
                      {...provided.dragHandleProps}
                      className="drag-handle"
                      title={t('common.dragToReorder', 'Drag to reorder')}
                    >
                      ⠿
                    </span>
                    <span className="item-icon">{getItemIcon(item.item_key)}</span>
                    <span className="item-label">{getItemLabel(item.item_key)}</span>
                  </div>
                  <div className="sidebar-config-item-right">
                    <div className="role-badges">
                      {AVAILABLE_ROLES.map(role => (
                        <Badge
                          key={role}
                          bg={item.allowed_roles?.includes(role) ? 'success' : 'secondary'}
                          className={`role-badge ${role === 'ADMIN' ? 'admin-locked' : 'clickable'}`}
                          onClick={() => toggleRole(item.item_key, role)}
                          title={role === 'ADMIN' ? t('sidebarConfig.adminAlwaysEnabled', 'Admin always has access') : role}
                          style={{ cursor: role === 'ADMIN' ? 'not-allowed' : 'pointer', opacity: item.allowed_roles?.includes(role) ? 1 : 0.4 }}
                        >
                          {role.charAt(0)}
                        </Badge>
                      ))}
                    </div>
                    <Form.Check
                      type="switch"
                      checked={item.is_visible}
                      onChange={() => toggleVisibility(item.item_key)}
                      className="visibility-switch"
                      title={item.is_visible ? t('sidebarConfig.visible', 'Visible') : t('sidebarConfig.hidden', 'Hidden')}
                    />
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  if (loading) {
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
      <Container className="py-4" style={{ maxWidth: 800 }}>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="mb-1" style={{ fontWeight: 800 }}>
              {t('sidebarConfig.title', 'Sidebar Configuration')}
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              {t('sidebarConfig.subtitle', 'Reorder, show/hide, and control role access for sidebar menu items')}
            </p>
          </div>
          <div className="d-flex gap-2">
            {hasChanges && (
              <Button variant="outline-secondary" size="sm" onClick={handleDiscard} disabled={saving}>
                {t('common.cancel', 'Cancel')}
              </Button>
            )}
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              disabled={saving}
            >
              {t('sidebarConfig.reset', 'Reset Defaults')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert variant="warning" className="py-2 mb-3" style={{ fontSize: '0.85rem' }}>
            {t('sidebarConfig.unsavedChanges', 'You have unsaved changes')}
          </Alert>
        )}

        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

        {/* Role legend */}
        <div className="mb-3 d-flex gap-3 align-items-center" style={{ fontSize: '0.8rem' }}>
          <span className="text-muted">{t('sidebarConfig.roleLegend', 'Roles')}:</span>
          {AVAILABLE_ROLES.map(role => (
            <span key={role}>
              <Badge bg="success" className="me-1" style={{ fontSize: '0.7rem' }}>{role.charAt(0)}</Badge>
              <span className="text-muted">{role}</span>
            </span>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Main section */}
          <Card className="mb-4">
            <Card.Header className="d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
              <span>📊</span>
              {t('sidebarConfig.mainSection', 'Main Navigation')}
              <Badge bg="secondary" className="ms-auto">{mainItems.length}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {renderSectionItems(mainItems, 'main')}
            </Card.Body>
          </Card>

          {/* Settings section */}
          <Card>
            <Card.Header className="d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
              <span>⚙️</span>
              {t('sidebarConfig.settingsSection', 'Settings')}
              <Badge bg="secondary" className="ms-auto">{settingsItems.length}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {renderSectionItems(settingsItems, 'settings')}
            </Card.Body>
          </Card>
        </DragDropContext>

        {/* Reset confirmation modal */}
        <ConfirmModal
          show={showResetConfirm}
          onHide={() => setShowResetConfirm(false)}
          onConfirm={handleReset}
          title={t('sidebarConfig.resetTitle', 'Reset to Defaults')}
          message={t('sidebarConfig.resetMessage', 'This will reset the sidebar configuration to its original defaults. All customizations will be lost.')}
          confirmLabel={t('sidebarConfig.resetConfirm', 'Reset')}
          confirmVariant="warning"
          loading={saving}
        />
      </Container>

      <style>{`
        .sidebar-config-list {
          min-height: 40px;
        }
        .sidebar-config-list.dragging-over {
          background: var(--nv-warm-ghost, #f9f7f4);
        }
        .sidebar-config-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 1rem;
          border-bottom: 1px solid var(--nv-warm-200, #e8e2da);
          background: white;
          transition: opacity 0.2s;
        }
        .sidebar-config-item:last-child {
          border-bottom: none;
        }
        .sidebar-config-item.dragging {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 6px;
        }
        .sidebar-config-item.hidden-item {
          opacity: 0.5;
        }
        .sidebar-config-item-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .sidebar-config-item-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .drag-handle {
          cursor: grab;
          color: var(--nv-warm-400, #a89e93);
          font-size: 1.1rem;
          user-select: none;
          line-height: 1;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .item-icon {
          font-size: 1.1rem;
        }
        .item-label {
          font-size: 0.88rem;
          font-weight: 500;
        }
        .role-badges {
          display: flex;
          gap: 3px;
        }
        .role-badge {
          font-size: 0.65rem !important;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50% !important;
          padding: 0 !important;
        }
        .role-badge.admin-locked {
          cursor: not-allowed !important;
        }
        .visibility-switch .form-check-input {
          cursor: pointer;
        }
      `}</style>
    </Layout>
  );
};

export default SidebarMenuConfigPage;
