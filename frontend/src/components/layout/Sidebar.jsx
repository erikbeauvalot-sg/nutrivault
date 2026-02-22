/**
 * Sidebar Component
 * Side navigation driven by DB-configurable sections, categories, and menu items.
 * - Sections: top-level collapsible areas (except 'main' which shows categories directly)
 * - Categories: collapsible groups within the main section
 * - Falls back to static registry defaults when DB data isn't available
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
import './Sidebar.css';

const CACHE_KEYS = {
  configs: 'sidebarMenuConfigs',
  categories: 'sidebarCategories',
  sections: 'sidebarSections',
};
const CACHE_TTL = 5 * 60 * 1000;
const OPEN_STATE_KEY = 'sidebarOpenState';

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

/** Build initial open/closed state from localStorage + DB defaults */
function buildOpenState(sections, categories) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(OPEN_STATE_KEY) || '{}'); } catch { /* ignore */ }

  const state = {};

  // Section keys (for non-main sections)
  if (sections) {
    sections.filter(s => s.key !== 'main').forEach(s => {
      state[`section:${s.key}`] = s.key in saved ? saved[s.key] : (s.is_default_open !== false);
    });
  }

  // Category keys (for main section groups)
  if (categories) {
    categories.filter(c => c.section === 'main').forEach(cat => {
      state[`cat:${cat.key}`] = cat.key in saved ? saved[cat.key] : (cat.is_default_open !== false);
    });
  }

  // Fallback for hardcoded groups
  GROUP_ORDER.forEach(g => {
    if (!(`cat:${g}` in state)) {
      state[`cat:${g}`] = g in saved ? saved[g] : true;
    }
  });

  return state;
}

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [dbConfigs, setDbConfigs] = useState(() => getCached(CACHE_KEYS.configs));
  const [dbCategories, setDbCategories] = useState(() => getCached(CACHE_KEYS.categories));
  const [dbSections, setDbSections] = useState(() => getCached(CACHE_KEYS.sections));
  const [openState, setOpenState] = useState(() =>
    buildOpenState(getCached(CACHE_KEYS.sections), getCached(CACHE_KEYS.categories))
  );

  // applyDefaults=true → apply is_default_open from DB even if key already exists in openState
  // Used when admin saves config so changes take effect immediately
  const fetchData = useCallback((applyDefaults = false) => {
    let cancelled = false;

    // On initial load use cache; on forced refresh skip it (cache was just cleared)
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
          secData.filter(s => s.key !== 'main').forEach(s => {
            // Always update on forced refresh; only add missing keys on initial load
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

  // Initial fetch on mount
  useEffect(() => {
    return fetchData();
  }, [fetchData]);

  // Re-fetch + apply new defaults when admin saves config
  useEffect(() => {
    const handler = () => fetchData(true);
    window.addEventListener('sidebarConfigUpdated', handler);
    return () => window.removeEventListener('sidebarConfigUpdated', handler);
  }, [fetchData]);

  // Persist open state
  useEffect(() => {
    try {
      // Store with simplified keys for backwards compat
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

  // Build visible, role-filtered items from DB configs
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
          // null when no category assigned (renders at top level); fallback to
          // registry group only when no DB categories exist at all
          group: c.category_key || (dbCategories?.length > 0 ? null : reg.group),
        };
      })
      .filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbConfigs, dbCategories, userRole, user, t]);

  // Sections sorted by display_order
  const sections = useMemo(() => {
    if (dbSections && dbSections.length > 0) {
      return [...dbSections].sort((a, b) => a.display_order - b.display_order);
    }
    // Fallback: derive from item sections
    return [
      { key: 'main', label: 'Principal', icon: '📊', is_default_open: true },
      { key: 'settings', label: t('navigation.settings', 'Paramètres'), icon: '⚙️', is_default_open: false },
    ];
  }, [dbSections, t]);

  // Categories per section
  const categoriesBySection = useMemo(() => {
    if (!dbCategories) return {};
    const map = {};
    dbCategories.forEach(cat => {
      if (!map[cat.section]) map[cat.section] = [];
      map[cat.section].push(cat);
    });
    // Sort each section's categories by display_order
    Object.keys(map).forEach(s => {
      map[s].sort((a, b) => a.display_order - b.display_order);
    });
    return map;
  }, [dbCategories]);

  // Fallback items when no DB data
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

    // Walk items in display_order: uncategorized items render inline,
    // categorized items are collected per group (group header appears at
    // position of first item in that group).
    const renderOrder = [];
    const grouped = {};
    sectionItems.forEach(item => {
      const g = item.group; // null = no category assigned
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

    return renderOrder.map((entry, idx) => {
      if (entry.type === 'item') {
        return <div key={entry.item.path || idx}>{renderItem(entry.item)}</div>;
      }

      const items = grouped[entry.key];
      if (!items || items.length === 0) return null;

      const cat = catMap[entry.key] || { key: entry.key, label: entry.key, icon: '' };

      if (items.length === 1) {
        return <div key={cat.key}>{renderItem(items[0])}</div>;
      }

      const stateKey = `cat:${cat.key}`;
      const isOpen = openState[stateKey] !== false;
      const label = cat.label || t(GROUP_LABELS[cat.key] || `sidebar.groups.${cat.key}`, cat.key);

      return (
        <div key={cat.key} className="sidebar-group">
          <div className={`sidebar-group-header ${isOpen ? 'open' : ''}`} onClick={() => toggle(stateKey)}>
            {cat.icon && <span className="sidebar-group-icon">{cat.icon}</span>}
            <span className="sidebar-group-label">{label}</span>
            <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
          </div>
          {isOpen && <div className="sidebar-group-items">{items.map(renderItem)}</div>}
        </div>
      );
    });
  };

  const renderNonMainSection = (sec, sectionItems) => {
    const stateKey = `section:${sec.key}`;
    // Default: use is_default_open if no saved state
    const isOpen = stateKey in openState ? openState[stateKey] : sec.is_default_open !== false;

    // Check if this section has multiple categories (group items within section)
    const secCats = categoriesBySection[sec.key] || [];
    const hasCategories = secCats.length > 0 && sectionItems.some(i => i.group && secCats.find(c => c.key === i.group));

    return (
      <div key={sec.key} className="sidebar-section-block">
        <div
          className={`sidebar-section-header ${isOpen ? 'open' : ''}`}
          onClick={() => toggle(stateKey)}
        >
          <span className="sidebar-icon">{sec.icon}</span>
          <span className="sidebar-label">{sec.label}</span>
          <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
        </div>
        {isOpen && (
          <div className="sidebar-section-items">
            {hasCategories
              ? renderMainSection(sectionItems, sec.key)
              : sectionItems.map(renderItem)
            }
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const allItems = visibleItems || [
    ...(fallbackItems?.main || []),
    ...(fallbackItems?.settings || []),
  ];

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''}`}>
      <Nav className="flex-column sidebar-nav">
        {sections.map(sec => {
          const sectionItems = allItems.filter(i => i.section === sec.key);
          if (sectionItems.length === 0) return null; // skip empty sections

          if (sec.key === 'main') {
            return (
              <div key="main">
                {renderMainSection(sectionItems)}
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
