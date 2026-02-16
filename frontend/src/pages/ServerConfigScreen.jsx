/**
 * Server Configuration Screen
 * Multi-server management: add, edit, delete, switch active server.
 * Accessible from the login page via a gear icon.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { isNative } from '../utils/platform';
import { setApiBaseUrl } from '../services/api';
import {
  getServers,
  addServer,
  updateServer,
  deleteServer,
  setActiveServer,
  testConnection,
  validateUrl,
  getDefaultUrl,
} from '../services/serverConfigService';
import './LoginPage.css';

const ServerConfigScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = adding, server obj = editing
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null); // server id being tested, or 'form'
  const [testResults, setTestResults] = useState({}); // { serverId: { ok, message, version } }
  const [confirmDelete, setConfirmDelete] = useState(null); // server id pending delete
  const nameInputRef = useRef(null);

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (showForm && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showForm]);

  async function loadServers() {
    try {
      const list = await getServers();
      setServers(list);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditing(null);
    setFormName('');
    setFormUrl('');
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(server) {
    setEditing(server);
    setFormName(server.name);
    setFormUrl(server.url);
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError('');
  }

  async function handleSave() {
    const { valid, reason } = validateUrl(formUrl);
    if (!valid) {
      setFormError(reason);
      return;
    }
    if (!formName.trim()) {
      setFormError(t('serverConfig.nameRequired', 'Server name is required'));
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        await updateServer(editing.id, { name: formName, url: formUrl });
      } else {
        await addServer(formName, formUrl);
      }
      await loadServers();
      closeForm();
    } catch (err) {
      setFormError(err.message || t('serverConfig.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(serverId, url) {
    setTestingId(serverId);
    const result = await testConnection(url);
    setTestResults((prev) => ({ ...prev, [serverId]: result }));
    setTestingId(null);
  }

  async function handleSetActive(server) {
    try {
      await setActiveServer(server.id);
      setApiBaseUrl(server.url);
      await loadServers();
    } catch {
      // Ignore
    }
  }

  async function handleDelete(id) {
    try {
      await deleteServer(id);
      setConfirmDelete(null);
      await loadServers();
    } catch {
      // Ignore
    }
  }

  function handleSelectAndGo(server) {
    handleSetActive(server).then(() => {
      navigate('/login');
    });
  }

  const activeServer = servers.find((s) => s.isActive);

  // Styles
  const cardStyle = (isActive) => ({
    background: isActive
      ? 'rgba(74, 101, 114, 0.18)'
      : 'rgba(255, 255, 255, 0.03)',
    border: isActive
      ? '1px solid rgba(74, 101, 114, 0.5)'
      : '1px solid rgba(196, 164, 52, 0.1)',
    borderRadius: '0.875rem',
    padding: '1rem 1.1rem',
    marginBottom: '0.75rem',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative',
  });

  const badgeStyle = {
    display: 'inline-block',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#1e2c32',
    background: 'linear-gradient(135deg, #c4a434, #d4b444)',
    padding: '0.15rem 0.5rem',
    borderRadius: '2rem',
  };

  const statusDot = (result) => ({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: result?.ok ? '#34C759' : '#FF3B30',
    flexShrink: 0,
  });

  const iconBtnStyle = {
    background: 'none',
    border: 'none',
    padding: '0.35rem',
    cursor: 'pointer',
    color: 'rgba(232, 223, 196, 0.4)',
    fontSize: '0.85rem',
    lineHeight: 1,
    borderRadius: '0.375rem',
    transition: 'all 0.15s ease',
  };

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        <div className="login-card" style={{ borderRadius: '1.25rem', padding: 0 }}>
          <div style={{ padding: '2rem 2rem 1.5rem' }}>
            {/* Header */}
            <div className="text-center mb-3">
              <div className="login-brand-icon" style={{ fontSize: '2rem' }}>{'\u2699\uFE0F'}</div>
              <h2 className="login-brand-title" style={{ fontSize: '1.75rem' }}>
                {t('serverConfig.title', 'Server Configuration')}
              </h2>
              <p className="login-brand-subtitle">
                {t('serverConfig.subtitle', 'Configure the server your app connects to')}
              </p>
            </div>

            <hr className="login-separator" />

            {loading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm" style={{ color: 'rgba(196, 164, 52, 0.5)' }} />
              </div>
            ) : showForm ? (
              /* ─── Add / Edit Form ─── */
              <div style={{ animation: 'fadeSlideUp 0.3s ease forwards' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(196, 164, 52, 0.6)',
                  marginBottom: '1rem',
                }}>
                  {editing
                    ? t('serverConfig.editServer', 'Edit Server')
                    : t('serverConfig.addServer', 'Add Server')
                  }
                </div>

                <Form.Group className="mb-3">
                  <Form.Label style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 400,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(196, 164, 52, 0.6)',
                  }}>
                    {t('serverConfig.serverName', 'Server Name')}
                  </Form.Label>
                  <Form.Control
                    ref={nameInputRef}
                    type="text"
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                    placeholder={t('serverConfig.namePlaceholder', 'e.g. Production, Local Dev')}
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      minHeight: 44,
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: '0.95rem',
                      fontWeight: 200,
                      padding: '0.6rem 0.9rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(196, 164, 52, 0.12)',
                      borderRadius: '0.75rem',
                      color: '#e8dfc4',
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 400,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(196, 164, 52, 0.6)',
                  }}>
                    {t('serverConfig.urlLabel', 'Server URL')}
                  </Form.Label>
                  <Form.Control
                    type="url"
                    value={formUrl}
                    onChange={(e) => { setFormUrl(e.target.value); setFormError(''); setTestResults((p) => ({ ...p, form: undefined })); }}
                    placeholder="https://nutrivault.beauvalot.com/api"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      minHeight: 44,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.8rem',
                      fontWeight: 200,
                      padding: '0.6rem 0.9rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(196, 164, 52, 0.12)',
                      borderRadius: '0.75rem',
                      color: '#e8dfc4',
                    }}
                  />
                  <Form.Text style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: 'rgba(196, 164, 52, 0.35)',
                  }}>
                    {t('serverConfig.urlHint', 'Example: https://my-server.com/api or http://192.168.1.50:3001')}
                  </Form.Text>
                </Form.Group>

                {/* Test result in form */}
                {testResults.form && (
                  <div className="mb-3 d-flex align-items-center gap-2" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem',
                  }}>
                    <span style={statusDot(testResults.form)} />
                    <span style={{ color: testResults.form.ok ? '#34C759' : '#FF3B30' }}>
                      {testResults.form.ok
                        ? t('serverConfig.connected', 'Connected') + (testResults.form.version ? ` (v${testResults.form.version})` : '')
                        : t('serverConfig.unreachable', 'Server unreachable')
                      }
                    </span>
                  </div>
                )}

                {formError && (
                  <div className="mb-3" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem',
                    color: '#c8785a',
                    background: 'rgba(200, 80, 60, 0.08)',
                    border: '1px solid rgba(200, 80, 60, 0.15)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  }}>
                    {formError}
                  </div>
                )}

                {/* Test Connection button */}
                <Button
                  variant="outline-secondary"
                  className="w-100 mb-2"
                  onClick={() => handleTestConnection('form', formUrl)}
                  disabled={testingId === 'form' || !formUrl.trim()}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    letterSpacing: '0.05em',
                    borderColor: 'rgba(196, 164, 52, 0.2)',
                    color: 'rgba(232, 223, 196, 0.6)',
                    borderRadius: '0.625rem',
                    minHeight: 40,
                  }}
                >
                  {testingId === 'form' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" style={{ width: '0.75rem', height: '0.75rem' }} />
                      {t('serverConfig.testing', 'Testing...')}
                    </>
                  ) : (
                    t('serverConfig.testConnection', 'Test Connection')
                  )}
                </Button>

                {/* Save + Cancel */}
                <div className="d-flex gap-2 mt-3">
                  <Button
                    variant="link"
                    onClick={closeForm}
                    style={{
                      flex: 1,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.75rem',
                      color: 'rgba(232, 223, 196, 0.4)',
                      textDecoration: 'none',
                      minHeight: 44,
                    }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    className="login-btn"
                    onClick={handleSave}
                    disabled={saving || !formUrl.trim() || !formName.trim()}
                    style={{
                      flex: 2,
                      fontSize: '0.8rem',
                      letterSpacing: '0.06em',
                      minHeight: 44,
                    }}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" style={{ width: '0.75rem', height: '0.75rem' }} />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      editing
                        ? t('serverConfig.saveChanges', 'Save Changes')
                        : t('serverConfig.addServer', 'Add Server')
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* ─── Server List ─── */
              <div>
                {servers.length === 0 ? (
                  <div className="text-center py-4" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.8rem',
                    color: 'rgba(232, 223, 196, 0.35)',
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>
                      {'\u{1F310}'}
                    </div>
                    {t('serverConfig.noServers', 'No servers configured')}
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.6 }}>
                      {t('serverConfig.addFirst', 'Add a server to get started')}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '0.75rem' }}>
                    {servers.map((server) => (
                      <div
                        key={server.id}
                        style={cardStyle(server.isActive)}
                        onClick={() => !server.isActive && handleSelectAndGo(server)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && !server.isActive && handleSelectAndGo(server)}
                      >
                        <div className="d-flex align-items-start justify-content-between">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span style={{
                                fontFamily: "'Bricolage Grotesque', sans-serif",
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: '#e8dfc4',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {server.name}
                              </span>
                              {server.isActive && (
                                <span style={badgeStyle}>
                                  {t('serverConfig.active', 'Active')}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: '0.65rem',
                              color: 'rgba(232, 223, 196, 0.35)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {server.url}
                            </div>

                            {/* Connection status for this server */}
                            {testResults[server.id] && (
                              <div className="d-flex align-items-center gap-1 mt-1" style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.65rem',
                              }}>
                                <span style={statusDot(testResults[server.id])} />
                                <span style={{ color: testResults[server.id].ok ? '#34C759' : '#FF3B30' }}>
                                  {testResults[server.id].ok
                                    ? t('serverConfig.connected', 'Connected') + (testResults[server.id].version ? ` v${testResults[server.id].version}` : '')
                                    : t('serverConfig.unreachable', 'Server unreachable')
                                  }
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Test */}
                            <button
                              style={iconBtnStyle}
                              onClick={() => handleTestConnection(server.id, server.url)}
                              disabled={testingId === server.id}
                              title={t('serverConfig.testConnection', 'Test Connection')}
                            >
                              {testingId === server.id ? (
                                <span className="spinner-border spinner-border-sm" style={{ width: '0.7rem', height: '0.7rem', borderWidth: '1.5px' }} />
                              ) : (
                                '\u{1F4E1}'
                              )}
                            </button>
                            {/* Edit */}
                            <button
                              style={iconBtnStyle}
                              onClick={() => openEditForm(server)}
                              title={t('common.edit', 'Edit')}
                            >
                              {'\u270F\uFE0F'}
                            </button>
                            {/* Delete */}
                            <button
                              style={{ ...iconBtnStyle, color: confirmDelete === server.id ? '#FF3B30' : iconBtnStyle.color }}
                              onClick={() => {
                                if (confirmDelete === server.id) {
                                  handleDelete(server.id);
                                } else {
                                  setConfirmDelete(server.id);
                                  setTimeout(() => setConfirmDelete((c) => c === server.id ? null : c), 3000);
                                }
                              }}
                              title={confirmDelete === server.id
                                ? t('serverConfig.confirmDelete', 'Tap again to delete')
                                : t('common.delete', 'Delete')
                              }
                            >
                              {confirmDelete === server.id ? '\u{274C}' : '\u{1F5D1}\uFE0F'}
                            </button>
                          </div>
                        </div>

                        {/* Delete confirmation hint */}
                        {confirmDelete === server.id && (
                          <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.6rem',
                            color: '#FF3B30',
                            marginTop: '0.35rem',
                            opacity: 0.8,
                          }}>
                            {t('serverConfig.confirmDelete', 'Tap again to delete')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Server button */}
                <Button
                  className="login-btn w-100"
                  onClick={openAddForm}
                  style={{
                    fontSize: '0.8rem',
                    letterSpacing: '0.06em',
                    minHeight: 46,
                    marginBottom: '0.5rem',
                  }}
                >
                  + {t('serverConfig.addServer', 'Add Server')}
                </Button>

                {/* Quick-add default */}
                {servers.length === 0 && (
                  <Button
                    variant="link"
                    className="w-100"
                    onClick={async () => {
                      await addServer('Production', getDefaultUrl());
                      await loadServers();
                    }}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.7rem',
                      color: 'rgba(196, 164, 52, 0.5)',
                      textDecoration: 'none',
                    }}
                  >
                    {t('serverConfig.addDefault', 'Add default production server')}
                  </Button>
                )}
              </div>
            )}

            {/* Back to login */}
            <div className="text-center mt-3" style={{ paddingBottom: '0.5rem' }}>
              <Button
                variant="link"
                onClick={() => navigate('/login')}
                style={{
                  color: 'rgba(196, 164, 52, 0.5)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}
              >
                {'\u2190'} {t('serverConfig.backToLogin', 'Back to login')}
              </Button>
            </div>
          </div>
        </div>

        {/* Active server info */}
        {!loading && isNative && activeServer && (
          <div className="text-center mt-2" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.2)',
          }}>
            {activeServer.name}: {activeServer.url}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerConfigScreen;
