/**
 * Server Configuration Screen
 * Allows native app users to configure a custom API server URL.
 * Accessible from the login page via a gear icon.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { isNative } from '../utils/platform';
import { setApiBaseUrl } from '../services/api';
import {
  getServerUrl,
  setServerUrl,
  resetServerUrl,
  testConnection,
  validateUrl,
  getDefaultUrl,
} from '../services/serverConfigService';
import './LoginPage.css';

const ServerConfigScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'success' | 'error'
  const [connectionMessage, setConnectionMessage] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadCurrentUrl();
  }, []);

  async function loadCurrentUrl() {
    try {
      const currentUrl = await getServerUrl();
      setUrl(currentUrl);
    } catch {
      setUrl(getDefaultUrl());
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    const { valid, reason } = validateUrl(url);
    if (!valid) {
      setConnectionStatus('error');
      setConnectionMessage(reason);
      return;
    }

    setTesting(true);
    setConnectionStatus(null);
    setConnectionMessage('');

    const result = await testConnection(url);

    setConnectionStatus(result.ok ? 'success' : 'error');
    setConnectionMessage(
      result.ok
        ? t('serverConfig.connected', 'Connected') + (result.version ? ` (v${result.version})` : '')
        : t('serverConfig.unreachable', 'Server unreachable')
    );
    setTesting(false);
  }

  async function handleSave() {
    const { valid, reason } = validateUrl(url);
    if (!valid) {
      setError(reason);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const trimmed = url.trim().replace(/\/+$/, '');
      await setServerUrl(trimmed);
      setApiBaseUrl(trimmed);
      setUrl(trimmed);
      setSaved(true);
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err.message || t('serverConfig.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setError('');
    setSaved(false);
    setConnectionStatus(null);
    const defaultUrl = await resetServerUrl();
    setUrl(defaultUrl);
    setApiBaseUrl(defaultUrl);
  }

  const isDefault = url.trim().replace(/\/+$/, '') === getDefaultUrl();

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        <Card className="login-card border-0 shadow-lg">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <div className="login-brand-icon" style={{ fontSize: '2rem' }}>{'\u2699\uFE0F'}</div>
              <h2 className="login-brand-title">{t('serverConfig.title', 'Server Configuration')}</h2>
              <p className="login-brand-subtitle">
                {t('serverConfig.subtitle', 'Configure the server your app connects to')}
              </p>
            </div>

            <hr className="login-separator" />

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {saved && (
              <Alert variant="success">
                {t('serverConfig.saved', 'Server URL saved successfully')}
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm" />
              </div>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>{t('serverConfig.urlLabel', 'Server URL')}</Form.Label>
                  <Form.Control
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setConnectionStatus(null);
                      setSaved(false);
                    }}
                    placeholder="https://nutrivault.beauvalot.com/api"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <Form.Text className="text-muted" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>
                    {t('serverConfig.urlHint', 'Example: https://my-server.com/api or http://192.168.1.50:3001')}
                  </Form.Text>
                </Form.Group>

                {/* Connection status indicator */}
                {connectionStatus && (
                  <div className="mb-3 d-flex align-items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: connectionStatus === 'success' ? '#34C759' : '#FF3B30',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: connectionStatus === 'success' ? '#34C759' : '#FF3B30' }}>
                      {connectionMessage}
                    </span>
                  </div>
                )}

                {/* Test connection button */}
                <Button
                  variant="outline-secondary"
                  className="w-100 mb-3"
                  onClick={handleTestConnection}
                  disabled={testing || !url.trim()}
                >
                  {testing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      {t('serverConfig.testing', 'Testing...')}
                    </>
                  ) : (
                    t('serverConfig.testConnection', 'Test Connection')
                  )}
                </Button>

                {/* Save button */}
                <Button
                  className="w-100 login-btn mb-3"
                  size="lg"
                  onClick={handleSave}
                  disabled={saving || !url.trim()}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      {t('common.saving', 'Saving...')}
                    </>
                  ) : (
                    t('serverConfig.save', 'Save & Return')
                  )}
                </Button>

                {/* Reset to default */}
                {!isDefault && (
                  <Button
                    variant="link"
                    className="w-100"
                    onClick={handleReset}
                    style={{ color: 'rgba(196, 164, 52, 0.6)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
                  >
                    {t('serverConfig.reset', 'Reset to default')}
                  </Button>
                )}

                {/* Back to login */}
                <div className="text-center mt-3">
                  <Button
                    variant="link"
                    onClick={() => navigate('/login')}
                    style={{ color: 'rgba(196, 164, 52, 0.6)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
                  >
                    {t('serverConfig.backToLogin', 'Back to login')}
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </Card>

        {/* Current server info for debug */}
        {!loading && isNative && (
          <div className="text-center mt-3" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
            {url}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerConfigScreen;
