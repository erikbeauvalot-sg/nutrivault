/**
 * Sidebar Component
 * Left navigation menu with role-based visibility
 */

import { NavLink } from 'react-router-dom';
import { Nav, Offcanvas } from 'react-bootstrap';
import useAuth from '../../hooks/useAuth';
import '../../styles/layout.css';

export function Sidebar({ show, onHide }) {
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';
  const isDietitian = user?.role === 'DIETITIAN';
  const isAssistant = user?.role === 'ASSISTANT';
  const isViewer = user?.role === 'VIEWER';

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'bi-speedometer2',
      visible: true,
    },
    {
      label: 'Patients',
      path: '/patients',
      icon: 'bi-people',
      visible: true,
    },
    {
      label: 'Visits',
      path: '/visits',
      icon: 'bi-calendar-event',
      visible: isDietitian || isAssistant,
    },
    {
      label: 'Billing',
      path: '/billing',
      icon: 'bi-receipt',
      visible: isDietitian || isAdmin,
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: 'bi-bar-chart',
      visible: isDietitian || isAdmin,
    },
    {
      label: 'Audit Logs',
      path: '/audit-logs',
      icon: 'bi-clock-history',
      visible: isAdmin,
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'bi-gear',
      visible: isAdmin,
      dividerBefore: true,
    },
    {
      label: 'User Management',
      path: '/users',
      icon: 'bi-person-badge',
      visible: isAdmin,
    },
  ];

  const sidebarContent = (
    <Nav className="flex-column">
      {menuItems.map((item, index) => (
        item.visible && (
          <div key={item.path}>
            {item.dividerBefore && <hr className="my-2" />}
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
              onClick={onHide}
            >
              <i className={`bi ${item.icon} me-2`} />
              {item.label}
            </NavLink>
          </div>
        )
      ))}
    </Nav>
  );

  return (
    <>
      {/* Sidebar - Desktop (always visible) */}
      <div className="sidebar-desktop d-none d-lg-block">
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h6 className="text-muted px-3 py-2">Menu</h6>
          </div>
          {sidebarContent}
        </div>
      </div>

      {/* Sidebar - Mobile (offcanvas) */}
      <Offcanvas show={show} onHide={onHide} placement="start" className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>NutriVault</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h6 className="text-muted px-3 py-2">Menu</h6>
            </div>
            {sidebarContent}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Sidebar;
