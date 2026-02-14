import { isNative, isIOS } from './utils/platform';

/**
 * Initialize Capacitor plugins for native platforms.
 * Safe to call on web — all calls are no-ops when not native.
 */
export async function initCapacitor() {
  if (!isNative) return;

  // Add native-mobile and has-bottom-tabs body classes for CSS adjustments
  document.body.classList.add('native-mobile');
  document.body.classList.add('has-bottom-tabs');

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { SplashScreen } = await import('@capacitor/splash-screen');
  const { Keyboard } = await import('@capacitor/keyboard');
  const { App } = await import('@capacitor/app');

  // Dark status bar text for the navy header
  await StatusBar.setStyle({ style: Style.Dark });

  if (isIOS) {
    // Overlay status bar so content renders behind it (safe-area CSS handles padding)
    await StatusBar.setOverlaysWebView({ overlay: true });
  }

  // Hide native splash — our custom AppSplashScreen takes over from here
  await SplashScreen.hide({ fadeOutDuration: 300 });

  // Keyboard: add/remove body class for layout adjustments
  Keyboard.addListener('keyboardWillShow', () => {
    document.body.classList.add('keyboard-open');
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.body.classList.remove('keyboard-open');
  });

  // Handle hardware back button (Android mainly, but good practice)
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // Initialize network listener for offline/online status
  const { Network } = await import('@capacitor/network');
  Network.addListener('networkStatusChange', (status) => {
    document.body.classList.toggle('is-offline', !status.connected);
  });
  // Set initial state
  const status = await Network.getStatus();
  document.body.classList.toggle('is-offline', !status.connected);
}
