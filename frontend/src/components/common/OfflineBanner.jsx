/**
 * OfflineBanner
 * Shows a fixed banner below the navbar when offline.
 * Amber/earth-tone solarpunk styling. Auto-hides with "Back online!" when reconnected.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiWifiOff, FiWifi } from 'react-icons/fi';
import useNetworkStatus from '../../hooks/useNetworkStatus';

const OfflineBanner = () => {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      style={{
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: '0.8rem',
        fontWeight: 600,
        zIndex: 1040,
        transition: 'background-color 0.3s ease, color 0.3s ease',
        ...(showReconnected
          ? {
              backgroundColor: 'var(--nv-accent-100, #e8f5e9)',
              color: 'var(--nv-accent-700, #1b5e20)',
            }
          : {
              backgroundColor: 'var(--nv-gold-100, #fff8e1)',
              color: 'var(--nv-gold-800, #5d4037)',
            }),
      }}
    >
      {showReconnected ? (
        <>
          <FiWifi size={14} />
          {t('offline.backOnline', 'Back online!')}
        </>
      ) : (
        <>
          <FiWifiOff size={14} />
          {t('offline.noConnection', 'No internet connection — showing cached data')}
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
