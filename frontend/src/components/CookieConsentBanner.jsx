import React, { useState, useEffect } from 'react';
import { hasAskedConsent, setAnalyticsConsent, hasAnalyticsConsent } from '../services/analyticsService';

/**
 * Cookie Consent Banner Component
 * Shows a GDPR-compliant cookie consent banner for analytics tracking
 */
const CookieConsentBanner = ({ onConsent }) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner if consent hasn't been asked yet
    if (!hasAskedConsent()) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    setAnalyticsConsent(true);
    setShowBanner(false);
    if (onConsent) {
      onConsent(true);
    }
  };

  const handleDecline = () => {
    setAnalyticsConsent(false);
    setShowBanner(false);
    if (onConsent) {
      onConsent(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <p style={styles.text}>
          Ce site utilise des cookies pour améliorer votre expérience et analyser le trafic.
          Aucune donnée personnelle n'est partagée avec des tiers.
        </p>
        <div style={styles.buttons}>
          <button onClick={handleDecline} style={styles.declineButton}>
            Refuser
          </button>
          <button onClick={handleAccept} style={styles.acceptButton}>
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    padding: '15px 20px',
    zIndex: 9999,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '15px'
  },
  text: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
    flex: 1,
    minWidth: '250px'
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    flexShrink: 0
  },
  acceptButton: {
    backgroundColor: '#3C6E47',
    color: '#fff',
    border: 'none',
    padding: '10px 25px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  },
  declineButton: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #fff',
    padding: '10px 25px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  }
};

export default CookieConsentBanner;
