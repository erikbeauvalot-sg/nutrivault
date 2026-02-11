/**
 * React hook for biometric authentication state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import * as biometricService from '../services/biometricService';
import { isNative } from '../utils/platform';

export default function useBiometricAuth() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(0); // 0=none, 1=TouchID, 2=FaceID
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    const check = async () => {
      const { isAvailable, biometryType } = await biometricService.isAvailable();
      setBiometricAvailable(isAvailable);
      setBiometricType(biometryType);
      setBiometricEnabled(biometricService.isBiometricEnabled());
    };
    check();
  }, []);

  /** Human-readable name for the biometric type */
  const biometricName = biometricType === 2 ? 'Face ID' : biometricType === 1 ? 'Touch ID' : 'Biometric';

  /** Enable biometric: save credentials in Keychain + set flag */
  const enableBiometric = useCallback(async (username, refreshToken) => {
    await biometricService.saveCredentials(username, refreshToken);
    biometricService.setBiometricEnabled(true);
    setBiometricEnabled(true);
  }, []);

  /** Disable biometric: delete credentials from Keychain + clear flag */
  const disableBiometric = useCallback(async () => {
    await biometricService.deleteCredentials();
    biometricService.setBiometricEnabled(false);
    setBiometricEnabled(false);
  }, []);

  /** Authenticate with biometric + retrieve stored refresh token */
  const authenticateWithBiometric = useCallback(async (reason) => {
    const success = await biometricService.authenticate(reason);
    if (!success) return null;

    const creds = await biometricService.getCredentials();
    if (!creds) return null;

    return { username: creds.username, refreshToken: creds.password };
  }, []);

  return {
    biometricAvailable,
    biometricType,
    biometricName,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
  };
}
