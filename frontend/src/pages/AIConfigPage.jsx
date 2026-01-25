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
import {
  FaRobot,
  FaCheck,
  FaTimes,
  FaSave,
  FaPlay,
  FaInfoCircle,
  FaDollarSign
} from 'react-icons/fa';

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
    } catch (err) {
      console.error('Error fetching AI config:', err);
      setError(err.response?.data?.error || t('aiConfig.fetchError'));
    } finally {
      setLoading(false);
    }
  };

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

        <Row>
          {/* Provider Selection */}
          <Col lg={6} className="mb-4">
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
          <Col lg={6} className="mb-4">
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
                                <FaInfoCircle className="ms-2 text-muted" style={{ cursor: 'help' }} />
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
                <small className="text-muted">
                  {t('aiConfig.pricingNote')}
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Current Configuration */}
        {currentConfig && (
          <Row className="mt-4">
            <Col>
              <Card className="border-primary">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">{t('aiConfig.currentConfiguration')}</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <strong>{t('aiConfig.provider')}:</strong>
                      <p>{currentConfig.providerName}</p>
                    </Col>
                    <Col md={4}>
                      <strong>{t('aiConfig.model')}:</strong>
                      <p>{currentConfig.modelName}</p>
                    </Col>
                    <Col md={4}>
                      <strong>{t('aiConfig.status')}:</strong>
                      <p>
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
      </Container>
    </Layout>
  );
};

export default AIConfigPage;
