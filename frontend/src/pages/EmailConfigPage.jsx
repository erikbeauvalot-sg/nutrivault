/**
 * EmailConfigPage
 * Per-user SMTP configuration page
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  InputGroup,
  Modal
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import emailConfigService from '../services/emailConfigService';
import {
  FaServer,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPaperPlane,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSave
} from 'react-icons/fa';
import { formatDate } from '../utils/dateUtils';

const EmailConfigPage = () => {
  const { t, i18n } = useTranslation();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    from_name: '',
    from_email: '',
    reply_to: '',
    is_active: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await emailConfigService.getMyConfig();
      const data = response.data?.data || response.data;
      if (data) {
        setConfig(data);
        setForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_secure: data.smtp_secure || false,
          smtp_user: data.smtp_user || '',
          smtp_password: '',
          from_name: data.from_name || '',
          from_email: data.from_email || '',
          reply_to: data.reply_to || '',
          is_active: data.is_active !== false
        });
      }
    } catch (err) {
      console.error('Error fetching email config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const dataToSend = { ...form };
      // Don't send empty password (keeps existing)
      if (!dataToSend.smtp_password) {
        delete dataToSend.smtp_password;
      }

      const response = await emailConfigService.updateMyConfig(dataToSend);
      const data = response.data?.data || response.data;
      setConfig(data);
      setForm(prev => ({ ...prev, smtp_password: '' }));
      setSuccess(t('emailConfig.saveSuccess', 'SMTP configuration saved'));
    } catch (err) {
      setError(err.response?.data?.error || t('emailConfig.saveError', 'Failed to save configuration'));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);
      await emailConfigService.verifyMyConfig();
      setSuccess(t('emailConfig.verifySuccess', 'SMTP connection verified successfully'));
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.error || t('emailConfig.verifyError', 'SMTP verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTest = async () => {
    if (!testRecipient) return;
    try {
      setSendingTest(true);
      setError(null);
      await emailConfigService.sendTestEmail(testRecipient);
      setSuccess(t('emailConfig.testSuccess', 'Test email sent successfully'));
      setShowTestModal(false);
      setTestRecipient('');
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.error || t('emailConfig.testError', 'Failed to send test email'));
    } finally {
      setSendingTest(false);
    }
  };

  const handleDelete = async () => {
    try {
      setError(null);
      await emailConfigService.deleteMyConfig();
      setConfig(null);
      setForm({
        smtp_host: '',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: '',
        smtp_password: '',
        from_name: '',
        from_email: '',
        reply_to: '',
        is_active: true
      });
      setSuccess(t('emailConfig.deleteSuccess', 'Configuration deleted. Emails will use global settings.'));
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err.response?.data?.error || t('emailConfig.deleteError', 'Failed to delete configuration'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-4">
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="mt-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h2>
                  <FaServer className="me-2" />
                  {t('emailConfig.title', 'Email Configuration')}
                </h2>
                <p className="text-muted mb-0">
                  {t('emailConfig.subtitle', 'Configure your personal SMTP server for sending emails')}
                </p>
              </div>
              <div className="d-flex gap-2">
                {config && (
                  <>
                    {config.is_verified ? (
                      <Badge bg="success" className="d-flex align-items-center gap-1 px-3 py-2 fs-6">
                        <FaCheckCircle />
                        {t('emailConfig.verified', 'Verified')}
                        {config.verified_at && (
                          <small className="ms-1 opacity-75">
                            ({formatDate(config.verified_at, i18n.language)})
                          </small>
                        )}
                      </Badge>
                    ) : (
                      <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1 px-3 py-2 fs-6">
                        <FaTimesCircle />
                        {t('emailConfig.notVerified', 'Not Verified')}
                      </Badge>
                    )}
                  </>
                )}
                {!config && (
                  <Badge bg="secondary" className="d-flex align-items-center gap-1 px-3 py-2 fs-6">
                    {t('emailConfig.notConfigured', 'Not Configured')}
                  </Badge>
                )}
              </div>
            </div>
          </Col>
        </Row>

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

        <Form onSubmit={handleSave}>
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Header>
                  <strong>{t('emailConfig.smtpSettings', 'SMTP Server Settings')}</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('emailConfig.smtpHost', 'SMTP Host')}</Form.Label>
                        <Form.Control
                          type="text"
                          name="smtp_host"
                          value={form.smtp_host}
                          onChange={handleChange}
                          placeholder="smtp.gmail.com"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('emailConfig.smtpPort', 'Port')}</Form.Label>
                        <Form.Control
                          type="number"
                          name="smtp_port"
                          value={form.smtp_port}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      name="smtp_secure"
                      label={t('emailConfig.smtpSecure', 'Use SSL/TLS (port 465)')}
                      checked={form.smtp_secure}
                      onChange={handleChange}
                    />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('emailConfig.smtpUser', 'Username / Email')}</Form.Label>
                        <Form.Control
                          type="text"
                          name="smtp_user"
                          value={form.smtp_user}
                          onChange={handleChange}
                          placeholder="your.email@gmail.com"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          {t('emailConfig.smtpPassword', 'Password')}
                          {config?.has_password && !form.smtp_password && (
                            <small className="text-muted ms-2">
                              ({t('emailConfig.passwordSet', 'already set')})
                            </small>
                          )}
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            name="smtp_password"
                            value={form.smtp_password}
                            onChange={handleChange}
                            placeholder={config?.has_password ? '••••••••' : ''}
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-4">
                <Card.Header>
                  <strong>{t('emailConfig.senderSettings', 'Sender Settings')}</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('emailConfig.fromName', 'Sender Name')}</Form.Label>
                        <Form.Control
                          type="text"
                          name="from_name"
                          value={form.from_name}
                          onChange={handleChange}
                          placeholder="Dr. Dupont"
                        />
                        <Form.Text className="text-muted">
                          {t('emailConfig.fromNameHelp', 'Name displayed as the sender')}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t('emailConfig.fromEmail', 'Sender Email')}</Form.Label>
                        <Form.Control
                          type="email"
                          name="from_email"
                          value={form.from_email}
                          onChange={handleChange}
                          placeholder="contact@cabinet-dupont.fr"
                        />
                        <Form.Text className="text-muted">
                          {t('emailConfig.fromEmailHelp', 'Defaults to SMTP username if empty')}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('emailConfig.replyTo', 'Reply-To Address')}</Form.Label>
                    <Form.Control
                      type="email"
                      name="reply_to"
                      value={form.reply_to}
                      onChange={handleChange}
                      placeholder={t('emailConfig.replyToPlaceholder', 'Optional reply address')}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Check
                      type="switch"
                      name="is_active"
                      label={t('emailConfig.isActive', 'Use this configuration for sending emails')}
                      checked={form.is_active}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="mb-4">
                <Card.Header>
                  <strong>{t('emailConfig.actions', 'Actions')}</strong>
                </Card.Header>
                <Card.Body className="d-grid gap-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? (
                      <><Spinner size="sm" className="me-2" />{t('common.saving', 'Saving...')}</>
                    ) : (
                      <><FaSave className="me-2" />{t('emailConfig.save', 'Save Configuration')}</>
                    )}
                  </Button>

                  <Button
                    variant="outline-primary"
                    onClick={handleVerify}
                    disabled={verifying || !config}
                  >
                    {verifying ? (
                      <><Spinner size="sm" className="me-2" />{t('emailConfig.verifyingConnection', 'Verifying...')}</>
                    ) : (
                      <><FaCheckCircle className="me-2" />{t('emailConfig.verifyConnection', 'Verify Connection')}</>
                    )}
                  </Button>

                  <Button
                    variant="outline-success"
                    onClick={() => setShowTestModal(true)}
                    disabled={!config?.is_verified}
                  >
                    <FaPaperPlane className="me-2" />
                    {t('emailConfig.sendTest', 'Send Test Email')}
                  </Button>

                  <hr />

                  <Button
                    variant="outline-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!config}
                  >
                    <FaTrash className="me-2" />
                    {t('emailConfig.reset', 'Delete Configuration')}
                  </Button>
                  <small className="text-muted text-center">
                    {t('emailConfig.resetHelp', 'Removes your SMTP config. Emails will use the global server.')}
                  </small>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <strong>{t('emailConfig.help', 'Help')}</strong>
                </Card.Header>
                <Card.Body>
                  <p className="small text-muted mb-2">
                    <strong>Gmail:</strong> smtp.gmail.com, port 587
                  </p>
                  <p className="small text-muted mb-2">
                    <strong>Outlook:</strong> smtp-mail.outlook.com, port 587
                  </p>
                  <p className="small text-muted mb-2">
                    <strong>OVH:</strong> ssl0.ovh.net, port 587
                  </p>
                  <p className="small text-muted mb-0">
                    {t('emailConfig.appPasswordNote', 'For Gmail, use an App Password (not your regular password).')}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>

        {/* Test Email Modal */}
        <Modal show={showTestModal} onHide={() => setShowTestModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaPaperPlane className="me-2" />
              {t('emailConfig.sendTestTitle', 'Send Test Email')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>{t('emailConfig.testRecipient', 'Recipient Email')}</Form.Label>
              <Form.Control
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="test@example.com"
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTestModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSendTest}
              disabled={!testRecipient || sendingTest}
            >
              {sendingTest ? (
                <><Spinner size="sm" className="me-2" />{t('common.sending', 'Sending...')}</>
              ) : (
                <><FaPaperPlane className="me-2" />{t('common.send', 'Send')}</>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('common.confirmation', 'Confirmation')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {t('emailConfig.deleteConfirm', 'Are you sure you want to delete your SMTP configuration? Emails will be sent using the global server.')}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <FaTrash className="me-2" />
              {t('common.delete', 'Delete')}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default EmailConfigPage;
