/**
 * Sidebar Component — Solarpunk Glassmorphism Design
 * Side navigation driven by DB-configurable sections, categories, and menu items.
 * Features: user profile section, collapsible mode, warm gradient, glassmorphism.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import SIDEBAR_ITEMS, { getItemPath, GROUP_ORDER, GROUP_LABELS } from '../../config/sidebarItemRegistry';
import { getAllConfigs } from '../../services/sidebarMenuConfigService';
import { getAllCategories } from '../../services/sidebarCategoryService';
import { getAllSections } from '../../services/sidebarSectionService';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Sidebar.css';

const CACHE_KEYS = {
  configs: 'sidebarMenuConfigs',
  categories: 'sidebarCategories',
  sections: 'sidebarSections',
};
const CACHE_TTL = 5 * 60 * 1000;
const OPEN_STATE_KEY = 'sidebarOpenState';
const COLLAPSED_KEY = 'sidebarCollapsed';

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCached(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

function buildOpenState(sections, categories) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(OPEN_STATE_KEY) || '{}'); } catch { /* ignore */ }

  const state = {};
  if (sections) {
    sections.forEach(s => {
      state[`section:${s.key}`] = s.key in saved ? saved[s.key] : (s.is_default_open !== false);
    });
  }
  if (categories) {
    categories.filter(c => c.section === 'main').forEach(cat => {
      state[`cat:${cat.key}`] = cat.key in saved ? saved[cat.key] : (cat.is_default_open !== false);
    });
  }
  GROUP_ORDER.forEach(g => {
    if (!(`cat:${g}` in state)) {
      state[`cat:${g}`] = g in saved ? saved[g] : true;
    }
  });
  return state;
}

