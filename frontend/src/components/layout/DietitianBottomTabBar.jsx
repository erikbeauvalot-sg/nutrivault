/**
 * DietitianBottomTabBar
 * Fixed bottom tab bar for dietitian/admin users on native mobile.
 * 4 primary tabs + More menu. Reuses BottomTabBar.css glass-morphism styles.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHome, FiUsers, FiCalendar, FiClipboard,
  FiMoreHorizontal, FiBook, FiMail, FiCreditCard,
  FiFile, FiBarChart2, FiUser, FiSettings
} from 'react-icons/fi';
import useHaptics from '../../hooks/useHaptics';
import '../portal/BottomTabBar.css';

const DietitianBottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { impact } = useHaptics();
  const [showMore, setShowMore] = useState(false);

  const tabs = [
    { path: '/dashboard', icon: FiHome, label: t('navigation.dashboard', 'Dashboard'), exact: true },
    { path: '/patients', icon: FiUsers, label: t('navigation.patients', 'Patients') },
    { path: '/agenda', icon: FiCalendar, label: t('navigation.agenda', 'Agenda') },
    { path: '/visits', icon: FiClipboard, label: t('navigation.visits', 'Visits') },
  ];

  const moreTabs = [
    { path: '/recipes', icon: FiBook, label: t('navigation.recipes', 'Recipes') },
    { path: '/campaigns', icon: FiMail, label: t('navigation.campaigns', 'Campaigns') },
    { path: '/billing', icon: FiCreditCard, label: t('navigation.billing', 'Billing') },
    { path: '/documents', icon: FiFile, label: t('documents.title', 'Documents') },
    { path: '/analytics', icon: FiBarChart2, label: t('analytics.title', 'Analytics') },
    { path: '/users', icon: FiUser, label: t('navigation.users', 'Users') },
    ...(user?.role === 'ADMIN' ? [
      { path: '/settings/custom-fields', icon: FiSettings, label: t('navigation.settings', 'Settings') },
    ] : []),
  ];

  const isActive = (tab) => {
    if (tab.exact) return location.pathname === tab.path;
    return location.pathname.startsWith(tab.path);
  };

  const isMoreActive = moreTabs.some(tab => location.pathname.startsWith(tab.path));

  const handleTabPress = (path) => {
    impact('Light');
    setShowMore(false);
    navigate(path);
  };

  const handleMorePress = () => {
    impact('Light');
    setShowMore(prev => !prev);
  };

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="bottom-tab-overlay" onClick={() => setShowMore(false)}>
          <div className="bottom-tab-more-menu" onClick={(e) => e.stopPropagation()}>
            {moreTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.path}
                  className={`bottom-tab-more-item ${isActive(tab) ? 'active' : ''}`}
                  onClick={() => handleTabPress(tab.path)}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav className="bottom-tab-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <button
              key={tab.path}
              className={`bottom-tab-item ${active ? 'active' : ''}`}
              onClick={() => handleTabPress(tab.path)}
            >
              <Icon size={22} />
              <span className="bottom-tab-label">{tab.label}</span>
            </button>
          );
        })}
        <button
          className={`bottom-tab-item ${isMoreActive || showMore ? 'active' : ''}`}
          onClick={handleMorePress}
        >
          <FiMoreHorizontal size={22} />
          <span className="bottom-tab-label">{t('portal.nav.more', 'More')}</span>
        </button>
      </nav>
    </>
  );
};

export default DietitianBottomTabBar;
