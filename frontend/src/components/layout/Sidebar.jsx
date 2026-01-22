/**
 * Sidebar Component
 * Side navigation menu with icon links
 */

import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: t('navigation.dashboard') },
    { path: '/patients', icon: '👥', label: t('navigation.patients') },
    { path: '/visits', icon: '📅', label: t('navigation.visits') },
    { path: '/billing', icon: '💰', label: t('navigation.billing') },
    { path: '/documents', icon: '📄', label: t('documents.title'), disabled: false },
    { path: '/reports', icon: '📈', label: t('navigation.reports') },
    { path: '/users', icon: '👤', label: t('navigation.users') },
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
