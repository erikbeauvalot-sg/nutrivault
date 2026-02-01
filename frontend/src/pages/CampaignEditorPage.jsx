/**
 * Campaign Editor Page
 * Multi-step form for creating and editing email campaigns
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Badge, Nav, Tab, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AudienceBuilder from '../components/campaigns/AudienceBuilder';
import AudiencePreview from '../components/campaigns/AudiencePreview';
import CampaignPreview from '../components/campaigns/CampaignPreview';
import { useAuth } from '../contexts/AuthContext';
import * as campaignService from '../services/campaignService';

const CampaignEditorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const isEditing = !!id;

  // Form state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState('basics');
  const [campaign, setCampaign] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    campaign_type: 'newsletter',
    target_audience: { conditions: [], logic: 'AND' },
    sender_id: ''
  });

  // Dietitians list for sender selection
  const [dietitians, setDietitians] = useState([]);

  // Audience preview state
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [sending, setSending] = useState(false);

  // Type options
  const typeOptions = [
    { value: 'newsletter', label: t('campaigns.type.newsletter', 'Newsletter') },
    { value: 'promotional', label: t('campaigns.type.promotional', 'Promotional') },
    { value: 'educational', label: t('campaigns.type.educational', 'Educational') },
    { value: 'reminder', label: t('campaigns.type.reminder', 'Reminder') }
  ];

  // Available variables for template
  const availableVariables = [
    { key: 'patient_first_name', label: t('campaigns.variables.firstName', 'Patient First Name') },
    { key: 'patient_last_name', label: t('campaigns.variables.lastName', 'Patient Last Name') },
    { key: 'patient_email', label: t('campaigns.variables.email', 'Patient Email') },
    { key: 'dietitian_name', label: t('campaigns.variables.dietitian', 'Dietitian Name') },
    { key: 'unsubscribe_link', label: t('campaigns.variables.unsubscribe', 'Unsubscribe Link') }
  ];

  // Permissions
  const canSend = hasPermission('campaigns.send');

  // Load dietitians for sender selection
  const loadDietitians = useCallback(async () => {
    try {
      const response = await fetch('/api/users?role=dietitian&is_active=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setDietitians(result.data || []);
      }
    } catch (error) {
      console.error('Error loading dietitians:', error);
    }
  }, []);

  // Load campaign if editing
  const loadCampaign = useCallback(async () => {
    if (!isEditing) return;

    try {
      setLoading(true);
      const data = await campaignService.getCampaignById(id);
      setCampaign({
        name: data.name || '',
        subject: data.subject || '',
        body_html: data.body_html || '',
        body_text: data.body_text || '',
        campaign_type: data.campaign_type || 'newsletter',
        target_audience: data.target_audience || { conditions: [], logic: 'AND' },
        sender_id: data.sender_id || ''
      });

      // Load audience preview
      if (data.target_audience && data.target_audience.conditions?.length > 0) {
        const preview = await campaignService.previewAudienceCriteria(data.target_audience);
        setAudiencePreview(preview);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error(t('campaigns.loadError', 'Failed to load campaign'));
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, navigate, t]);

  useEffect(() => {
    loadCampaign();
    loadDietitians();
  }, [loadCampaign, loadDietitians]);

  // Handle form field change
  const handleChange = (field) => (e) => {
    const value = e.target?.value ?? e;
    setCampaign(prev => ({ ...prev, [field]: value }));
  };

  // Handle audience change
  const handleAudienceChange = async (newAudience) => {
    setCampaign(prev => ({ ...prev, target_audience: newAudience }));

    // Preview audience
    if (newAudience.conditions?.length > 0) {
      try {
        setPreviewLoading(true);
        const preview = await campaignService.previewAudienceCriteria(newAudience);
        setAudiencePreview(preview);
      } catch (error) {
        console.error('Error previewing audience:', error);
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setAudiencePreview(null);
    }
  };

  // Insert variable into content
  const insertVariable = (variable) => {
    const textarea = document.getElementById('body_html');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = campaign.body_html;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variable}}}${after}`;
      setCampaign(prev => ({ ...prev, body_html: newText }));
    } else {
      setCampaign(prev => ({
        ...prev,
        body_html: prev.body_html + `{{${variable}}}`
      }));
    }
  };

  // Save campaign
  const saveCampaign = async (andContinue = false) => {
    try {
      setSaving(true);

      if (!campaign.name.trim()) {
        toast.error(t('campaigns.nameRequired', 'Campaign name is required'));
        setActiveStep('basics');
        return null;
      }

      if (!campaign.subject.trim()) {
        toast.error(t('campaigns.subjectRequired', 'Email subject is required'));
        setActiveStep('basics');
        return null;
      }

      let savedCampaign;
      if (isEditing) {
        savedCampaign = await campaignService.updateCampaign(id, campaign);
        toast.success(t('campaigns.updateSuccess', 'Campaign updated successfully'));
      } else {
        savedCampaign = await campaignService.createCampaign(campaign);
        toast.success(t('campaigns.createSuccess', 'Campaign created successfully'));
      }

      if (!andContinue) {
        navigate('/campaigns');
      }

      return savedCampaign;
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(t('campaigns.saveError', 'Failed to save campaign'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Send campaign now
  const handleSendNow = async () => {
    try {
      setSending(true);

      // Save first if needed
      let campaignId = id;
      if (!isEditing || campaign.name !== '') {
        const saved = await saveCampaign(true);
        if (!saved) return;
        campaignId = saved.id;
      }

      await campaignService.sendCampaign(campaignId);
      toast.success(t('campaigns.sendSuccess', 'Campaign is being sent'));
      setShowSendModal(false);
      navigate('/campaigns');
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error(error.response?.data?.error || t('campaigns.sendError', 'Failed to send campaign'));
    } finally {
      setSending(false);
    }
  };

  // Schedule campaign
  const handleSchedule = async () => {
    if (!scheduledDate) {
      toast.error(t('campaigns.scheduleDateRequired', 'Please select a date and time'));
      return;
    }

    try {
      setSending(true);

      // Save first if needed
      let campaignId = id;
      if (!isEditing) {
        const saved = await saveCampaign(true);
        if (!saved) return;
        campaignId = saved.id;
      }

      await campaignService.scheduleCampaign(campaignId, scheduledDate);
      toast.success(t('campaigns.scheduleSuccess', 'Campaign scheduled successfully'));
      setShowScheduleModal(false);
      navigate('/campaigns');
    } catch (error) {
      console.error('Error scheduling campaign:', error);
      toast.error(error.response?.data?.error || t('campaigns.scheduleError', 'Failed to schedule campaign'));
    } finally {
      setSending(false);
    }
  };

  // Validate step
  const isStepValid = (step) => {
    switch (step) {
      case 'basics':
        return campaign.name.trim() && campaign.subject.trim();
      case 'content':
        return campaign.body_html.trim();
      case 'audience':
        return campaign.target_audience.conditions?.length > 0;
      default:
        return true;
    }
  };

  // Check if campaign can be sent
  const canSendCampaign = () => {
    return isStepValid('basics') && isStepValid('content') && isStepValid('audience') && audiencePreview?.count > 0;
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">{t('common.loading', 'Loading...')}</p>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button
                  variant="link"
                  className="p-0 mb-2 text-decoration-none"
                  onClick={() => navigate('/campaigns')}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  {t('common.back', 'Back')}
                </Button>
                <h1 className="h3 mb-0">
                  {isEditing
                    ? t('campaigns.editCampaign', 'Edit Campaign')
                    : t('campaigns.newCampaign', 'New Campaign')}
                </h1>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate('/campaigns')}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => saveCampaign(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      {t('common.saveDraft', 'Save Draft')}
                    </>
                  )}
                </Button>
                {canSend && canSendCampaign() && (
                  <>
                    <Button
                      variant="outline-info"
                      onClick={() => setShowScheduleModal(true)}
                    >
                      <i className="bi bi-clock me-2"></i>
                      {t('campaigns.schedule', 'Schedule')}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setShowSendModal(true)}
                    >
                      <i className="bi bi-send me-2"></i>
                      {t('campaigns.sendNow', 'Send Now')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Step Navigation */}
        <Card className="mb-4">
          <Card.Body className="py-3">
            <Nav variant="pills" className="nav-justified">
              <Nav.Item>
                <Nav.Link
                  active={activeStep === 'basics'}
                  onClick={() => setActiveStep('basics')}
                  className="d-flex align-items-center justify-content-center"
                >
                  <span className="me-2">1.</span>
                  {t('campaigns.steps.basics', 'Basic Info')}
                  {isStepValid('basics') && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeStep === 'content'}
                  onClick={() => setActiveStep('content')}
                  className="d-flex align-items-center justify-content-center"
                >
                  <span className="me-2">2.</span>
                  {t('campaigns.steps.content', 'Content')}
                  {isStepValid('content') && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeStep === 'audience'}
                  onClick={() => setActiveStep('audience')}
                  className="d-flex align-items-center justify-content-center"
                >
                  <span className="me-2">3.</span>
                  {t('campaigns.steps.audience', 'Audience')}
                  {isStepValid('audience') && <i className="bi bi-check-circle-fill text-success ms-2"></i>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeStep === 'preview'}
                  onClick={() => setActiveStep('preview')}
                  className="d-flex align-items-center justify-content-center"
                >
                  <span className="me-2">4.</span>
                  {t('campaigns.steps.preview', 'Preview')}
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Body>
        </Card>

        {/* Step Content */}
        <div>
          {/* Step 1: Basic Info */}
          {activeStep === 'basics' && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">{t('campaigns.basicInfo', 'Basic Information')}</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('campaigns.name', 'Campaign Name')} *</Form.Label>
                      <Form.Control
                        type="text"
                        value={campaign.name}
                        onChange={handleChange('name')}
                        placeholder={t('campaigns.namePlaceholder', 'e.g., January Newsletter')}
                        maxLength={200}
                      />
                      <Form.Text className="text-muted">
                        {t('campaigns.nameHelp', 'Internal name for your reference')}
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>{t('campaigns.subject', 'Email Subject')} *</Form.Label>
                      <Form.Control
                        type="text"
                        value={campaign.subject}
                        onChange={handleChange('subject')}
                        placeholder={t('campaigns.subjectPlaceholder', 'e.g., Your Monthly Health Tips')}
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        {t('campaigns.subjectHelp', 'Subject line recipients will see. You can use {{patient_first_name}} for personalization.')}
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>{t('campaigns.campaignType', 'Campaign Type')}</Form.Label>
                      <Form.Select
                        value={campaign.campaign_type}
                        onChange={handleChange('campaign_type')}
                      >
                        {typeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>{t('campaigns.sender', 'Sender (Dietitian)')}</Form.Label>
                      <Form.Select
                        value={campaign.sender_id}
                        onChange={handleChange('sender_id')}
                      >
                        <option value="">{t('campaigns.senderDefault', '-- Use patient\'s assigned dietitian --')}</option>
                        {dietitians.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        {t('campaigns.senderHelp', 'Select who will appear as the sender. If not specified, the patient\'s assigned dietitian will be used.')}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-4">
                  <Button
                    variant="primary"
                    onClick={() => setActiveStep('content')}
                    disabled={!isStepValid('basics')}
                  >
                    {t('common.next', 'Next')}
                    <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Step 2: Content */}
          {activeStep === 'content' && (
            <Row>
              <Col lg={9}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('campaigns.emailContent', 'Email Content')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('campaigns.bodyHtml', 'Email Body (HTML)')}</Form.Label>
                      <Form.Control
                        as="textarea"
                        id="body_html"
                        rows={15}
                        value={campaign.body_html}
                        onChange={handleChange('body_html')}
                        placeholder={t('campaigns.bodyPlaceholder', 'Write your email content here...')}
                        style={{ fontFamily: 'monospace', fontSize: '14px' }}
                      />
                      <Form.Text className="text-muted">
                        {t('campaigns.bodyHelp', 'HTML content. Use {{variable}} syntax for personalization.')}
                      </Form.Text>
                    </Form.Group>

                    <Alert variant="info" className="small">
                      <i className="bi bi-info-circle me-2"></i>
                      {t('campaigns.unsubscribeNote', 'An unsubscribe link will be automatically added to the footer if not present.')}
                    </Alert>

                    <div className="d-flex justify-content-between mt-4">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setActiveStep('basics')}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        {t('common.back', 'Back')}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setActiveStep('audience')}
                        disabled={!isStepValid('content')}
                      >
                        {t('common.next', 'Next')}
                        <i className="bi bi-arrow-right ms-2"></i>
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3}>
                <Card className="sticky-top" style={{ top: '20px' }}>
                  <Card.Header className="bg-primary text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-braces me-2"></i>
                      {t('campaigns.personalizationVariables', 'Variables de personnalisation')}
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="list-group list-group-flush">
                      {availableVariables.map(v => (
                        <button
                          key={v.key}
                          type="button"
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          onClick={() => insertVariable(v.key)}
                        >
                          <span className="small">{v.label}</span>
                          <Badge bg="secondary" className="font-monospace">{`{{${v.key}}}`}</Badge>
                        </button>
                      ))}
                    </div>
                  </Card.Body>
                  <Card.Footer className="small text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    {t('campaigns.variablesHelp', 'Cliquez pour insérer la variable à la position du curseur')}
                  </Card.Footer>
                </Card>
              </Col>
            </Row>
          )}

          {/* Step 3: Audience */}
          {activeStep === 'audience' && (
            <Row>
              <Col lg={8}>
                <Card className="mb-4">
                  <Card.Header>
                    <h5 className="mb-0">{t('campaigns.targetAudience', 'Target Audience')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <AudienceBuilder
                      value={campaign.target_audience}
                      onChange={handleAudienceChange}
                    />

                    <div className="d-flex justify-content-between mt-4">
                      <Button
                        variant="outline-secondary"
                        onClick={() => setActiveStep('content')}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        {t('common.back', 'Back')}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => setActiveStep('preview')}
                        disabled={!isStepValid('audience')}
                      >
                        {t('common.next', 'Next')}
                        <i className="bi bi-arrow-right ms-2"></i>
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4}>
                <AudiencePreview
                  preview={audiencePreview}
                  loading={previewLoading}
                />
              </Col>
            </Row>
          )}

          {/* Step 4: Preview */}
          {activeStep === 'preview' && (
            <Row>
              <Col lg={8}>
                <CampaignPreview campaign={campaign} />

                <div className="d-flex justify-content-between mt-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setActiveStep('audience')}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    {t('common.back', 'Back')}
                  </Button>
                </div>
              </Col>
              <Col lg={4}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('campaigns.summary', 'Campaign Summary')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <small className="text-muted">{t('campaigns.name', 'Name')}</small>
                      <div>{campaign.name || '-'}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">{t('campaigns.subject', 'Subject')}</small>
                      <div>{campaign.subject || '-'}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">{t('campaigns.campaignType', 'Type')}</small>
                      <div className="text-capitalize">{campaign.campaign_type}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">{t('campaigns.recipients', 'Recipients')}</small>
                      <div>
                        <strong className="text-primary">{audiencePreview?.count || 0}</strong> {t('campaigns.patients', 'patients')}
                      </div>
                    </div>

                    <hr />

                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className={`bi ${isStepValid('basics') ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} me-2`}></i>
                        {t('campaigns.steps.basics', 'Basic Info')}
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <i className={`bi ${isStepValid('content') ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} me-2`}></i>
                        {t('campaigns.steps.content', 'Content')}
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <i className={`bi ${isStepValid('audience') ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} me-2`}></i>
                        {t('campaigns.steps.audience', 'Audience')}
                      </div>
                    </div>

                    {!canSendCampaign() && (
                      <Alert variant="warning" className="small mb-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {t('campaigns.completeAllSteps', 'Please complete all steps before sending.')}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </div>

        {/* Send Confirmation Modal */}
        <Modal show={showSendModal} onHide={() => setShowSendModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('campaigns.confirmSend', 'Send Campaign')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {t('campaigns.sendConfirmMessage', 'Are you sure you want to send this campaign to')} <strong>{audiencePreview?.count || 0}</strong> {t('campaigns.recipients', 'recipients')}?
            </p>
            <Alert variant="warning" className="small">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {t('campaigns.sendWarning', 'This action cannot be undone. Emails will be sent immediately.')}
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSendModal(false)} disabled={sending}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleSendNow} disabled={sending}>
              {sending ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  {t('campaigns.sendNow', 'Send Now')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Schedule Modal */}
        <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t('campaigns.scheduleCampaign', 'Schedule Campaign')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>{t('campaigns.scheduleDate', 'Send Date & Time')}</Form.Label>
              <Form.Control
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <Form.Text className="text-muted">
                {t('campaigns.scheduleHelp', 'The campaign will be sent automatically at this time.')}
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)} disabled={sending}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="info" onClick={handleSchedule} disabled={sending || !scheduledDate}>
              {sending ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <>
                  <i className="bi bi-clock me-2"></i>
                  {t('campaigns.schedule', 'Schedule')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default CampaignEditorPage;
