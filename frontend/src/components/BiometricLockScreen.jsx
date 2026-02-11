/**
 * BiometricLockScreen
 * Full-screen gate shown when the app opens and biometric is enabled.
 * User taps to authenticate via Face ID / Touch ID.
 * Falls back to password login after 3 failures.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FiLock, FiUnlock } from 'react-icons/fi';

const MAX_ATTEMPTS = 3;

const BiometricLockScreen = ({ biometricName, onAuthenticated, onFallbackToPassword }) => {
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState(0);
  const [authenticating, setAuthenticating] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const handleAuthenticate = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);

    try {
      const success = await onAuthenticated();
      if (!success) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          onFallbackToPassword();
        }
      }
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        onFallbackToPassword();
      }
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating, attempts, onAuthenticated, onFallbackToPassword]);

  // Auto-trigger biometric on first mount
  useEffect(() => {
    if (!autoTriggered) {
      setAutoTriggered(true);
      // Short delay so the UI renders first
      const timer = setTimeout(handleAuthenticate, 400);
      return () => clearTimeout(timer);
    }
  }, [autoTriggered, handleAuthenticate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #1a2a3a 0%, #0f1f2e 100%)',
        color: '#fff',
        padding: '2rem',
      }}
    >
      <div className="text-center">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {authenticating ? (
            <Spinner animation="border" variant="light" />
          ) : (
            <FiLock style={{ color: 'var(--nv-gold-400, #c4a434)' }} />
          )}
        </div>

        <h3 style={{ fontFamily: 'var(--nv-font-display)', fontWeight: 700, marginBottom: '0.5rem' }}>
          NutriVault
        </h3>

        <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.9rem' }}>
          {attempts > 0 && attempts < MAX_ATTEMPTS
            ? t('biometric.tryAgain', 'Authentication failed. Try again.')
            : t('biometric.tapToUnlock', { type: biometricName }, `Tap to unlock with ${biometricName}`)}
        </p>

        <Button
          variant="outline-light"
          size="lg"
          onClick={handleAuthenticate}
          disabled={authenticating}
          style={{
            borderRadius: '2rem',
            padding: '0.75rem 2.5rem',
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <FiUnlock className="me-2" />
          {t('biometric.unlock', 'Unlock')}
        </Button>

        <div className="mt-4">
          <Button
            variant="link"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}
            onClick={onFallbackToPassword}
          >
            {t('biometric.usePassword', 'Use password instead')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BiometricLockScreen;
