'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function TopNav({ onToggleSidebar, sidebarCollapsed }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="adminlte-top-nav navbar navbar-expand-lg">
      <div className="container-fluid">
        {/* Left side - Sidebar toggle and brand */}
        <div className="navbar-left d-flex align-items-center">
          <button
            className="btn btn-link text-dark me-3 p-0"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>

          <Link to="/dashboard" className="navbar-brand">
            <i className="fas fa-heartbeat text-primary me-2"></i>
            NutriVault
          </Link>
        </div>

        {/* Right side - User menu and actions */}
        <div className="navbar-right d-flex align-items-center">
          {/* Search (optional) */}
          <div className="me-3 d-none d-md-block">
            <div className="input-group" style={{ width: '250px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Rechercher..."
                aria-label="Search"
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="dropdown me-3">
            <button
              className="btn btn-link text-dark position-relative"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="fas fa-bell"></i>
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                3
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">Notifications</h6></li>
              <li><a className="dropdown-item" href="#">Nouveau patient inscrit</a></li>
              <li><a className="dropdown-item" href="#">Rendez-vous demain</a></li>
              <li><a className="dropdown-item" href="#">Rapport généré</a></li>
              <li><hr className="dropdown-divider" /></li>
              <li><a className="dropdown-item text-center" href="#">Voir tout</a></li>
            </ul>
          </div>

          {/* User menu */}
          <div className="dropdown">
            <button
              className="btn btn-link text-dark d-flex align-items-center"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="user-avatar me-2">
                <i className="fas fa-user-circle fa-lg"></i>
              </div>
              <span className="d-none d-md-inline">
                {user?.firstName} {user?.lastName}
              </span>
              <i className="fas fa-chevron-down ms-2"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><h6 className="dropdown-header">{user?.email}</h6></li>
              <li><Link className="dropdown-item" to="/profile"><i className="fas fa-user me-2"></i>Profil</Link></li>
              <li><Link className="dropdown-item" to="/settings"><i className="fas fa-cogs me-2"></i>Paramètres</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i>Déconnexion
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}