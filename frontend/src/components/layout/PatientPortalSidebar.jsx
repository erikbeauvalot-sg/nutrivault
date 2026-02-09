/**
 * Patient Portal Sidebar
 * Simplified navigation for patient portal
 */

import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

const PatientPortalSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/portal', icon: '🏠', label: t('portal.nav.home', 'Accueil'), exact: true },
    { path: '/portal/radar', icon: '🌀', label: t('portal.nav.radar', 'Mon bilan') },
    { path: '/portal/measures', icon: '📊', label: t('portal.nav.measures', 'Mes mesures') },
    { path: '/portal/visits', icon: '📋', label: t('portal.nav.visits', 'Mes consultations') },
    { path: '/portal/journal', icon: '📓', label: t('portal.nav.journal', 'Mon journal') },
    { path: '/portal/documents', icon: '📄', label: t('portal.nav.documents', 'Mes documents') },
    { path: '/portal/invoices', icon: '💰', label: t('portal.nav.invoices', 'Mes factures') },
    { path: '/portal/recipes', icon: '🍽️', label: t('portal.nav.recipes', 'Mes recettes') },
    { path: '/portal/profile', icon: '👤', label: t('portal.nav.profile', 'Mon profil') },
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 992) {
      onClose();
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'show' : ''}`}>
      <Nav className="flex-column">
        {menuItems.map((item) => (
          <Nav.Link
            key={item.path}
            as={Link}
            to={item.path}
            className={`sidebar-item ${isActive(item) ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
};

export default PatientPortalSidebar;
