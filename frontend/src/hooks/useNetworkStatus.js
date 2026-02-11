/**
 * React hook for network status
 * Returns { isOnline, connectionType }
 */

import { useState, useEffect } from 'react';
import * as networkService from '../services/networkService';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    // Check initial status
    networkService.isOnline().then(setIsOnline);

    // Listen for changes
    let removeListener;
    networkService.addListener((connected, type) => {
      setIsOnline(connected);
      setConnectionType(type);
    }).then((remove) => {
      removeListener = remove;
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  return { isOnline, connectionType };
}
