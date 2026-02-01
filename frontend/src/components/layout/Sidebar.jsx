/**
 * Sidebar Component
 * Side navigation menu with icon links
 */

import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: t('navigation.dashboard') },
    { path: '/patients', icon: '👥', label: t('navigation.patients') },
    { path: '/agenda', icon: '🗓️', label: t('navigation.agenda') },
    { path: '/visits', icon: '📋', label: t('navigation.visits') },
    { path: '/recipes', icon: '🍽️', label: t('navigation.recipes', 'Recipes') },
    { path: '/billing', icon: '💰', label: t('navigation.billing') },
    { path: '/documents', icon: '📄', label: t('documents.title'), disabled: false },
    { path: '/analytics', icon: '📈', label: t('analytics.title', 'Analytics') },
    { path: '/settings', icon: '⚙️', label: t('navigation.settings', 'Settings') },
    { path: '/users', icon: '👤', label: t('navigation.users') },
    ...(user?.role === 'ADMIN' ? [
      { path: '/settings/custom-fields', icon: '🔧', label: t('navigation.customFields') },
      { path: '/settings/measures', icon: '📏', label: t('navigation.measures') },
      { path: '/settings/email-templates', icon: '✉️', label: t('navigation.emailTemplates', 'Email Templates') },
      // { path: '/settings/billing-templates', icon: '📋', label: t('navigation.billingTemplates', 'Billing Templates') }, // TODO: Not used yet
      { path: '/settings/invoice-customization', icon: '🎨', label: t('navigation.invoiceCustomization', 'Invoice Customization') },
      { path: '/settings/roles', icon: '🔐', label: t('navigation.roles', 'Manage Roles') },
      { path: '/settings/ai-config', icon: '🤖', label: t('navigation.aiConfig', 'AI Configuration') }
    ] : []),
  ];

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 992) {
      onClose();
    }
  };

  return (
    <div className={`sidebar bg-light border-end ${isOpen ? 'show' : ''}`}>
      <Nav className="flex-column">
        {menuItems.map((item) => (
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
            {item.disabled && <span className="badge bg-secondary ms-auto">{t('common.comingSoon')}</span>}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
};

export default Sidebar;
