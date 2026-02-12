import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as notificationService from '../services/notificationService';
import { isNative } from '../utils/platform';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 seconds

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      // Sync iOS badge: reset when no unread (clears stale badges from before DB tracking)
      if (isNative && count === 0) {
        notificationService.resetBadge().catch(() => {});
      }
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      // Reset iOS badge
      if (isNative) {
        notificationService.resetBadge().catch(() => {});
      }
    } catch {
      // silent
    }
  }, []);

  // Poll unread count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    refreshCount();
    intervalRef.current = setInterval(refreshCount, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, refreshCount]);

  // Listen for custom 'notificationReceived' event (dispatched from push handler)
  useEffect(() => {
    const handler = () => refreshCount();
    window.addEventListener('notificationReceived', handler);
    return () => window.removeEventListener('notificationReceived', handler);
  }, [refreshCount]);

  // On app resume (iOS foreground), refresh count only.
  // Badge sync is handled inside refreshCount (resets to 0 when no unread).
  // Do NOT call resetBadge() unconditionally here — it would wipe the badge
  // even when there ARE unread notifications (push already set it correctly).
  useEffect(() => {
    if (!isNative || !isAuthenticated) return;

    let App;
    const setupListener = async () => {
      try {
        const mod = await import('@capacitor/app');
        App = mod.App;
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            refreshCount();
          }
        });
      } catch {
        // Capacitor not available
      }
    };

    setupListener();
    return () => {
      if (App) App.removeAllListeners().catch(() => {});
    };
  }, [isAuthenticated, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
