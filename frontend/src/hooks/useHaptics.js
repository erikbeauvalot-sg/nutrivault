/**
 * Haptic feedback hook
 * Wraps @capacitor/haptics. No-ops on web.
 */

import { useCallback } from 'react';
import { isNative } from '../utils/platform';

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

async function getHaptics() {
  if (!Haptics) {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
  }
  return { Haptics, ImpactStyle, NotificationType };
}

export default function useHaptics() {
  const impact = useCallback(async (style = 'Medium') => {
    if (!isNative) return;
    try {
      const { Haptics, ImpactStyle } = await getHaptics();
      await Haptics.impact({ style: ImpactStyle[style] || ImpactStyle.Medium });
    } catch { /* no-op */ }
  }, []);

  const notification = useCallback(async (type = 'Success') => {
    if (!isNative) return;
    try {
      const { Haptics, NotificationType } = await getHaptics();
      await Haptics.notification({ type: NotificationType[type] || NotificationType.Success });
    } catch { /* no-op */ }
  }, []);

  const selectionChanged = useCallback(async () => {
    if (!isNative) return;
    try {
      const { Haptics } = await getHaptics();
      await Haptics.selectionChanged();
    } catch { /* no-op */ }
  }, []);

  return { impact, notification, selectionChanged };
}
