/**
 * Sidebar Component
 * Side navigation menu driven by DB-configurable sidebar_menu_configs.
 * Falls back to static registry defaults when DB configs aren't available.
 */

import { useState, useEffect, useMemo } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import SIDEBAR_ITEMS, { getItemPath } from '../../config/sidebarItemRegistry';
import { getAllConfigs } from '../../services/sidebarMenuConfigService';
import './Sidebar.css';

const CACHE_KEY = 'sidebarMenuConfigs';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings') || location.pathname === `/users/${user?.id}`
  );
  const [dbConfigs, setDbConfigs] = useState(() => getCachedConfigs());

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

  // user.role can be a string ('ADMIN') or an object ({ name: 'ADMIN', ... })
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;

  const buildItems = useMemo(() => {
    if (!dbConfigs || dbConfigs.length === 0) {
      // Fallback: use static registry order (original behavior)
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
            key: c.item_key
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
      { path: '/dashboard', icon: '📊', label: t('navigation.dashboard') },
      { path: '/patients', icon: '👥', label: t('navigation.patients') },
      { path: '/agenda', icon: '🗓️', label: t('navigation.agenda') },
      { path: '/visits', icon: '📋', label: t('navigation.visits') },
      { path: '/recipes', icon: '🍽️', label: t('navigation.recipes', 'Recipes') },
      { path: '/campaigns', icon: '📧', label: t('navigation.campaigns', 'Campaigns') },
      { path: '/messages', icon: '💬', label: t('navigation.messages', 'Messages') },
      { path: '/billing', icon: '💰', label: t('navigation.billing') },
      { path: '/documents', icon: '📄', label: t('documents.title') },
      { path: '/analytics', icon: '📈', label: t('analytics.title', 'Analytics') },
      ...(isAdmin ? [{ path: '/users', icon: '👤', label: t('navigation.users') }] : []),
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

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''}`}>
      <Nav className="flex-column sidebar-nav">
        {mainItems.map(renderItem)}

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
