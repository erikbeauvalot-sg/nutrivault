/**
 * Header Component
 * Top navigation bar with branding and user menu
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Navbar, Nav, Container, Dropdown, Button,
} from 'react-bootstrap';
import useAuth from '../../hooks/useAuth';
import '../../styles/layout.css';

export function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" expand="lg" sticky="top" className="navbar-dark">
      <Container fluid className="px-4">
        {/* Brand/Logo */}
        <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
          🥗 NutriVault
        </Navbar.Brand>

        {/* Hamburger Toggle Button (mobile) */}
        <Button
          variant="outline-light"
          size="sm"
          className="d-lg-none ms-auto me-3"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list" />
        </Button>

        {/* Navigation */}
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {/* User Dropdown */}
            <Dropdown className="ms-3" show={showUserMenu} onToggle={setShowUserMenu}>
              <Dropdown.Toggle
                as={Button}
                variant="link"
                className="text-white text-decoration-none d-flex align-items-center"
                id="user-dropdown"
              >
                <span className="me-2">
                  {user?.first_name || user?.username}
                </span>
                <i className="bi bi-person-circle" />
              </Dropdown.Toggle>

              <Dropdown.Menu align="end" className="shadow">
                <Dropdown.Item disabled>
                  <small className="text-muted">
                    {user?.email}
                  </small>
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/profile" onClick={() => setShowUserMenu(false)}>
                  <i className="bi bi-person me-2" />
                  My Profile
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/settings" onClick={() => setShowUserMenu(false)}>
                  <i className="bi bi-gear me-2" />
                  Settings
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/api-keys" onClick={() => setShowUserMenu(false)}>
                  <i className="bi bi-key me-2" />
                  API Keys
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
