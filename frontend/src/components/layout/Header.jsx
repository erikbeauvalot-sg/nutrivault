/**
 * Header Component
 * Top navigation bar with user info and logout
 */

import { Navbar, Container, Nav, NavDropdown, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container fluid>
        <Button
          variant="dark"
          className="d-lg-none me-2 hamburger-menu"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span className="navbar-toggler-icon"></span>
        </Button>
        <Navbar.Brand as={Link} to="/dashboard">
          🏥 NutriVault
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto d-none d-lg-flex">
            <Nav.Link as={Link} to="/dashboard">{t('navigation.dashboard')}</Nav.Link>
            <Nav.Link as={Link} to="/patients">{t('navigation.patients')}</Nav.Link>
          </Nav>
          <Nav className="align-items-center">
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
      </Container>
    </Navbar>
  );
};

export default Header;
