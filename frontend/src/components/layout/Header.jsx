/**
 * Header Component
 * Top navigation bar with user info and logout
 */

import { Navbar, Container, Nav, NavDropdown, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { isNative } from '../../utils/platform';
import * as tokenStorage from '../../utils/tokenStorage';
import { FiLogOut } from 'react-icons/fi';
import LanguageSelector from '../LanguageSelector';
import ThemeSelector from '../ThemeSelector';
import NotificationBell from '../common/NotificationBell';

const Header = ({ onToggleSidebar, hideHamburger = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    if (isNative) {
      // Clear tokens synchronously THEN redirect — async cleanup runs in background
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
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container fluid>
        {!hideHamburger && (
          <Button
            variant="dark"
            className="d-lg-none me-2 hamburger-menu"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="navbar-toggler-icon"></span>
          </Button>
        )}
        <Navbar.Brand as={Link} to="/dashboard">
          🌱 NutriVault
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
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto d-none d-lg-flex">
                <Nav.Link as={Link} to="/dashboard">{t('navigation.dashboard')}</Nav.Link>
                <Nav.Link as={Link} to="/patients">{t('navigation.patients')}</Nav.Link>
              </Nav>
              <Nav className="align-items-center">
                <div className="me-2">
                  <NotificationBell />
                </div>
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
                      {user?.username || 'User'}
                      <span className="badge bg-secondary ms-2">{user?.role?.name || 'N/A'}</span>
                    </>
                  }
                  id="user-dropdown"
                  align="end"
                >
                  <NavDropdown.Item disabled>
                    <small className="text-muted">{user?.email}</small>
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
  );
};

export default Header;
