/**
 * AI Configuration Page
 * US-5.5.5: AI-Generated Follow-ups - Multi-Provider Support
 *
 * Admin page for configuring AI provider and model selection
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  Form,
  Table,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import aiConfigService from '../services/aiConfigService';
import aiPromptService from '../services/aiPromptService';
import AIPromptEditor from '../components/AIPromptEditor';
import ActionButton from '../components/ActionButton';
import {
  FaRobot,
  FaCheck,
  FaTimes,
  FaSave,
  FaPlay,
  FaInfoCircle,
  FaDollarSign,
  FaPlus,
  FaStar,
  FaFileAlt
} from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';

const AIConfigPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [providers, setProviders] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Prompts state
  const [prompts, setPrompts] = useState([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [showDeletePromptConfirm, setShowDeletePromptConfirm] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [providersRes, configRes] = await Promise.all([
        aiConfigService.getPricing(),
        aiConfigService.getCurrentConfig()
      ]);

      setProviders(providersRes.data || []);
      setCurrentConfig(configRes.data || null);

      // Set initial selection
      if (configRes.data) {
        setSelectedProvider(configRes.data.provider);
        setSelectedModel(configRes.data.model);
      }

      // Also fetch prompts
      fetchPrompts();
    } catch (err) {
      console.error('Error fetching AI config:', err);
      setError(err.response?.data?.error || t('aiConfig.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      setPromptsLoading(true);
      const response = await aiPromptService.getAll();
      setPrompts(response.data || []);
    } catch (err) {
      console.error('Error fetching prompts:', err);
    } finally {
      setPromptsLoading(false);
    }
  };

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt);
    setShowPromptEditor(true);
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setShowPromptEditor(true);
  };

  const handlePromptSaved = () => {
    fetchPrompts();
  };

  const handleDeletePrompt = (promptId) => {
    setPromptToDelete(promptId);
    setShowDeletePromptConfirm(true);
  };

  const confirmDeletePrompt = async () => {
    if (!promptToDelete) return;

    try {
      await aiPromptService.delete(promptToDelete);
      setSuccess(t('aiPrompt.deletedSuccess'));
      fetchPrompts();
    } catch (err) {
      console.error('Error deleting prompt:', err);
      setError(err.response?.data?.error || t('aiPrompt.deleteError'));
    } finally {
      setPromptToDelete(null);
    }
  };

  const handleDuplicatePrompt = async (promptId) => {
    try {
      await aiPromptService.duplicate(promptId);
      setSuccess(t('aiPrompt.duplicatedSuccess'));
      fetchPrompts();
    } catch (err) {
      console.error('Error duplicating prompt:', err);
      setError(err.response?.data?.error || t('aiPrompt.duplicateError'));
    }
  };

  const handleSetDefault = async (promptId) => {
    try {
      await aiPromptService.setAsDefault(promptId);
      setSuccess(t('aiPrompt.setDefaultSuccess'));
      fetchPrompts();
    } catch (err) {
      console.error('Error setting default:', err);
      setError(err.response?.data?.error || t('aiPrompt.setDefaultError'));
    }
  };

  // Group prompts by usage
  const promptsByUsage = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.usage]) {
      acc[prompt.usage] = [];
    }
    acc[prompt.usage].push(prompt);
    return acc;
  }, {});

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);

    // Select recommended model for the provider
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      const recommended = provider.models.find(m => m.recommended);
      setSelectedModel(recommended?.id || provider.models[0]?.id || '');
    }
  };

  const handleSave = async () => {
    if (!selectedProvider || !selectedModel) {
      setError(t('aiConfig.selectRequired'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await aiConfigService.saveConfig(selectedProvider, selectedModel);
      await fetchData();

      setSuccess(t('aiConfig.savedSuccess'));
    } catch (err) {
      console.error('Error saving config:', err);
      setError(err.response?.data?.error || t('aiConfig.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedProvider || !selectedModel) {
      setError(t('aiConfig.selectRequired'));
      return;
    }

    const provider = providers.find(p => p.id === selectedProvider);
    if (!provider?.configured) {
      setError(t('aiConfig.providerNotConfigured', { provider: provider?.name }));
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const result = await aiConfigService.testConnection(selectedProvider, selectedModel);
      setSuccess(t('aiConfig.testSuccess'));
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(err.response?.data?.error || t('aiConfig.testError'));
    } finally {
      setTesting(false);
    }
  };

  const getSelectedProvider = () => {
    return providers.find(p => p.id === selectedProvider);
  };

  const formatPrice = (inputPrice, outputPrice) => {
    if (inputPrice === 0 && outputPrice === 0) {
      return <Badge bg="success">{t('aiConfig.free')}</Badge>;
    }
    return `$${inputPrice} / $${outputPrice}`;
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">{t('common.loading')}</p>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="mt-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h2>
              <FaRobot className="me-2" />
              {t('aiConfig.title')}
            </h2>
            <p className="text-muted">{t('aiConfig.subtitle')}</p>
          </Col>
        </Row>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Current Configuration - Moved to top */}
        {currentConfig && (
          <Row className="mb-4">
            <Col>
              <Card className="border-primary">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">{t('aiConfig.currentConfiguration')}</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <strong>{t('aiConfig.provider')}:</strong>
                      <p className="mb-0">{currentConfig.providerName}</p>
                    </Col>
                    <Col md={4}>
                      <strong>{t('aiConfig.model')}:</strong>
                      <p className="mb-0">{currentConfig.modelName}</p>
                    </Col>
                    <Col md={4}>
                      <strong>{t('aiConfig.status')}:</strong>
                      <p className="mb-0">
                        {currentConfig.isConfigured ? (
                          <Badge bg="success">
                            <FaCheck className="me-1" />
                            {t('aiConfig.ready')}
                          </Badge>
                        ) : (
                          <Badge bg="warning">
                            {t('aiConfig.notReady')}
                          </Badge>
                        )}
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* AI Prompts Section */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaFileAlt className="me-2" />
                  {t('aiPrompt.title')}
                </h5>
                <Button variant="primary" size="sm" onClick={handleNewPrompt}>
                  <FaPlus className="me-1" />
                  <span className="d-none d-sm-inline">{t('aiPrompt.create')}</span>
                </Button>
              </Card.Header>
              <Card.Body>
                {promptsLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : prompts.length === 0 ? (
                  <Alert variant="info">
                    {t('aiPrompt.noPrompts')}
                  </Alert>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="d-none d-md-block">
                      <Table striped bordered hover responsive>
                        <thead className="table-dark">
                          <tr>
                            <th>{t('aiPrompt.usage')}</th>
                            <th>{t('aiPrompt.name')}</th>
                            <th>{t('aiPrompt.language')}</th>
                            <th>{t('aiPrompt.version')}</th>
                            <th>{t('aiPrompt.status')}</th>
                            <th style={{ width: '150px' }}>{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prompts.map(prompt => (
                            <tr key={prompt.id}>
                              <td>
                                <Badge bg="info">
                                  {t(`aiPrompt.usage${prompt.usage.charAt(0).toUpperCase() + prompt.usage.slice(1)}`)}
                                </Badge>
                              </td>
                              <td>
                                {prompt.name}
                                {prompt.is_default && (
                                  <Badge bg="warning" className="ms-2">
                                    <FaStar className="me-1" />
                                    {t('aiPrompt.default')}
                                  </Badge>
                                )}
                              </td>
                              <td>
                                {prompt.language_code === 'fr' && '🇫🇷'}
                                {prompt.language_code === 'en' && '🇬🇧'}
                                {prompt.language_code === 'es' && '🇪🇸'}
                                {prompt.language_code === 'nl' && '🇳🇱'}
                                {prompt.language_code === 'de' && '🇩🇪'}
                                {' '}{prompt.language_code.toUpperCase()}
                              </td>
                              <td>v{prompt.version}</td>
                              <td>
                                {prompt.is_active ? (
                                  <Badge bg="success">{t('aiPrompt.active')}</Badge>
                                ) : (
                                  <Badge bg="secondary">{t('aiPrompt.inactive')}</Badge>
                                )}
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <ActionButton
                                    action="edit"
                                    onClick={() => handleEditPrompt(prompt)}
                                    title={t('common.edit')}
                                  />
                                  <ActionButton
                                    action="duplicate"
                                    onClick={() => handleDuplicatePrompt(prompt.id)}
                                    title={t('aiPrompt.duplicate')}
                                  />
                                  {!prompt.is_default && (
                                    <ActionButton
                                      action="setDefault"
                                      onClick={() => handleSetDefault(prompt.id)}
                                      title={t('aiPrompt.setDefault')}
                                    />
                                  )}
                                  <ActionButton
                                    action="delete"
                                    onClick={() => handleDeletePrompt(prompt.id)}
                                    title={t('common.delete')}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="d-md-none">
                      {prompts.map(prompt => (
                        <Card key={prompt.id} className="mb-3">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">
                                  {prompt.name}
                                  {prompt.is_default && (
                                    <Badge bg="warning" className="ms-2">
                                      <FaStar className="me-1" />
                                      {t('aiPrompt.default')}
                                    </Badge>
                                  )}
                                </h6>
                                <Badge bg="info" className="me-1">
                                  {t(`aiPrompt.usage${prompt.usage.charAt(0).toUpperCase() + prompt.usage.slice(1)}`)}
                                </Badge>
                                {prompt.is_active ? (
                                  <Badge bg="success">{t('aiPrompt.active')}</Badge>
                                ) : (
                                  <Badge bg="secondary">{t('aiPrompt.inactive')}</Badge>
                                )}
                              </div>
                              <div className="action-buttons">
                                <ActionButton
                                  action="edit"
                                  onClick={() => handleEditPrompt(prompt)}
                                  title={t('common.edit')}
                                />
                                <ActionButton
                                  action="delete"
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  title={t('common.delete')}
                                />
                              </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="text-muted">
                                {prompt.language_code === 'fr' && '🇫🇷'}
                                {prompt.language_code === 'en' && '🇬🇧'}
                                {prompt.language_code === 'es' && '🇪🇸'}
                                {prompt.language_code === 'nl' && '🇳🇱'}
                                {prompt.language_code === 'de' && '🇩🇪'}
                                {' '}{prompt.language_code.toUpperCase()} • v{prompt.version}
                              </small>
                              <div className="action-buttons">
                                <ActionButton
                                  action="duplicate"
                                  onClick={() => handleDuplicatePrompt(prompt.id)}
                                  title={t('aiPrompt.duplicate')}
                                />
                                {!prompt.is_default && (
                                  <ActionButton
                                    action="setDefault"
                                    onClick={() => handleSetDefault(prompt.id)}
                                    title={t('aiPrompt.setDefault')}
                                  />
                                )}
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
                <small className="text-muted">
                  {t('aiPrompt.helpText')}
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Provider Selection */}
          <Col xs={12} lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('aiConfig.selectProvider')}</h5>
              </Card.Header>
              <Card.Body>
                {providers.map(provider => (
                  <Card
                    key={provider.id}
                    className={`mb-3 cursor-pointer ${selectedProvider === provider.id ? 'border-primary border-2' : ''}`}
                    onClick={() => provider.configured && handleProviderChange(provider.id)}
                    style={{ cursor: provider.configured ? 'pointer' : 'not-allowed', opacity: provider.configured ? 1 : 0.6 }}
                  >
                    <Card.Body className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">
                          {provider.name}
                          {selectedProvider === provider.id && (
                            <FaCheck className="ms-2 text-primary" />
                          )}
                        </h6>
                        <small className="text-muted">
                          {provider.models.length} {t('aiConfig.modelsAvailable')}
                        </small>
                      </div>
                      <div className="text-end">
                        {provider.configured ? (
                          <Badge bg="success">
                            <FaCheck className="me-1" />
                            {t('aiConfig.configured')}
                          </Badge>
                        ) : (
                          <OverlayTrigger
                            placement="left"
                            overlay={
                              <Tooltip>
                                {t('aiConfig.setEnvVar', { key: provider.id.toUpperCase() + '_API_KEY' })}
                              </Tooltip>
                            }
                          >
                            <Badge bg="secondary">
                              <FaTimes className="me-1" />
                              {t('aiConfig.notConfigured')}
                            </Badge>
                          </OverlayTrigger>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </Card.Body>
            </Card>
          </Col>

          {/* Model Selection */}
          <Col xs={12} lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('aiConfig.selectModel')}</h5>
              </Card.Header>
              <Card.Body>
                {getSelectedProvider() ? (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('aiConfig.model')}</Form.Label>
                      <Form.Select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={!getSelectedProvider()?.configured}
                      >
                        {getSelectedProvider().models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} {model.recommended && `(${t('aiConfig.recommended')})`}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Selected Model Details */}
                    {selectedModel && (() => {
                      const model = getSelectedProvider().models.find(m => m.id === selectedModel);
                      return model ? (
                        <Card className="bg-light">
                          <Card.Body>
                            <h6>{model.name}</h6>
                            <p className="text-muted mb-2">{model.description}</p>
                            <div className="d-flex align-items-center">
                              <FaDollarSign className="me-2 text-success" />
                              <span>
                                {model.priceDisplay || formatPrice(model.inputPrice, model.outputPrice)}
                              </span>
                              <OverlayTrigger
                                placement="right"
                                overlay={
                                  <Tooltip>
                                    {t('aiConfig.pricingExplanation')}
                                  </Tooltip>
                                }
                              >
                                <span className="ms-2 text-muted" style={{ cursor: 'help' }}>
                                  <FaInfoCircle />
                                </span>
                              </OverlayTrigger>
                            </div>
                          </Card.Body>
                        </Card>
                      ) : null;
                    })()}

                    {/* Actions */}
                    <div className="mt-4 d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        onClick={handleTest}
                        disabled={testing || !getSelectedProvider()?.configured}
                      >
                        {testing ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            {t('aiConfig.testing')}
                          </>
                        ) : (
                          <>
                            <FaPlay className="me-2" />
                            {t('aiConfig.testConnection')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving || !getSelectedProvider()?.configured}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            {t('common.saving')}
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" />
                            {t('common.save')}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert variant="info">
                    {t('aiConfig.selectProviderFirst')}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pricing Comparison Table */}
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FaDollarSign className="me-2" />
                  {t('aiConfig.pricingComparison')}
                </h5>
              </Card.Header>
              <Card.Body>
                {/* Desktop Table */}
                <div className="d-none d-lg-block">
                  <Table striped bordered hover responsive>
                    <thead className="table-dark">
                      <tr>
                        <th>{t('aiConfig.provider')}</th>
                        <th>{t('aiConfig.model')}</th>
                        <th>{t('aiConfig.description')}</th>
                        <th>{t('aiConfig.inputPrice')}</th>
                        <th>{t('aiConfig.outputPrice')}</th>
                        <th>{t('aiConfig.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.flatMap(provider =>
                        provider.models.map(model => (
                          <tr
                            key={`${provider.id}-${model.id}`}
                            className={currentConfig?.provider === provider.id && currentConfig?.model === model.id ? 'table-primary' : ''}
                          >
                            <td>
                              <strong>{provider.name}</strong>
                              {!provider.configured && (
                                <Badge bg="secondary" className="ms-2">{t('aiConfig.notConfigured')}</Badge>
                              )}
                            </td>
                            <td>
                              {model.name}
                              {model.recommended && (
                                <Badge bg="success" className="ms-2">{t('aiConfig.recommended')}</Badge>
                              )}
                            </td>
                            <td><small>{model.description}</small></td>
                            <td>
                              {model.inputPrice === 0 ? (
                                <Badge bg="success">{t('aiConfig.free')}</Badge>
                              ) : (
                                `$${model.inputPrice}`
                              )}
                            </td>
                            <td>
                              {model.outputPrice === 0 ? (
                                <Badge bg="success">{t('aiConfig.free')}</Badge>
                              ) : (
                                `$${model.outputPrice}`
                              )}
                            </td>
                            <td>
                              {currentConfig?.provider === provider.id && currentConfig?.model === model.id ? (
                                <Badge bg="primary">
                                  <FaCheck className="me-1" />
                                  {t('aiConfig.active')}
                                </Badge>
                              ) : provider.configured ? (
                                <Badge bg="light" text="dark">{t('aiConfig.available')}</Badge>
                              ) : (
                                <Badge bg="secondary">{t('aiConfig.unavailable')}</Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="d-lg-none">
                  {providers.flatMap(provider =>
                    provider.models.map(model => {
                      const isActive = currentConfig?.provider === provider.id && currentConfig?.model === model.id;
                      return (
                        <Card
                          key={`mobile-${provider.id}-${model.id}`}
                          className={`mb-3 ${isActive ? 'border-primary border-2' : ''}`}
                        >
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">
                                  {model.name}
                                  {model.recommended && (
                                    <Badge bg="success" className="ms-2">{t('aiConfig.recommended')}</Badge>
                                  )}
                                </h6>
                                <small className="text-muted">{provider.name}</small>
                                {!provider.configured && (
                                  <Badge bg="secondary" className="ms-1">{t('aiConfig.notConfigured')}</Badge>
                                )}
                              </div>
                              <div>
                                {isActive ? (
                                  <Badge bg="primary">
                                    <FaCheck className="me-1" />
                                    {t('aiConfig.active')}
                                  </Badge>
                                ) : provider.configured ? (
                                  <Badge bg="light" text="dark">{t('aiConfig.available')}</Badge>
                                ) : (
                                  <Badge bg="secondary">{t('aiConfig.unavailable')}</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-muted small mb-2">{model.description}</p>
                            <div className="d-flex gap-3">
                              <div>
                                <small className="text-muted">{t('aiConfig.inputPrice')}:</small>{' '}
                                {model.inputPrice === 0 ? (
                                  <Badge bg="success">{t('aiConfig.free')}</Badge>
                                ) : (
                                  <strong>${model.inputPrice}</strong>
                                )}
                              </div>
                              <div>
                                <small className="text-muted">{t('aiConfig.outputPrice')}:</small>{' '}
                                {model.outputPrice === 0 ? (
                                  <Badge bg="success">{t('aiConfig.free')}</Badge>
                                ) : (
                                  <strong>${model.outputPrice}</strong>
                                )}
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })
                  )}
                </div>
                <small className="text-muted">
                  {t('aiConfig.pricingNote')}
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Prompt Editor Modal */}
        <AIPromptEditor
          show={showPromptEditor}
          onHide={() => setShowPromptEditor(false)}
          prompt={editingPrompt}
          onSaved={handlePromptSaved}
        />

        {/* Delete Prompt Confirm Modal */}
        <ConfirmModal
          show={showDeletePromptConfirm}
          onHide={() => {
            setShowDeletePromptConfirm(false);
            setPromptToDelete(null);
          }}
          onConfirm={confirmDeletePrompt}
          title={t('common.confirmation', 'Confirmation')}
          message={t('aiPrompt.confirmDelete')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />
      </Container>
    </Layout>
  );
};

export default AIConfigPage;
