/**
 * BottomTabBar
 * Fixed bottom tab bar for patient portal on native mobile.
 * 5 tabs: Home, Journal, Measures, Documents, More.
 * Glass-morphism solarpunk styling with haptic feedback.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHome, FiEdit3, FiActivity, FiFile, FiMoreHorizontal, FiCalendar, FiPieChart, FiCreditCard, FiUser, FiBook, FiMessageSquare } from 'react-icons/fi';
import useHaptics from '../../hooks/useHaptics';
import './BottomTabBar.css';

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { impact } = useHaptics();
  const [showMore, setShowMore] = useState(false);

  const tabs = [
    { path: '/portal', icon: FiHome, label: t('portal.nav.home', 'Accueil'), exact: true },
    { path: '/portal/messages', icon: FiMessageSquare, label: t('portal.nav.messages', 'Messages') },
    { path: '/portal/journal', icon: FiEdit3, label: t('portal.nav.journal', 'Journal') },
    { path: '/portal/measures', icon: FiActivity, label: t('portal.nav.measures', 'Mesures') },
  ];

  const moreTabs = [
    { path: '/portal/visits', icon: FiCalendar, label: t('portal.nav.visits', 'Consultations') },
    { path: '/portal/recipes', icon: FiBook, label: t('portal.nav.recipes', 'Recettes') },
    { path: '/portal/documents', icon: FiFile, label: t('portal.nav.documents', 'Documents') },
    { path: '/portal/radar', icon: FiPieChart, label: t('portal.nav.radar', 'Bilan') },
    { path: '/portal/invoices', icon: FiCreditCard, label: t('portal.nav.invoices', 'Factures') },
    { path: '/portal/profile', icon: FiUser, label: t('portal.nav.profile', 'Profil') },
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

export default BottomTabBar;
