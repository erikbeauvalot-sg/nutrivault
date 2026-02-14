import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.beauvalot.nutrivault",
  appName: "NutriVault",
  webDir: "dist",
  server: {
    // Allow loading resources from the production server (images, uploads)
    allowNavigation: ["nutrivault.beauvalot.com", "nutrivault.beauvalot.fr"],
  },
  plugins: {
    CapacitorHttp: {
      // Route fetch/XHR through native layer to bypass WKWebView CORS restrictions
      enabled: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a2a3a",
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#1a2a3a",
      showSpinner: false,
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
