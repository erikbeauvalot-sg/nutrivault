/**
 * Sidebar Component
 * Side navigation menu with icon links
 */

import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: t('navigation.dashboard') },
    { path: '/patients', icon: '👥', label: t('navigation.patients') },
    { path: '/visits', icon: '📅', label: t('navigation.visits') },
    { path: '/billing', icon: '💰', label: t('navigation.billing') },
    { path: '/reports', icon: '📈', label: t('navigation.reports'), disabled: true },
    { path: '/users', icon: '👤', label: t('navigation.users') },
  ];

  return (
    <div className="sidebar bg-light border-end">
      <Nav className="flex-column">
        {menuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={item.disabled ? 'span' : Link}
            to={item.disabled ? undefined : item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
            disabled={item.disabled}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.disabled && <span className="badge bg-secondary ms-auto">Soon</span>}
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
};

export default Sidebar;