/** Get user initials for avatar fallback */
function getInitials(user) {
  if (!user) return '?';
  const name = user.username || user.email || '';
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const [dbConfigs, setDbConfigs] = useState(() => getCached(CACHE_KEYS.configs));
  const [dbCategories, setDbCategories] = useState(() => getCached(CACHE_KEYS.categories));
  const [dbSections, setDbSections] = useState(() => getCached(CACHE_KEYS.sections));
  const [openState, setOpenState] = useState(() =>
    buildOpenState(getCached(CACHE_KEYS.sections), getCached(CACHE_KEYS.categories))
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const fetchData = useCallback((applyDefaults = false) => {
    let cancelled = false;

    if (!applyDefaults) {
      const cachedCfg = getCached(CACHE_KEYS.configs);
      const cachedCat = getCached(CACHE_KEYS.categories);
      const cachedSec = getCached(CACHE_KEYS.sections);
      if (cachedCfg) setDbConfigs(cachedCfg);
      if (cachedCat) setDbCategories(cachedCat);
      if (cachedSec) setDbSections(cachedSec);
    }

    Promise.all([getAllConfigs(), getAllCategories(), getAllSections()])
      .then(([cfgData, catData, secData]) => {
        if (cancelled) return;

        const normalized = cfgData.map(c => ({
          ...c,
          allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
            (() => { try { return JSON.parse(c.allowed_roles); } catch { return ['ADMIN', 'DIETITIAN']; } })()
        }));

        setDbConfigs(normalized);
        setDbCategories(catData);
        setDbSections(secData);
        setCached(CACHE_KEYS.configs, normalized);
        setCached(CACHE_KEYS.categories, catData);
        setCached(CACHE_KEYS.sections, secData);

        setOpenState(prev => {
          const next = { ...prev };
          secData.forEach(s => {
            if (applyDefaults || !(`section:${s.key}` in next)) {
              next[`section:${s.key}`] = s.is_default_open !== false;
            }
          });
          catData.filter(c => c.section === 'main').forEach(cat => {
            if (applyDefaults || !(`cat:${cat.key}` in next)) {
              next[`cat:${cat.key}`] = cat.is_default_open !== false;
            }
          });
          return next;
        });
      })
      .catch(() => { /* fall back to cache / static defaults */ });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData(true);
    window.addEventListener('sidebarConfigUpdated', handler);
    return () => window.removeEventListener('sidebarConfigUpdated', handler);
  }, [fetchData]);

  useEffect(() => {
    try {
      const simple = {};
      Object.entries(openState).forEach(([k, v]) => {
        const plain = k.replace(/^(section:|cat:)/, '');
        simple[plain] = v;
      });
      localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(simple));
    } catch { /* ignore */ }
  }, [openState]);

  const toggle = useCallback((key) => {
    setOpenState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;

  const visibleItems = useMemo(() => {
    if (!dbConfigs || dbConfigs.length === 0) return null;
    return dbConfigs
      .filter(c => c.is_visible)
      .filter(c => (Array.isArray(c.allowed_roles) ? c.allowed_roles : []).includes(userRole))
      .sort((a, b) => a.display_order - b.display_order)
      .map(c => {
        const reg = SIDEBAR_ITEMS[c.item_key];
        if (!reg) return null;
        return {
          path: getItemPath(c.item_key, user),
          icon: reg.icon,
          label: t(reg.labelKey, c.item_key),
          key: c.item_key,
          section: c.section,
          group: c.category_key || (dbCategories?.length > 0 ? null : reg.group),
        };
      })
      .filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbConfigs, dbCategories, userRole, user, t]);

  const sections = useMemo(() => {
    if (dbSections && dbSections.length > 0) {
      return [...dbSections].sort((a, b) => a.display_order - b.display_order);
    }
    return [
      { key: 'main', label: 'Principal', icon: '📊', is_default_open: true },
      { key: 'settings', label: t('navigation.settings', 'Paramètres'), icon: '⚙️', is_default_open: false },
    ];
  }, [dbSections, t]);

  const categoriesBySection = useMemo(() => {
    if (!dbCategories) return {};
    const map = {};
    dbCategories.forEach(cat => {
      if (!map[cat.section]) map[cat.section] = [];
      map[cat.section].push(cat);
    });
    Object.keys(map).forEach(s => {
      map[s].sort((a, b) => a.display_order - b.display_order);
    });
    return map;
  }, [dbCategories]);

  const fallbackItems = useMemo(() => {
    if (visibleItems) return null;
    const isAdmin = userRole === 'ADMIN';
    return {
      main: [
        { path: '/dashboard', icon: '📊', label: t('navigation.dashboard'), group: 'clinic', section: 'main' },
        { path: '/patients', icon: '👥', label: t('navigation.patients'), group: 'clinic', section: 'main' },
        { path: '/clients', icon: '🏢', label: t('navigation.clients', 'Clients'), group: 'clinic', section: 'main' },
        { path: '/agenda', icon: '🗓️', label: t('navigation.agenda'), group: 'clinic', section: 'main' },
        { path: '/visits', icon: '📋', label: t('navigation.visits'), group: 'clinic', section: 'main' },
        { path: '/recipes', icon: '🍽️', label: t('navigation.recipes', 'Recipes'), group: 'nutrition', section: 'main' },
        { path: '/campaigns', icon: '📧', label: t('navigation.campaigns', 'Campaigns'), group: 'communication', section: 'main' },
        { path: '/messages', icon: '💬', label: t('navigation.messages', 'Messages'), group: 'communication', section: 'main' },
        { path: '/billing', icon: '💰', label: t('navigation.billing'), group: 'finance', section: 'main' },
        { path: '/documents', icon: '📄', label: t('documents.title'), group: 'data', section: 'main' },
        { path: '/analytics', icon: '📈', label: t('analytics.title', 'Analytics'), group: 'data', section: 'main' },
        ...(isAdmin ? [{ path: '/users', icon: '👤', label: t('navigation.users'), group: 'admin', section: 'main' }] : []),
      ],
      settings: [
        { path: `/users/${user?.id}`, icon: '👤', label: t('navigation.myProfile', 'My Profile'), section: 'settings' },
        { path: '/settings/themes', icon: '🎨', label: t('navigation.themes', 'Themes'), section: 'settings' },
        { path: '/settings/email-templates', icon: '✉️', label: t('navigation.emailTemplates', 'Email Templates'), section: 'settings' },
        { path: '/settings/email-config', icon: '📡', label: t('navigation.emailConfig', 'Email Config'), section: 'settings' },
        ...(isAdmin ? [
          { path: '/settings/custom-fields', icon: '🔧', label: t('navigation.customFields'), section: 'settings' },
          { path: '/settings/measures', icon: '📏', label: t('navigation.measures'), section: 'settings' },
          { path: '/settings/roles', icon: '🔐', label: t('navigation.roles', 'Manage Roles'), section: 'settings' },
          { path: '/settings/ai-config', icon: '🤖', label: t('navigation.aiConfig', 'AI Configuration'), section: 'settings' },
          { path: '/settings/scheduled-tasks', icon: '⏱️', label: t('navigation.scheduledTasks', 'Scheduled Tasks'), section: 'settings' },
          { path: '/settings/discord', icon: '🔔', label: t('navigation.discord', 'Discord'), section: 'settings' },
          { path: '/settings/sidebar-config', icon: '☰', label: t('navigation.sidebarConfig', 'Sidebar Config'), section: 'settings' },
        ] : []),
      ]
    };
  }, [visibleItems, userRole, user, t]);

  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 992) onClose();
  }, [onClose]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderItem = (item) => (
    <Nav.Link
      key={item.path}
      as={item.disabled ? 'span' : Link}
      to={item.disabled ? undefined : item.path}
      className={`sidebar-item ${location.pathname === item.path ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
      disabled={item.disabled}
      onClick={item.disabled ? undefined : handleNavClick}
    >
      <span className="sidebar-icon">{item.icon}</span>
      <span className="sidebar-label">{item.label}</span>
      {collapsed && <span className="sidebar-tooltip">{item.label}</span>}
    </Nav.Link>
  );

  const renderMainSection = (sectionItems, sectionKey = 'main') => {
    const cats = categoriesBySection[sectionKey] || GROUP_ORDER.map(k => ({
      key: k,
      label: t(GROUP_LABELS[k] || `sidebar.groups.${k}`, k),
      icon: '',
    }));
    const catMap = {};
    cats.forEach(c => { catMap[c.key] = c; });

    const renderOrder = [];
    const grouped = {};
    sectionItems.forEach(item => {
      const g = item.group;
      if (!g) {
        renderOrder.push({ type: 'item', item });
      } else {
        if (!grouped[g]) {
          grouped[g] = [];
          renderOrder.push({ type: 'category', key: g });
        }
        grouped[g].push(item);
      }
    });

    // Merge consecutive ungrouped items into blocks so they share a single vertical line
    const mergedOrder = [];
    let currentBlock = null;
    renderOrder.forEach(entry => {
      if (entry.type === 'item') {
        if (!currentBlock) {
          currentBlock = { type: 'item-block', items: [] };
          mergedOrder.push(currentBlock);
        }
        currentBlock.items.push(entry.item);
      } else {
        currentBlock = null;
        mergedOrder.push(entry);
      }
    });

    return mergedOrder.map((entry, idx) => {
      if (entry.type === 'item-block') {
        return (
          <div key={`ungrouped-${idx}`} className="sidebar-group-items">
            {entry.items.map(renderItem)}
          </div>
        );
      }

      const items = grouped[entry.key];
      if (!items || items.length === 0) return null;

      const cat = catMap[entry.key] || { key: entry.key, label: entry.key, icon: '' };

      if (items.length === 1) {
        return (
          <div key={cat.key} className="sidebar-group-items">
            {renderItem(items[0])}
          </div>
        );
      }

      const stateKey = `cat:${cat.key}`;
      const hasActiveItem = items.some(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
      const isOpen = hasActiveItem || openState[stateKey] !== false;
      const label = cat.label || t(GROUP_LABELS[cat.key] || `sidebar.groups.${cat.key}`, cat.key);

      return (
        <div key={cat.key} className={`sidebar-group ${hasActiveItem ? 'has-active' : ''}`}>
          <div className={`sidebar-group-header ${isOpen ? 'open' : ''}`} onClick={() => toggle(stateKey)}>
            <span className="sidebar-group-label">{label}</span>
            <span className="sidebar-group-line" aria-hidden="true" />
            <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
          </div>
          {isOpen && <div className="sidebar-group-items">{items.map(renderItem)}</div>}
        </div>
      );
    });
  };

  const renderNonMainSection = (sec, sectionItems) => {
    const stateKey = `section:${sec.key}`;
    const isOpen = openState[stateKey] !== false;
    const hasActive = sectionItems.some(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
    return (
      <div key={sec.key} className={`sidebar-section-block ${hasActive ? 'has-active' : ''}`}>
        <div
          className="sidebar-section-label sidebar-section-divider sidebar-section-header"
          onClick={() => toggle(stateKey)}
        >
          <span className="sidebar-section-divider-label">{sec.label}</span>
          <span className="sidebar-group-line" aria-hidden="true" />
          <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
        </div>
        {isOpen && renderMainSection(sectionItems, sec.key)}
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  const allItems = visibleItems || [
    ...(fallbackItems?.main || []),
    ...(fallbackItems?.settings || []),
  ];

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {/* Collapse toggle */}
      <button
        className="sidebar-collapse-btn"
        onClick={toggleCollapsed}
        aria-label={collapsed ? t('sidebar.expand', 'Expand sidebar') : t('sidebar.collapse', 'Collapse sidebar')}
      >
        {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
      </button>

      {/* User profile */}
      <div className="sidebar-profile">
        <div className="sidebar-avatar">
          {getInitials(user)}
        </div>
        <span className="sidebar-role-badge">{userRole || 'User'}</span>
        <span className="sidebar-username">{user?.username || 'User'}</span>
      </div>

      <div className="sidebar-profile-divider" />

      {/* Navigation */}
      <Nav className="flex-column sidebar-nav">
        {sections.map(sec => {
          const sectionItems = allItems.filter(i => i.section === sec.key);
          if (sectionItems.length === 0) return null;

          if (sec.key === 'main') {
            const stateKey = `section:${sec.key}`;
            const isOpen = openState[stateKey] !== false;
            const hasActive = sectionItems.some(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
            return (
              <div key="main" className={`sidebar-section-block ${hasActive ? 'has-active' : ''}`}>
                <div
                  className="sidebar-section-label sidebar-section-header"
                  onClick={() => toggle(stateKey)}
                >
                  <span>{t('sidebar.mainSection', 'Main')}</span>
                  <span className="sidebar-group-line" aria-hidden="true" />
                  <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
                </div>
                {isOpen && renderMainSection(sectionItems)}
              </div>
            );
          }

          return renderNonMainSection(sec, sectionItems);
        })}
      </Nav>

    </div>
  );
};

export default Sidebar;
