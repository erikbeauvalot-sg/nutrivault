/**
 * SidebarMenuConfigPage
 * Admin page for configuring sidebar sections, categories, and menu items.
 *
 * Tab 1 "Catégories": Manage sections (add/edit/delete/reorder) and their categories
 * Tab 2 "Éléments du menu": Reorder items, set visibility/roles/category, move across sections
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Button, Alert, Spinner, Form, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import sidebarMenuConfigService from '../services/sidebarMenuConfigService';
import sidebarCategoryService from '../services/sidebarCategoryService';
import sidebarSectionService from '../services/sidebarSectionService';
import SIDEBAR_ITEMS from '../config/sidebarItemRegistry';

const AVAILABLE_ROLES = ['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'];

const EMOJI_SUGGESTIONS = [
  '🏥','🏢','🏠','🏛','🌿','🌱','🍀','🥗','🍎','🥕',
  '💬','📧','📱','📞','💰','💳','📊','📈','📉','📋','📄',
  '🔧','⚙️','🔐','🔑','👥','👤','🗓️','📅','⏱️','🔔','🤖',
  '🎨','🖼️','📡','📏','⭐','🧪','💡','🎯','🗂️','📁','🔖',
];

const reorderList = (list, from, to) => {
  const r = Array.from(list);
  const [item] = r.splice(from, 1);
  r.splice(to, 0, item);
  return r.map((x, i) => ({ ...x, display_order: i + 1 }));
};

// ─── Emoji Picker ─────────────────────────────────────────────────────────────
const EmojiPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="emoji-btn" onClick={() => setOpen(o => !o)} title="Choisir une icône">
        {value || '📁'}
      </button>
      {open && (
        <div className="emoji-picker-dropdown">
          <div className="emoji-grid">
            {EMOJI_SUGGESTIONS.map(e => (
              <button key={e} type="button"
                className={`emoji-option ${value === e ? 'selected' : ''}`}
                onClick={() => { onChange(e); setOpen(false); }}
              >{e}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Inline editable row ─────────────────────────────────────────────────────
const EditableRow = ({ icon, label, extraBadge, isOpen: defaultOpen, onSave, onCancel, autoFocus }) => {
  const [ico, setIco] = useState(icon || '📁');
  const [lbl, setLbl] = useState(label || '');
  const [defOpen, setDefOpen] = useState(defaultOpen !== false);
  const { t } = useTranslation();

  return (
    <div className="editable-row">
      <EmojiPicker value={ico} onChange={setIco} />
      <input
        className="category-label-input"
        value={lbl}
        onChange={e => setLbl(e.target.value)}
        autoFocus={autoFocus}
        placeholder={t('sidebarCategories.categoryName', 'Nom')}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave({ icon: ico, label: lbl, is_default_open: defOpen });
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Form.Check
        type="switch"
        checked={defOpen}
        onChange={e => setDefOpen(e.target.checked)}
        title={t('sidebarCategories.defaultOpen', 'Ouvert par défaut')}
        className="ms-1"
      />
      <button className="cat-action-btn save-btn" onClick={() => onSave({ icon: ico, label: lbl, is_default_open: defOpen })} disabled={!lbl.trim()}>✓</button>
      <button className="cat-action-btn cancel-btn" onClick={onCancel}>✕</button>
    </div>
  );
};

// ─── Categories Tab ────────────────────────────────────────────────────────────
const CategoriesTab = ({ sections, categories, onRefresh, t }) => {
  const [activeSectionKey, setActiveSectionKey] = useState(sections[0]?.key || 'main');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'cat' | 'section'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeSection = sections.find(s => s.key === activeSectionKey) || sections[0];
  const sectionCats = useMemo(() =>
    categories.filter(c => c.section === activeSectionKey).sort((a, b) => a.display_order - b.display_order),
    [categories, activeSectionKey]
  );

  // Keep active section valid when sections change
  useEffect(() => {
    if (!sections.find(s => s.key === activeSectionKey) && sections.length > 0) {
      setActiveSectionKey(sections[0].key);
    }
  }, [sections, activeSectionKey]);

  const handleCatDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = reorderList(sectionCats, result.source.index, result.destination.index);
    // Optimistic update handled by parent refetch
    try {
      await sidebarCategoryService.reorderCategories(activeSectionKey, reordered.map(c => c.id));
      clearSidebarCache();
      onRefresh();
    } catch {
      setError(t('sidebarCategories.reorderError', 'Erreur lors du réordonnancement'));
    }
  };

  const handleAddCat = async ({ icon, label, is_default_open }) => {
    if (!label.trim()) return;
    setSaving(true); setError(null);
    try {
      await sidebarCategoryService.createCategory({ label, icon, section: activeSectionKey, is_default_open });
      setAddingCat(false);
      clearSidebarCache();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error', 'Erreur'));
    } finally { setSaving(false); }
  };

  const handleEditCat = async (id, data) => {
    setSaving(true); setError(null);
    try {
      await sidebarCategoryService.updateCategory(id, data);
      setEditingCatId(null);
      clearSidebarCache();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error', 'Erreur'));
    } finally { setSaving(false); }
  };

  const handleAddSection = async ({ icon, label, is_default_open }) => {
    if (!label.trim()) return;
    setSaving(true); setError(null);
    try {
      const created = await sidebarSectionService.createSection({ label, icon, is_default_open });
      setAddingSection(false);
      clearSidebarCache();
      onRefresh();
      setActiveSectionKey(created.key);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error', 'Erreur'));
    } finally { setSaving(false); }
  };

  const handleEditSection = async (id, data) => {
    setSaving(true); setError(null);
    try {
      await sidebarSectionService.updateSection(id, data);
      setEditingSectionId(null);
      clearSidebarCache();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error', 'Erreur'));
    } finally { setSaving(false); }
  };

  const confirmDelete = (target, type) => {
    setDeleteTarget(target);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setSaving(true); setError(null);
    try {
      if (deleteType === 'cat') {
        await sidebarCategoryService.deleteCategory(deleteTarget.id);
      } else {
        await sidebarSectionService.deleteSection(deleteTarget.id);
      }
      clearSidebarCache();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || t('sidebarCategories.deleteCategoryError', 'Impossible de supprimer'));
    } finally {
      setSaving(false);
      setDeleteTarget(null);
      setDeleteType(null);
    }
  };

  const BUILTIN_SECTIONS = ['main', 'settings'];

  return (
    <div className="categories-tab">
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">{error}</Alert>}

      {/* Section tabs */}
      <div className="section-tabs mb-4">
        {sections.map(sec => (
          editingSectionId === sec.id ? (
            <div key={sec.id} className="section-tab-editing">
              <EditableRow
                icon={sec.icon} label={sec.label} isOpen={sec.is_default_open}
                onSave={data => handleEditSection(sec.id, data)}
                onCancel={() => setEditingSectionId(null)}
                autoFocus
              />
            </div>
          ) : (
            <div key={sec.id} className={`section-tab-item ${activeSectionKey === sec.key ? 'active' : ''}`}>
              <button
                className="section-tab-btn"
                onClick={() => setActiveSectionKey(sec.key)}
              >
                {sec.icon} {sec.label}
              </button>
              {activeSectionKey === sec.key && (
                <div className="section-tab-actions">
                  <button className="cat-action-btn edit-btn" onClick={() => setEditingSectionId(sec.id)} title={t('common.edit', 'Modifier')}>✎</button>
                  {!BUILTIN_SECTIONS.includes(sec.key) && (
                    <button className="cat-action-btn delete-btn" onClick={() => confirmDelete(sec, 'section')} title={t('common.delete', 'Supprimer')}>🗑</button>
                  )}
                </div>
              )}
            </div>
          )
        ))}
        {addingSection ? (
          <div className="section-tab-adding">
            <EditableRow
              icon="📁" label="" isOpen={true}
              onSave={handleAddSection}
              onCancel={() => setAddingSection(false)}
              autoFocus
            />
          </div>
        ) : (
          <button className="add-section-btn" onClick={() => setAddingSection(true)} title={t('sidebarSections.addSection', 'Ajouter une section')}>
            + {t('sidebarSections.addSection', 'Section')}
          </button>
        )}
      </div>

      {/* Categories within active section */}
      <DragDropContext onDragEnd={handleCatDragEnd}>
        <Droppable droppableId="cats">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`category-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            >
              {sectionCats.map((cat, index) => (
                <Draggable key={cat.id} draggableId={cat.id} index={index}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}
                      className={`category-row ${snap.isDragging ? 'dragging' : ''}`}
                    >
                      <span {...prov.dragHandleProps} className="drag-handle">⠿</span>
                      {editingCatId === cat.id ? (
                        <EditableRow
                          icon={cat.icon} label={cat.label} isOpen={cat.is_default_open}
                          onSave={data => handleEditCat(cat.id, data)}
                          onCancel={() => setEditingCatId(null)}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="category-icon">{cat.icon}</span>
                          <span className="category-label-text">{cat.label}</span>
                          <span className="category-key-badge">{cat.key}</span>
                          <span
                            className={`default-open-badge clickable ${cat.is_default_open ? 'open' : ''}`}
                            title={t('sidebarCategories.defaultOpen', 'Ouvert par défaut')}
                            onClick={() => handleEditCat(cat.id, { is_default_open: !cat.is_default_open })}
                          >
                            {cat.is_default_open ? '▾' : '›'}
                          </span>
                          <button className="cat-action-btn edit-btn" onClick={() => setEditingCatId(cat.id)}>✎</button>
                          <button className="cat-action-btn delete-btn" onClick={() => confirmDelete(cat, 'cat')}>🗑</button>
                        </>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add category */}
      {addingCat ? (
        <div className="add-category-form">
          <EditableRow
            icon="📁" label="" isOpen={true}
            onSave={handleAddCat}
            onCancel={() => setAddingCat(false)}
            autoFocus
          />
        </div>
      ) : (
        <button className="add-category-btn" onClick={() => setAddingCat(true)}>
          + {t('sidebarCategories.addCategory', 'Ajouter une catégorie')}
        </button>
      )}

      <ConfirmModal
        show={showDeleteConfirm}
        onHide={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title={deleteType === 'section'
          ? t('sidebarSections.deleteSection', 'Supprimer la section')
          : t('sidebarCategories.deleteCategory', 'Supprimer la catégorie')}
        message={`Supprimer "${deleteTarget?.label}" ?`}
        confirmLabel={t('common.delete', 'Supprimer')}
        confirmVariant="danger"
      />
    </div>
  );
};

// ─── Items Tab ─────────────────────────────────────────────────────────────────
const ItemsTab = ({ configs, setConfigs, sections, categories, t }) => {
  // Build section items maps
  const itemsBySection = useMemo(() => {
    const map = {};
    configs.forEach(c => {
      if (!map[c.section]) map[c.section] = [];
      map[c.section].push(c);
    });
    Object.keys(map).forEach(s => map[s].sort((a, b) => a.display_order - b.display_order));
    return map;
  }, [configs]);

  const allSectionKeys = useMemo(() =>
    sections.map(s => s.key).filter(k => itemsBySection[k] && itemsBySection[k].length > 0),
    [sections, itemsBySection]
  );

  const categoryOptionsBySection = useMemo(() => {
    const map = {};
    sections.forEach(sec => {
      const cats = categories
        .filter(c => c.section === sec.key)
        .sort((a, b) => a.display_order - b.display_order);
      if (cats.length > 0) {
        map[sec.key] = [
          { value: '', label: t('sidebarCategories.noCategory', 'Sans catégorie') },
          ...cats.map(c => ({ value: c.key, label: `${c.icon} ${c.label}` }))
        ];
      }
    });
    return map;
  }, [categories, sections, t]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const srcSection = result.source.droppableId;
    const dstSection = result.destination.droppableId;

    if (srcSection === dstSection) {
      // Reorder within same section
      const items = [...(itemsBySection[srcSection] || [])];
      const reordered = reorderList(items, result.source.index, result.destination.index);
      setConfigs(prev => {
        const other = prev.filter(c => c.section !== srcSection);
        return [...other, ...reordered];
      });
    } else {
      // Cross-section move: update item's section and renumber both
      const srcItems = [...(itemsBySection[srcSection] || [])];
      const dstItems = [...(itemsBySection[dstSection] || [])];
      const [moved] = srcItems.splice(result.source.index, 1);
      const movedUpdated = { ...moved, section: dstSection };
      dstItems.splice(result.destination.index, 0, movedUpdated);
      const srcRenum = srcItems.map((c, i) => ({ ...c, display_order: i + 1 }));
      const dstRenum = dstItems.map((c, i) => ({ ...c, display_order: i + 1 }));
      setConfigs(prev => {
        const others = prev.filter(c => c.section !== srcSection && c.section !== dstSection);
        return [...others, ...srcRenum, ...dstRenum];
      });
    }
  };

  const toggleVisibility = (itemKey) => {
    setConfigs(prev => prev.map(c => c.item_key === itemKey ? { ...c, is_visible: !c.is_visible } : c));
  };

  const toggleRole = (itemKey, role) => {
    if (role === 'ADMIN') return;
    setConfigs(prev => prev.map(c => {
      if (c.item_key !== itemKey) return c;
      const roles = Array.isArray(c.allowed_roles) ? [...c.allowed_roles] : [];
      const idx = roles.indexOf(role);
      if (idx >= 0) roles.splice(idx, 1); else roles.push(role);
      return { ...c, allowed_roles: roles };
    }));
  };

  const changeCategory = (itemKey, val) => {
    setConfigs(prev => prev.map(c => c.item_key === itemKey ? { ...c, category_key: val || null } : c));
  };

  const getItemLabel = (key) => { const r = SIDEBAR_ITEMS[key]; return r ? t(r.labelKey, key) : key; };
  const getItemIcon = (key) => SIDEBAR_ITEMS[key]?.icon || '•';

  const renderItem = (item, prov, snap) => (
    <div
      ref={prov.innerRef}
      {...prov.draggableProps}
      className={`sidebar-config-item ${snap.isDragging ? 'dragging' : ''} ${!item.is_visible ? 'hidden-item' : ''}`}
    >
      <div className="sidebar-config-item-left">
        <span {...prov.dragHandleProps} className="drag-handle" title={t('common.dragToReorder', 'Réordonner')}>⠿</span>
        <span className="item-icon">{getItemIcon(item.item_key)}</span>
        <span className="item-label">{getItemLabel(item.item_key)}</span>
      </div>
      <div className="sidebar-config-item-right">
        {/* Category selector (shown when the item's section has categories) */}
        {categoryOptionsBySection[item.section] && (
          <select
            className="category-select"
            value={item.category_key || ''}
            onChange={e => changeCategory(item.item_key, e.target.value)}
            title={t('sidebarCategories.title', 'Catégorie')}
          >
            {categoryOptionsBySection[item.section].map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {/* Role badges */}
        <div className="role-badges">
          {AVAILABLE_ROLES.map(role => (
            <Badge
              key={role}
              bg={item.allowed_roles?.includes(role) ? 'success' : 'secondary'}
              className={`role-badge ${role === 'ADMIN' ? 'admin-locked' : ''}`}
              onClick={() => toggleRole(item.item_key, role)}
              title={role === 'ADMIN' ? t('sidebarConfig.adminAlwaysEnabled', 'Admin a toujours accès') : role}
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
          title={item.is_visible ? t('sidebarConfig.visible', 'Visible') : t('sidebarConfig.hidden', 'Masqué')}
        />
      </div>
    </div>
  );

  return (
    <div className="items-tab">
      {/* Role legend */}
      <div className="mb-3 d-flex gap-3 align-items-center" style={{ fontSize: '0.8rem' }}>
        <span className="text-muted">{t('sidebarConfig.roleLegend', 'Rôles')} :</span>
        {AVAILABLE_ROLES.map(role => (
          <span key={role}>
            <Badge bg="success" className="me-1" style={{ fontSize: '0.7rem' }}>{role.charAt(0)}</Badge>
            <span className="text-muted">{role}</span>
          </span>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {allSectionKeys.map(secKey => {
          const sec = sections.find(s => s.key === secKey);
          const items = itemsBySection[secKey] || [];
          return (
            <div key={secKey} className="items-section-card mb-4">
              <div className="items-section-header">
                <span>{sec?.icon || '📁'}</span>
                <span>{sec?.label || secKey}</span>
                <Badge bg="secondary" className="ms-auto">{items.length}</Badge>
              </div>
              <Droppable droppableId={secKey}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.droppableProps}
                    className={`sidebar-config-list ${snap.isDraggingOver ? 'dragging-over' : ''}`}
                    style={{ minHeight: 40 }}
                  >
                    {items.map((item, idx) => (
                      <Draggable key={item.item_key} draggableId={item.item_key} index={idx}>
                        {(prov, snap) => renderItem(item, prov, snap)}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* Drop zone for sections with no items yet */}
        {sections.filter(s => !allSectionKeys.includes(s.key)).map(sec => (
          <div key={sec.key} className="items-section-card mb-4">
            <div className="items-section-header">
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
              <Badge bg="secondary" className="ms-auto">0</Badge>
            </div>
            <Droppable droppableId={sec.key}>
              {(prov, snap) => (
                <div
                  ref={prov.innerRef}
                  {...prov.droppableProps}
                  className={`sidebar-config-list empty-drop-zone ${snap.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  <div className="empty-section-hint">
                    {t('sidebarSections.dragHere', 'Glisser des éléments ici')}
                  </div>
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clearSidebarCache() {
  localStorage.removeItem('sidebarMenuConfigs');
  localStorage.removeItem('sidebarCategories');
  localStorage.removeItem('sidebarSections');
  window.dispatchEvent(new Event('sidebarConfigUpdated'));
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const SidebarMenuConfigPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('categories');
  const [configs, setConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState([]);

  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;
  useEffect(() => {
    if (userRole && userRole !== 'ADMIN') navigate('/dashboard');
  }, [userRole, navigate]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cfgData, catData, secData] = await Promise.all([
        sidebarMenuConfigService.getAllConfigs(),
        sidebarCategoryService.getAllCategories(),
        sidebarSectionService.getAllSections()
      ]);
      const normalized = cfgData.map(c => ({
        ...c,
        allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
          (typeof c.allowed_roles === 'string' ? JSON.parse(c.allowed_roles) : ['ADMIN', 'DIETITIAN'])
      }));
      setConfigs(normalized);
      setOriginalConfigs(JSON.parse(JSON.stringify(normalized)));
      setCategories(catData);
      setSections(secData);
      setHasChanges(false);
    } catch (err) {
      console.error('Error fetching sidebar data:', err);
      setError(t('sidebarConfig.fetchError', 'Impossible de charger la configuration du menu'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    setHasChanges(JSON.stringify(configs) !== JSON.stringify(originalConfigs));
  }, [configs, originalConfigs]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const items = configs.map(c => ({
        item_key: c.item_key,
        section: c.section,
        display_order: c.display_order,
        is_visible: c.is_visible,
        allowed_roles: c.allowed_roles,
        category_key: c.category_key
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
      setSuccess(t('sidebarConfig.saveSuccess', 'Configuration du menu enregistrée'));
      clearSidebarCache();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving:', err);
      setError(t('sidebarConfig.saveError', 'Impossible d\'enregistrer'));
    } finally { setSaving(false); }
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
      setSuccess(t('sidebarConfig.resetSuccess', 'Configuration réinitialisée'));
      clearSidebarCache();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('sidebarConfig.resetError', 'Impossible de réinitialiser'));
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-4 text-center"><Spinner animation="border" /></Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="mb-1" style={{ fontWeight: 800 }}>{t('sidebarConfig.title', 'Configuration du menu')}</h2>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              {t('sidebarConfig.subtitle', 'Gérer les sections, catégories et éléments du menu')}
            </p>
          </div>
          <div className="d-flex gap-2">
            {activeTab === 'items' && hasChanges && (
              <Button variant="outline-secondary" size="sm"
                onClick={() => { setConfigs(JSON.parse(JSON.stringify(originalConfigs))); setHasChanges(false); }}
                disabled={saving}>
                {t('common.cancel', 'Annuler')}
              </Button>
            )}
            <Button variant="outline-warning" size="sm" onClick={() => setShowResetConfirm(true)} disabled={saving}>
              {t('sidebarConfig.reset', 'Réinitialiser')}
            </Button>
            {activeTab === 'items' && (
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}
                {t('common.save', 'Enregistrer')}
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'items' && hasChanges && (
          <Alert variant="warning" className="py-2 mb-3" style={{ fontSize: '0.85rem' }}>
            {t('sidebarConfig.unsavedChanges', 'Vous avez des modifications non enregistrées')}
          </Alert>
        )}

        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

        {/* Tab bar */}
        <div className="config-tabs mb-4">
          <button className={`config-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            🗂️ {t('sidebarCategories.title', 'Catégories')}
            <Badge bg="secondary" className="ms-2">{categories.length}</Badge>
          </button>
          <button className={`config-tab ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
            ☰ {t('sidebarCategories.menuItems', 'Éléments du menu')}
            <Badge bg="secondary" className="ms-2">{configs.length}</Badge>
            {hasChanges && <span className="unsaved-dot" />}
          </button>
        </div>

        {activeTab === 'categories' ? (
          <CategoriesTab sections={sections} categories={categories} onRefresh={fetchAll} t={t} />
        ) : (
          <ItemsTab configs={configs} setConfigs={setConfigs} sections={sections} categories={categories} t={t} />
        )}

        <ConfirmModal
          show={showResetConfirm}
          onHide={() => setShowResetConfirm(false)}
          onConfirm={handleReset}
          title={t('sidebarConfig.resetTitle', 'Réinitialiser les valeurs par défaut')}
          message={t('sidebarConfig.resetMessage', 'Cela réinitialisera la configuration du menu à ses valeurs par défaut. Toutes les personnalisations seront perdues.')}
          confirmLabel={t('sidebarConfig.resetConfirm', 'Réinitialiser')}
          confirmVariant="warning"
          loading={saving}
        />
      </Container>

      <style>{`
        /* ── Tabs ── */
        .config-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--nv-warm-200, #e8e2da); padding-bottom: 0; }
        .config-tab {
          background: none; border: none; border-bottom: 3px solid transparent;
          padding: 0.55rem 1.2rem; font-size: 0.9rem; font-weight: 600;
          color: var(--nv-warm-500, #7a6e65); cursor: pointer; margin-bottom: -2px;
          border-radius: 6px 6px 0 0; display: flex; align-items: center; gap: 6px; transition: all 0.15s;
        }
        .config-tab:hover { color: var(--nv-primary, #4a7c59); background: var(--nv-warm-ghost, #f9f7f4); }
        .config-tab.active { color: var(--nv-primary, #4a7c59); border-bottom-color: var(--nv-primary, #4a7c59); background: white; }
        .unsaved-dot { width: 7px; height: 7px; background: var(--bs-warning); border-radius: 50%; display: inline-block; margin-left: 2px; }

        /* ── Section tabs ── */
        .section-tabs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .section-tab-item { display: flex; align-items: center; gap: 2px; }
        .section-tab-btn {
          background: var(--nv-warm-100, #f2ede7);
          border: 1px solid var(--nv-warm-200, #e8e2da);
          border-radius: 20px; padding: 4px 14px; font-size: 0.85rem; font-weight: 500;
          cursor: pointer; color: var(--nv-warm-600, #5a5049); transition: all 0.15s;
        }
        .section-tab-btn:hover { background: var(--nv-warm-200, #e8e2da); }
        .section-tab-item.active .section-tab-btn {
          background: var(--nv-primary, #4a7c59); color: white; border-color: var(--nv-primary, #4a7c59);
        }
        .section-tab-actions { display: flex; gap: 2px; }
        .section-tab-editing, .section-tab-adding {
          display: flex; align-items: center; border: 1px solid var(--nv-warm-200, #e8e2da);
          border-radius: 20px; padding: 2px 8px; background: var(--nv-warm-ghost, #f9f7f4);
        }
        .add-section-btn {
          background: none; border: 1px dashed var(--nv-warm-300, #d4cabc);
          border-radius: 20px; padding: 3px 12px; font-size: 0.82rem;
          color: var(--nv-warm-500, #7a6e65); cursor: pointer; transition: all 0.15s;
        }
        .add-section-btn:hover { border-color: var(--nv-primary, #4a7c59); color: var(--nv-primary, #4a7c59); }

        /* ── Category list ── */
        .category-list {
          min-height: 40px; border: 1px solid var(--nv-warm-200, #e8e2da);
          border-radius: 8px; overflow: hidden; background: white; margin-bottom: 1rem;
        }
        .category-list.dragging-over { background: var(--nv-warm-ghost, #f9f7f4); }
        .category-row {
          display: flex; align-items: center; gap: 10px;
          padding: 0.65rem 1rem; border-bottom: 1px solid var(--nv-warm-100, #f2ede7); background: white;
        }
        .category-row:last-child { border-bottom: none; }
        .category-row.dragging { box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 6px; }
        .category-icon { font-size: 1.2rem; }
        .category-label-text { font-size: 0.9rem; font-weight: 600; flex: 1; }
        .category-key-badge { font-size: 0.7rem; font-family: monospace; background: var(--nv-warm-100,#f2ede7); color: var(--nv-warm-500,#7a6e65); padding: 1px 6px; border-radius: 10px; }
        .default-open-badge { font-size: 1rem; width: 22px; text-align: center; color: var(--nv-warm-400,#a89e93); }
        .default-open-badge.open { color: var(--nv-primary,#4a7c59); }
        .default-open-badge.clickable { cursor: pointer; border-radius: 4px; transition: background 0.15s; }
        .default-open-badge.clickable:hover { background: var(--nv-warm-100,#f2ede7); }

        /* ── Editable row ── */
        .editable-row { display: flex; align-items: center; gap: 8px; flex: 1; }

        /* ── Cat action buttons ── */
        .cat-action-btn { background: none; border: none; cursor: pointer; padding: 3px 7px; border-radius: 5px; font-size: 0.9rem; line-height: 1; transition: background 0.15s; }
        .cat-action-btn:hover { background: var(--nv-warm-100,#f2ede7); }
        .cat-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-btn { color: var(--nv-primary,#4a7c59); font-weight: 700; }
        .cancel-btn { color: var(--nv-warm-500,#7a6e65); }
        .delete-btn { color: var(--bs-danger); }
        .edit-btn { color: var(--nv-warm-500,#7a6e65); }

        /* ── Inputs ── */
        .category-label-input { flex: 1; border: 1px solid var(--nv-warm-300,#d4cabc); border-radius: 5px; padding: 3px 8px; font-size: 0.88rem; outline: none; background: var(--nv-warm-ghost,#f9f7f4); }
        .category-label-input:focus { border-color: var(--nv-primary,#4a7c59); background: white; }

        /* ── Emoji picker ── */
        .emoji-btn { background: var(--nv-warm-100,#f2ede7); border: 1px solid var(--nv-warm-200,#e8e2da); border-radius: 6px; padding: 3px 8px; font-size: 1.1rem; cursor: pointer; line-height: 1; }
        .emoji-picker-dropdown { position: absolute; top: calc(100% + 4px); left: 0; z-index: 1000; background: white; border: 1px solid var(--nv-warm-200,#e8e2da); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 8px; width: 240px; }
        .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        .emoji-option { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 5px; transition: background 0.1s; }
        .emoji-option:hover { background: var(--nv-warm-100,#f2ede7); }
        .emoji-option.selected { background: var(--nv-warm-200,#e8e2da); }

        /* ── Add buttons ── */
        .add-category-btn { width: 100%; background: none; border: 1px dashed var(--nv-warm-300,#d4cabc); border-radius: 8px; padding: 10px; font-size: 0.88rem; color: var(--nv-warm-500,#7a6e65); cursor: pointer; transition: all 0.15s; text-align: center; }
        .add-category-btn:hover { background: var(--nv-warm-ghost,#f9f7f4); border-color: var(--nv-primary,#4a7c59); color: var(--nv-primary,#4a7c59); }
        .add-category-form { border: 1px solid var(--nv-warm-200,#e8e2da); border-radius: 8px; padding: 0.65rem 1rem; background: var(--nv-warm-ghost,#f9f7f4); }

        /* ── Items section cards ── */
        .items-section-card { border: 1px solid var(--nv-warm-200,#e8e2da); border-radius: 8px; overflow: hidden; }
        .items-section-header { display: flex; align-items: center; gap: 8px; padding: 0.75rem 1rem; background: var(--nv-warm-ghost,#f9f7f4); font-weight: 700; font-size: 0.9rem; border-bottom: 1px solid var(--nv-warm-200,#e8e2da); }

        /* ── Item rows ── */
        .sidebar-config-list { min-height: 40px; }
        .sidebar-config-list.dragging-over { background: var(--nv-warm-ghost,#f9f7f4); }
        .sidebar-config-item { display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 1rem; border-bottom: 1px solid var(--nv-warm-100,#f2ede7); background: white; transition: opacity 0.2s; }
        .sidebar-config-item:last-child { border-bottom: none; }
        .sidebar-config-item.dragging { box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 6px; }
        .sidebar-config-item.hidden-item { opacity: 0.5; }
        .sidebar-config-item-left { display: flex; align-items: center; gap: 0.6rem; }
        .sidebar-config-item-right { display: flex; align-items: center; gap: 0.6rem; }
        .drag-handle { cursor: grab; color: var(--nv-warm-400,#a89e93); font-size: 1.1rem; user-select: none; line-height: 1; }
        .drag-handle:active { cursor: grabbing; }
        .item-icon { font-size: 1.1rem; }
        .item-label { font-size: 0.88rem; font-weight: 500; }
        .category-select { font-size: 0.78rem; padding: 2px 6px; border: 1px solid var(--nv-warm-200,#e8e2da); border-radius: 5px; background: var(--nv-warm-ghost,#f9f7f4); color: var(--nv-warm-600,#5a5049); max-width: 130px; }
        .role-badges { display: flex; gap: 3px; }
        .role-badge { font-size: 0.65rem !important; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50% !important; padding: 0 !important; }
        .role-badge.admin-locked { cursor: not-allowed !important; }
        .visibility-switch .form-check-input { cursor: pointer; }

        /* ── Empty drop zone ── */
        .empty-drop-zone { min-height: 56px; display: flex; align-items: center; justify-content: center; }
        .empty-section-hint { font-size: 0.82rem; color: var(--nv-warm-400,#a89e93); font-style: italic; }
        .empty-drop-zone.dragging-over .empty-section-hint { color: var(--nv-primary,#4a7c59); }
      `}</style>
    </Layout>
  );
};

export default SidebarMenuConfigPage;
