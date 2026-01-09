'use client';

import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function Sidebar({ collapsed, visible, onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role?.name === 'ADMIN';
  const isDietitian = user?.role?.name === 'DIETITIAN';
  const isAssistant = user?.role?.name === 'ASSISTANT';

  const navigationItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: 'fas fa-tachometer-alt', visible: true },
    { href: '/patients', label: 'Patients', icon: 'fas fa-users', visible: true },
    { href: '/visits', label: 'Visites', icon: 'fas fa-calendar-check', visible: isDietitian || isAssistant },
    { href: '/billing', label: 'Facturation', icon: 'fas fa-receipt', visible: isDietitian || isAdmin },
    { href: '/reports', label: 'Rapports', icon: 'fas fa-chart-bar', visible: isDietitian || isAdmin },
    { href: '/audit-logs', label: 'Logs d\'audit', icon: 'fas fa-clock-history', visible: isAdmin },
    { href: '/settings', label: 'Paramètres', icon: 'fas fa-cogs', visible: isAdmin },
    { href: '/users', label: 'Utilisateurs', icon: 'fas fa-user-shield', visible: isAdmin },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const sidebarClasses = [
    'adminlte-sidebar',
    collapsed && 'collapsed',
    visible && 'show'
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      {/* Brand */}
      <div className="sidebar-brand">
        <Link to="/dashboard" onClick={onClose}>
          <i className="fas fa-heartbeat me-2"></i>
          {!collapsed && 'NutriVault'}
        </Link>
      </div>

      {/* Navigation */}
      <nav>
        <ul className="sidebar-nav">
          {navigationItems
            .filter(item => item.visible)
            .map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                onClick={onClose}
              >
                <i className={item.icon}></i>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section at bottom */}
      {!collapsed && (
        <div className="sidebar-footer mt-auto p-3">
          <div className="user-info text-center">
            <div className="user-avatar mb-2">
              <i className="fas fa-user-circle fa-2x text-light"></i>
            </div>
            <div className="user-name small text-light opacity-75">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="user-role small text-light opacity-50">
              {user?.role?.name}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
