'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setSidebarVisible(false); // Hide mobile overlay on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 992) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <div className="adminlte-layout">
      {/* Top Navigation */}
      <TopNav
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        visible={sidebarVisible}
        onClose={closeSidebar}
      />

      {/* Main Content */}
      <main className={`adminlte-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="container-fluid">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarVisible && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}