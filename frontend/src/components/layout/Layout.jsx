/**
 * Layout Component
 * Main layout wrapper with header, sidebar, and content area.
 * On native mobile: hides sidebar/hamburger, shows DietitianBottomTabBar.
 */

import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DietitianBottomTabBar from './DietitianBottomTabBar';
import OfflineBanner from '../common/OfflineBanner';
import { isNative } from '../../utils/platform';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const useBottomTabs = isNative;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={`layout-wrapper ${useBottomTabs ? 'has-bottom-tabs' : ''}`}>
      <Header onToggleSidebar={toggleSidebar} hideHamburger={useBottomTabs} />
      <OfflineBanner />
      <div className="layout-container">
        {!useBottomTabs && (
          <>
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
          </>
        )}
        <main className={`layout-content ${useBottomTabs ? 'no-sidebar' : ''}`}>
          {children}
        </main>
      </div>
      {useBottomTabs && <DietitianBottomTabBar />}
    </div>
  );
};

export default Layout;
