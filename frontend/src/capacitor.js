import { isNative, isIOS } from './utils/platform';
import { initApiBaseUrl } from './services/api';

/**
 * Initialize Capacitor plugins for native platforms.
 * Safe to call on web — all calls are no-ops when not native.
 */
export async function initCapacitor() {
  // Initialize API base URL from saved preferences (native) or env var (web)
  await initApiBaseUrl();

  if (!isNative) return;

  // Add native-mobile and has-bottom-tabs body classes for CSS adjustments
  document.body.classList.add('native-mobile');
  document.body.classList.add('has-bottom-tabs');

  // CRITICAL: Always hide native splash, even if other plugin init fails.
  // SplashScreen has launchAutoHide: false, so it MUST be hidden explicitly.
  const { SplashScreen } = await import('@capacitor/splash-screen');
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('[Capacitor] SplashScreen.hide failed:', e);
  }

  // Non-critical plugin init — failures here shouldn't block the app
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (isIOS) {
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch (e) {
    console.warn('[Capacitor] StatusBar init failed:', e);
  }

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('[Capacitor] Keyboard init failed:', e);
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (e) {
    console.warn('[Capacitor] App init failed:', e);
  }

  try {
    const { Network } = await import('@capacitor/network');
    Network.addListener('networkStatusChange', (status) => {
      document.body.classList.toggle('is-offline', !status.connected);
    });
    const status = await Network.getStatus();
    document.body.classList.toggle('is-offline', !status.connected);
  } catch (e) {
    console.warn('[Capacitor] Network init failed:', e);
  }
}
