/**
 * Layout Component
 * Main layout wrapper with header, sidebar, and content area
 */

import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="layout-wrapper">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="layout-container">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
