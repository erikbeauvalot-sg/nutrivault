/**
 * Patient Portal Layout
 * Simplified layout for patient-facing portal
 * On native mobile: hides sidebar/hamburger, shows BottomTabBar
 */

import { useState } from 'react';
import { Navbar, Container, Nav, NavDropdown, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { FiLogOut } from 'react-icons/fi';
import LanguageSelector from '../LanguageSelector';
import ThemeSelector from '../ThemeSelector';
import NotificationBell from '../common/NotificationBell';
import PatientPortalSidebar from './PatientPortalSidebar';
import BottomTabBar from '../portal/BottomTabBar';
import OfflineBanner from '../common/OfflineBanner';
import AnimatedPage from '../ios/AnimatedPage';
import { isNative } from '../../utils/platform';
import * as tokenStorage from '../../utils/tokenStorage';
import './Layout.css';

const PatientPortalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const location = useLocation();
  const useBottomTabs = isNative;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    if (isNative) {
      tokenStorage.clearTokens();
      tokenStorage.clearUser();
      logout().catch(() => {});
      window.location.replace('/login');
      return;
    }
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    navigate('/login');
  };

  return (
    <div className={`layout-wrapper ${useBottomTabs ? 'has-bottom-tabs' : ''}`}>
      <Navbar bg="dark" variant="dark" expand="lg" className="portal-navbar">
        <Container fluid>
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
          {isNative ? (
            <div className="d-flex align-items-center gap-2">
              <NotificationBell />
              <ThemeSelector />
              <button
                onClick={handleLogout}
                aria-label={t('navigation.logout')}
                style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', display: 'flex', alignItems: 'center' }}
              >
                <FiLogOut size={20} />
              </button>
            </div>
          ) : (
            <>
              <Navbar.Toggle aria-controls="portal-navbar-nav" />
              <Navbar.Collapse id="portal-navbar-nav">
                <Nav className="ms-auto align-items-lg-center flex-row flex-wrap gap-2 py-2 py-lg-0">
                  <div>
                    <NotificationBell />
                  </div>
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
            </>
          )}
        </Container>
      </Navbar>
      <OfflineBanner />
      <div className="layout-container">
        {!useBottomTabs && (
          <>
            <PatientPortalSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
          </>
        )}
        <main className={`layout-content ${useBottomTabs ? 'no-sidebar' : ''} ${isNative ? 'native-animated' : ''}`}>
          <AnimatedPage locationKey={location.pathname}>
            {children}
          </AnimatedPage>
        </main>
      </div>

      {useBottomTabs && <BottomTabBar />}
    </div>
  );
};

export default PatientPortalLayout;
