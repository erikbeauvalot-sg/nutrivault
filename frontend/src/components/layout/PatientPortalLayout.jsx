/**
 * Patient Portal Layout
 * Simplified layout for patient-facing portal
 */

import { useState } from 'react';
import { Navbar, Container, Nav, NavDropdown, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';
import ThemeSelector from '../ThemeSelector';
import PatientPortalSidebar from './PatientPortalSidebar';
import './Layout.css';

const PatientPortalLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    <div className="layout-wrapper">
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Button
            variant="dark"
            className="d-lg-none me-2 hamburger-menu"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="navbar-toggler-icon"></span>
          </Button>
          <Navbar.Brand as={Link} to="/portal">
            🌱 NutriVault — {t('portal.title', 'Mon Portail')}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="portal-navbar-nav" />
          <Navbar.Collapse id="portal-navbar-nav">
            <Nav className="ms-auto align-items-center">
              <div className="me-2">
                <ThemeSelector />
              </div>
              <div className="me-3">
                <LanguageSelector />
              </div>
              <NavDropdown
                title={
                  <>
                    <i className="bi bi-person-circle me-2"></i>
                    {user?.username || 'Patient'}
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
      <div className="layout-container">
        <PatientPortalSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PatientPortalLayout;
