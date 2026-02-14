/**
 * Layout Component
 * Main layout wrapper with header, sidebar, and content area.
 * On native mobile: hides sidebar/hamburger, shows DietitianBottomTabBar.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import DietitianBottomTabBar from './DietitianBottomTabBar';
import OfflineBanner from '../common/OfflineBanner';
import AnimatedPage from '../ios/AnimatedPage';
import { isNative } from '../../utils/platform';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
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
        <main className={`layout-content ${useBottomTabs ? 'no-sidebar' : ''} ${isNative ? 'native-animated' : ''}`}>
          {isNative ? (
            <AnimatePresence mode="popLayout" initial={false}>
              <AnimatedPage key={location.pathname}>
                {children}
              </AnimatedPage>
            </AnimatePresence>
          ) : (
            children
          )}
        </main>
      </div>
      {useBottomTabs && <DietitianBottomTabBar />}
    </div>
  );
};

export default Layout;
