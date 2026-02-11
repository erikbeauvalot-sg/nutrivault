/**
 * Network Service
 * Uses @capacitor/network on native, falls back to navigator.onLine on web.
 */

import { isNative } from '../utils/platform';

let Network = null;

async function getNetwork() {
  if (!Network) {
    const mod = await import('@capacitor/network');
    Network = mod.Network;
  }
  return Network;
}

/**
 * Check if the device is currently online
 * @returns {Promise<boolean>}
 */
export async function isOnline() {
  if (isNative) {
    try {
      const net = await getNetwork();
      const status = await net.getStatus();
      return status.connected;
    } catch {
      return navigator.onLine;
    }
  }
  return navigator.onLine;
}

/**
 * Add a listener for network status changes
 * @param {function} callback - (isConnected: boolean, connectionType: string) => void
 * @returns {Promise<function>} Remove listener function
 */
export async function addListener(callback) {
  if (isNative) {
    try {
      const net = await getNetwork();
      const handle = await net.addListener('networkStatusChange', (status) => {
        callback(status.connected, status.connectionType);
      });
      return () => handle.remove();
    } catch {
      return addWebListener(callback);
    }
  }
  return addWebListener(callback);
}

function addWebListener(callback) {
  const onOnline = () => callback(true, 'unknown');
  const onOffline = () => callback(false, 'none');
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
