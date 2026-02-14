/**
 * Sidebar Component
 * Side navigation menu driven by DB-configurable sidebar_menu_configs.
 * Falls back to static registry defaults when DB configs aren't available.
 * Main section items are grouped into collapsible sections.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import SIDEBAR_ITEMS, { getItemPath, GROUP_ORDER, GROUP_LABELS } from '../../config/sidebarItemRegistry';
import { getAllConfigs } from '../../services/sidebarMenuConfigService';
import './Sidebar.css';

const CACHE_KEY = 'sidebarMenuConfigs';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const GROUPS_STORAGE_KEY = 'sidebarGroupsOpen';

function getCachedConfigs() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedConfigs(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

function getInitialGroupsOpen() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // All groups open by default
  const defaults = {};
  GROUP_ORDER.forEach(g => { defaults[g] = true; });
  return defaults;
}

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings') || location.pathname === `/users/${user?.id}`
  );
  const [dbConfigs, setDbConfigs] = useState(() => getCachedConfigs());
  const [groupsOpen, setGroupsOpen] = useState(getInitialGroupsOpen);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedConfigs();
    if (cached) {
      setDbConfigs(cached);
    }
    // Always fetch fresh in background
    getAllConfigs()
      .then(data => {
        if (!cancelled) {
          const normalized = data.map(c => ({
            ...c,
            allowed_roles: Array.isArray(c.allowed_roles) ? c.allowed_roles :
              (typeof c.allowed_roles === 'string' ? (() => { try { return JSON.parse(c.allowed_roles); } catch { return ['ADMIN','DIETITIAN']; } })() : ['ADMIN','DIETITIAN'])
          }));
          setDbConfigs(normalized);
          setCachedConfigs(normalized);
        }
      })
      .catch(() => {
        // On error, use cache or fall back to null (static defaults)
      });
    return () => { cancelled = true; };
  }, []);

  // Persist groups open/closed state
  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groupsOpen));
    } catch { /* ignore */ }
  }, [groupsOpen]);

  const toggleGroup = useCallback((group) => {
    setGroupsOpen(prev => ({ ...prev, [group]: !prev[group] }));
  }, []);

  // user.role can be a string ('ADMIN') or an object ({ name: 'ADMIN', ... })
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;

  const buildItems = useMemo(() => {
    if (!dbConfigs || dbConfigs.length === 0) {
      return null;
    }

    const filterAndSort = (section) => {
      return dbConfigs
        .filter(c => c.section === section)
        .filter(c => c.is_visible)
        .filter(c => {
          const roles = Array.isArray(c.allowed_roles) ? c.allowed_roles : [];
          return roles.includes(userRole);
        })
        .sort((a, b) => a.display_order - b.display_order)
        .map(c => {
          const reg = SIDEBAR_ITEMS[c.item_key];
          if (!reg) return null;
          return {
            path: getItemPath(c.item_key, user),
            icon: reg.icon,
            label: t(reg.labelKey, c.item_key),
            key: c.item_key,
            group: reg.group
          };
        })
        .filter(Boolean);
    };

    return {
      main: filterAndSort('main'),
      settings: filterAndSort('settings')
    };
  }, [dbConfigs, userRole, user, t]);

  // Fallback items (original hardcoded behavior)
  const fallbackMain = useMemo(() => {
    if (buildItems) return null;
    const isAdmin = userRole === 'ADMIN';
    return [
      { path: '/dashboard', icon: '📊', label: t('navigation.dashboard'), group: 'clinic' },
      { path: '/patients', icon: '👥', label: t('navigation.patients'), group: 'clinic' },
      { path: '/clients', icon: '🏢', label: t('navigation.clients', 'Clients'), group: 'clinic' },
      { path: '/agenda', icon: '🗓️', label: t('navigation.agenda'), group: 'clinic' },
      { path: '/visits', icon: '📋', label: t('navigation.visits'), group: 'clinic' },
      { path: '/recipes', icon: '🍽️', label: t('navigation.recipes', 'Recipes'), group: 'nutrition' },
      { path: '/campaigns', icon: '📧', label: t('navigation.campaigns', 'Campaigns'), group: 'communication' },
      { path: '/messages', icon: '💬', label: t('navigation.messages', 'Messages'), group: 'communication' },
      { path: '/billing', icon: '💰', label: t('navigation.billing'), group: 'finance' },
      { path: '/quotes', icon: '📝', label: t('navigation.quotes', 'Quotes'), group: 'finance' },
      { path: '/finance', icon: '💹', label: t('navigation.finance', 'Finance'), group: 'finance' },
      { path: '/documents', icon: '📄', label: t('documents.title'), group: 'data' },
      { path: '/analytics', icon: '📈', label: t('analytics.title', 'Analytics'), group: 'data' },
      ...(isAdmin ? [{ path: '/users', icon: '👤', label: t('navigation.users'), group: 'admin' }] : []),
    ];
  }, [buildItems, userRole, t]);

  const fallbackSettings = useMemo(() => {
    if (buildItems) return null;
    const isAdmin = userRole === 'ADMIN';
    return [
      { path: `/users/${user?.id}`, icon: '👤', label: t('navigation.myProfile', 'My Profile') },
      { path: '/settings/themes', icon: '🎨', label: t('navigation.themes', 'Themes') },
      { path: '/settings/email-templates', icon: '✉️', label: t('navigation.emailTemplates', 'Email Templates') },
      { path: '/settings/email-config', icon: '📡', label: t('navigation.emailConfig', 'Email Config') },
      { path: '/settings/invoice-customization', icon: '🖼️', label: t('navigation.invoiceCustomization', 'Invoice Customization') },
      ...(isAdmin ? [
        { path: '/settings/custom-fields', icon: '🔧', label: t('navigation.customFields') },
        { path: '/settings/measures', icon: '📏', label: t('navigation.measures') },
        { path: '/settings/roles', icon: '🔐', label: t('navigation.roles', 'Manage Roles') },
        { path: '/settings/ai-config', icon: '🤖', label: t('navigation.aiConfig', 'AI Configuration') },
        { path: '/settings/scheduled-tasks', icon: '⏱️', label: t('navigation.scheduledTasks', 'Scheduled Tasks') },
        { path: '/settings/discord', icon: '🔔', label: t('navigation.discord', 'Discord') },
        { path: '/settings/sidebar-config', icon: '☰', label: t('navigation.sidebarConfig', 'Sidebar Config') },
      ] : []),
    ];
  }, [buildItems, userRole, user, t]);

  const mainItems = buildItems?.main || fallbackMain;
  const settingsItems = buildItems?.settings || fallbackSettings;

  // Group main items by their group field
  const groupedMain = useMemo(() => {
    const groups = {};
    mainItems.forEach(item => {
      const g = item.group || 'clinic';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [mainItems]);

  const handleNavClick = () => {
    if (window.innerWidth < 992) {
      onClose();
    }
  };

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

  const renderGroupedMain = () => {
    return GROUP_ORDER.map(groupKey => {
      const items = groupedMain[groupKey];
      if (!items || items.length === 0) return null;

      // If only 1 visible item → render without header
      if (items.length === 1) {
        return <div key={groupKey}>{renderItem(items[0])}</div>;
      }

      const isOpen = groupsOpen[groupKey] !== false;

      return (
        <div key={groupKey} className="sidebar-group">
          <div
            className={`sidebar-group-header ${isOpen ? 'open' : ''}`}
            onClick={() => toggleGroup(groupKey)}
          >
            <span className="sidebar-group-label">{t(GROUP_LABELS[groupKey], groupKey)}</span>
            <span className="sidebar-chevron">{isOpen ? '▾' : '›'}</span>
          </div>
          {isOpen && (
            <div className="sidebar-group-items">
              {items.map(renderItem)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''}`}>
      <Nav className="flex-column sidebar-nav">
        {renderGroupedMain()}

        {/* Settings section with collapsible header */}
        <div
          className={`sidebar-section-header ${settingsOpen ? 'open' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <span className="sidebar-icon">⚙️</span>
          <span className="sidebar-label">{t('navigation.settings', 'Settings')}</span>
          <span className="sidebar-chevron">{settingsOpen ? '▾' : '›'}</span>
        </div>

        {settingsOpen && (
          <div className="sidebar-section-items">
            {settingsItems.map(renderItem)}
          </div>
        )}
      </Nav>
    </div>
  );
};

export default Sidebar;
