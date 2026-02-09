import { isNative, isIOS } from './utils/platform';

/**
 * Initialize Capacitor plugins for native platforms.
 * Safe to call on web — all calls are no-ops when not native.
 */
export async function initCapacitor() {
  if (!isNative) return;

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

  // Hide splash screen once the app is ready
  await SplashScreen.hide();

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
}
