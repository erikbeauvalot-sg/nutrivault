/**
 * Discord Webhook Settings Page
 * Admin page for configuring Discord webhook notifications
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
  InputGroup
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { toast } from 'react-toastify';
import {
  getDiscordSettings,
  updateDiscordSettings,
  testDiscordWebhook
} from '../services/discordService';
import { FaSave, FaBell, FaCheckCircle } from 'react-icons/fa';

const DiscordWebhookPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabledEvents, setEnabledEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [error, setError] = useState(null);

  // Admin gate
  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDiscordSettings();
      setWebhookUrl(result.data.webhookUrl || '');
      setEnabledEvents(result.data.enabledEvents || []);
      setAvailableEvents(result.data.availableEvents || []);
    } catch (err) {
      setError(t('discord.fetchError', 'Failed to load Discord settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDiscordSettings({ webhookUrl, enabledEvents });
      toast.success(t('discord.saveSuccess', 'Discord settings saved'));
    } catch (err) {
      toast.error(t('discord.saveError', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.warning(t('discord.urlRequired', 'Please enter a webhook URL'));
      return;
    }
    try {
      setTesting(true);
      await testDiscordWebhook(webhookUrl);
      toast.success(t('discord.testSuccess', 'Test message sent! Check your Discord channel.'));
    } catch (err) {
      toast.error(t('discord.testError', 'Failed to send test message. Check the URL.'));
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (code) => {
    setEnabledEvents((prev) =>
      prev.includes(code) ? prev.filter((e) => e !== code) : [...prev, code]
    );
  };

  const toggleCategory = (category, codes) => {
    const allEnabled = codes.every((c) => enabledEvents.includes(c));
    if (allEnabled) {
      setEnabledEvents((prev) => prev.filter((e) => !codes.includes(e)));
    } else {
      setEnabledEvents((prev) => [...new Set([...prev, ...codes])]);
    }
  };

  // Group events by category
  const groupedEvents = useMemo(() => {
    const groups = {};
    availableEvents.forEach((evt) => {
      if (!groups[evt.category]) groups[evt.category] = [];
      groups[evt.category].push(evt);
    });
    return groups;
  }, [availableEvents]);

  const categoryLabels = {
    users: t('discord.categoryUsers', 'Utilisateurs'),
    patients: t('discord.categoryPatients', 'Patients'),
    visits: t('discord.categoryVisits', 'Consultations'),
    recipes: t('discord.categoryRecipes', 'Recettes'),
    documents: t('discord.categoryDocuments', 'Documents'),
    billing: t('discord.categoryBilling', 'Facturation'),
    campaigns: t('discord.categoryCampaigns', 'Campagnes')
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-4 text-center">
          <Spinner animation="border" />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <h2 className="d-flex align-items-center gap-2">
              <FaBell />
              {t('discord.title', 'Notifications Discord')}
            </h2>
            <p className="text-muted">
              {t('discord.subtitle', 'Configure webhook notifications to receive real-time alerts in your Discord channel.')}
            </p>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Webhook URL */}
        <Card className="mb-4 shadow-sm">
          <Card.Header>
            <h5 className="mb-0">{t('discord.webhookUrl', 'Webhook URL')}</h5>
          </Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Label>{t('discord.webhookUrlLabel', 'Discord Webhook URL')}</Form.Label>
              <InputGroup>
                <Form.Control
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <Button
                  variant="outline-secondary"
                  onClick={handleTest}
                  disabled={testing || !webhookUrl}
                >
                  {testing ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    t('discord.test', 'Tester')
                  )}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                {t('discord.webhookHelp', 'Create a webhook in your Discord server settings > Integrations > Webhooks')}
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Event Toggles */}
        <Card className="mb-4 shadow-sm">
          <Card.Header>
            <h5 className="mb-0">{t('discord.events', 'Events')}</h5>
          </Card.Header>
          <Card.Body>
            <p className="text-muted mb-3">
              {t('discord.eventsHelp', 'Select which events should trigger a Discord notification.')}
            </p>

            {Object.entries(groupedEvents).map(([category, events]) => {
              const codes = events.map((e) => e.code);
              const allEnabled = codes.every((c) => enabledEvents.includes(c));
              const someEnabled = codes.some((c) => enabledEvents.includes(c));

              return (
                <div key={category} className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <Form.Check
                      type="switch"
                      id={`cat-${category}`}
                      label={
                        <strong>{categoryLabels[category] || category}</strong>
                      }
                      checked={allEnabled}
                      ref={(el) => {
                        if (el) el.indeterminate = someEnabled && !allEnabled;
                      }}
                      onChange={() => toggleCategory(category, codes)}
                    />
                  </div>
                  <Row className="ms-4">
                    {events.map((evt) => (
                      <Col xs={12} md={6} lg={4} key={evt.code} className="mb-2">
                        <Form.Check
                          type="switch"
                          id={`evt-${evt.code}`}
                          label={evt.label}
                          checked={enabledEvents.includes(evt.code)}
                          onChange={() => toggleEvent(evt.code)}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>
              );
            })}
          </Card.Body>
        </Card>

        {/* Save Button */}
        <div className="d-flex justify-content-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="d-flex align-items-center gap-2"
          >
            {saving ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <FaSave />
            )}
            {t('common.save', 'Save')}
          </Button>
        </div>

        {/* Status indicator */}
        {webhookUrl && (
          <div className="mt-3 text-end text-muted">
            <FaCheckCircle className="text-success me-1" />
            {t('discord.activeEvents', '{{count}} active notification(s)', {
              count: enabledEvents.length
            })}
          </div>
        )}
      </Container>
    </Layout>
  );
};

export default DiscordWebhookPage;
