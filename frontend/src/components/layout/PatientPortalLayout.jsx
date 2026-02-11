/**
 * Patient Portal Layout
 * Simplified layout for patient-facing portal
 * On native mobile: hides sidebar/hamburger, shows BottomTabBar
 */

import { useState } from 'react';
import { Navbar, Container, Nav, NavDropdown, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';
import ThemeSelector from '../ThemeSelector';
import PatientPortalSidebar from './PatientPortalSidebar';
import BottomTabBar from '../portal/BottomTabBar';
import OfflineBanner from '../common/OfflineBanner';
import { isNative } from '../../utils/platform';
import './Layout.css';

const PatientPortalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const useBottomTabs = isNative;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`layout-wrapper ${useBottomTabs ? 'has-bottom-tabs' : ''}`}>
      <Navbar bg="dark" variant="dark" expand="lg" className="portal-navbar">
        <Container fluid>
          {/* Hide hamburger on native mobile (bottom tabs replace sidebar) */}
          {!useBottomTabs && (
            <Button
              variant="dark"
              className="d-lg-none me-2 hamburger-menu p-1"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <span className="navbar-toggler-icon"></span>
            </Button>
          )}
          <Navbar.Brand as={Link} to="/portal" className="me-auto portal-brand">
            <span className="d-none d-sm-inline">{'\uD83C\uDF31'} NutriVault — {t('portal.title', 'Mon Portail')}</span>
            <span className="d-sm-none">{'\uD83C\uDF31'} {t('portal.title', 'Mon Portail')}</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="portal-navbar-nav" />
          <Navbar.Collapse id="portal-navbar-nav">
            <Nav className="ms-auto align-items-lg-center flex-row flex-wrap gap-2 py-2 py-lg-0">
              <div>
                <ThemeSelector />
              </div>
              <div>
                <LanguageSelector />
              </div>
              <NavDropdown
                title={
                  <>
                    <i className="bi bi-person-circle me-1"></i>
                    <span className="d-none d-md-inline">{user?.username || 'Patient'}</span>
                  </>
                }
                id="portal-user-dropdown"
                align="end"
              >
                <NavDropdown.Item as={Link} to="/portal/profile">
                  <i className="bi bi-gear me-2"></i>
                  {t('portal.myProfile', 'Mon profil')}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  {t('navigation.logout')}
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <OfflineBanner />
      <div className="layout-container">
        {/* Hide sidebar on native mobile */}
        {!useBottomTabs && (
          <>
            <PatientPortalSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
          </>
        )}
        <main className={`layout-content ${useBottomTabs ? 'no-sidebar' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar on native mobile */}
      {useBottomTabs && <BottomTabBar />}
    </div>
  );
};

export default PatientPortalLayout;
