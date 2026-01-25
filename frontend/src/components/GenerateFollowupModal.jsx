/**
 * Generate Follow-up Modal Component
 * US-5.5.5: AI-Generated Follow-ups
 *
 * Modal for generating, editing, and sending AI follow-up emails
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
  Tab,
  Tabs,
  Row,
  Col
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import followupService from '../services/followupService';
import { FaRobot, FaPaperPlane, FaEdit, FaRedo, FaEye } from 'react-icons/fa';

const GenerateFollowupModal = ({ show, onHide, visit, onSent }) => {
  const { t, i18n } = useTranslation();

  // State
  const [step, setStep] = useState('options'); // 'options', 'generating', 'editing', 'preview', 'sending', 'success'
  const [error, setError] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(null);

  // Generation options
  const [options, setOptions] = useState({
    language: i18n.language || 'fr',
    tone: 'professional',
    includeNextSteps: true,
    includeNextAppointment: true
  });

  // Generated content
  const [content, setContent] = useState({
    subject: '',
    body_html: '',
    body_text: ''
  });
  const [aiContent, setAiContent] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Check AI status on mount
  useEffect(() => {
    if (show) {
      checkAIStatus();
      setStep('options');
      setError(null);
      setContent({ subject: '', body_html: '', body_text: '' });
      setAiContent(null);
    }
  }, [show]);

  const checkAIStatus = async () => {
    try {
      const response = await followupService.getAIStatus();
      setAiAvailable(response.data?.ai_available);
    } catch (err) {
      console.error('Error checking AI status:', err);
      setAiAvailable(false);
    }
  };

  const handleOptionChange = (field, value) => {
    setOptions(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    try {
      setStep('generating');
      setError(null);

      const response = await followupService.generateFollowup(visit.id, options);

      if (response.success && response.data) {
        setContent({
          subject: response.data.subject,
          body_html: response.data.body_html,
          body_text: response.data.body_text
        });
        setAiContent(response.data.ai_content);
        setMetadata(response.data.metadata);
        setStep('editing');
      } else {
        throw new Error(response.error || 'Failed to generate content');
      }
    } catch (err) {
      console.error('Error generating follow-up:', err);
      setError(err.response?.data?.error || err.message || t('followup.generateError'));
      setStep('options');
    }
  };

  const handleContentChange = (field, value) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    if (!content.subject || !content.body_html) {
      setError(t('followup.subjectAndBodyRequired'));
      return;
    }

    try {
      setStep('sending');
      setError(null);

      const response = await followupService.sendFollowup(visit.id, {
        ...content,
        ai_generated: true
      });

      if (response.success) {
        setStep('success');
        if (onSent) {
          onSent(response.data);
        }
      } else {
        throw new Error(response.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending follow-up:', err);
      setError(err.response?.data?.error || err.message || t('followup.sendError'));
      setStep('editing');
    }
  };

  const handleRegenerate = () => {
    setStep('options');
    setContent({ subject: '', body_html: '', body_text: '' });
    setAiContent(null);
  };

  const renderOptionsStep = () => (
    <>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {aiAvailable === false && (
          <Alert variant="warning">
            <FaRobot className="me-2" />
            {t('followup.aiNotConfigured')}
            <br />
            <small className="text-muted">
              {t('followup.aiNotConfiguredHint')}
            </small>
          </Alert>
        )}

        <div className="mb-4">
          <h6>{t('followup.visitSummary')}</h6>
          <div className="bg-light p-3 rounded">
            <Row>
              <Col sm={4}>
                <strong>{t('visits.patient')}:</strong>
              </Col>
              <Col sm={8}>
                {visit.patient?.first_name} {visit.patient?.last_name}
              </Col>
            </Row>
            <Row>
              <Col sm={4}>
                <strong>{t('visits.date')}:</strong>
              </Col>
              <Col sm={8}>
                {new Date(visit.visit_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
              </Col>
            </Row>
            <Row>
              <Col sm={4}>
                <strong>{t('visits.type')}:</strong>
              </Col>
              <Col sm={8}>
                {visit.visit_type || '-'}
              </Col>
            </Row>
          </div>
        </div>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>{t('followup.language')}</Form.Label>
            <Form.Select
              value={options.language}
              onChange={(e) => handleOptionChange('language', e.target.value)}
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="de">Deutsch</option>
              <option value="nl">Nederlands</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t('followup.tone')}</Form.Label>
            <Form.Select
              value={options.tone}
              onChange={(e) => handleOptionChange('tone', e.target.value)}
            >
              <option value="professional">{t('followup.toneProfessional')}</option>
              <option value="friendly">{t('followup.toneFriendly')}</option>
              <option value="formal">{t('followup.toneFormal')}</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="includeNextSteps"
              label={t('followup.includeNextSteps')}
              checked={options.includeNextSteps}
              onChange={(e) => handleOptionChange('includeNextSteps', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="includeNextAppointment"
              label={t('followup.includeNextAppointment')}
              checked={options.includeNextAppointment}
              onChange={(e) => handleOptionChange('includeNextAppointment', e.target.checked)}
              disabled={!visit.next_visit_date}
            />
            {!visit.next_visit_date && (
              <Form.Text className="text-muted">
                {t('followup.noNextAppointment')}
              </Form.Text>
            )}
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleGenerate}>
          <FaRobot className="me-2" />
          {t('followup.generateWithAI')}
        </Button>
      </Modal.Footer>
    </>
  );

  const renderGeneratingStep = () => (
    <Modal.Body className="text-center py-5">
      <Spinner animation="border" variant="primary" className="mb-3" />
      <h5>{t('followup.generating')}</h5>
      <p className="text-muted">{t('followup.generatingHint')}</p>
    </Modal.Body>
  );

  const renderEditingStep = () => (
    <>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {metadata?.model === 'mock' && (
          <Alert variant="info">
            <FaRobot className="me-2" />
            {t('followup.mockContent')}
          </Alert>
        )}

        <Tabs defaultActiveKey="edit" className="mb-3">
          <Tab eventKey="edit" title={<><FaEdit className="me-1" />{t('followup.edit')}</>}>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>{t('followup.subject')} *</Form.Label>
                <Form.Control
                  type="text"
                  value={content.subject}
                  onChange={(e) => handleContentChange('subject', e.target.value)}
                  placeholder={t('followup.subjectPlaceholder')}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('followup.htmlBody')} *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={12}
                  value={content.body_html}
                  onChange={(e) => handleContentChange('body_html', e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t('followup.plainTextBody')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={content.body_text}
                  onChange={(e) => handleContentChange('body_text', e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
                />
                <Form.Text className="text-muted">
                  {t('followup.plainTextHint')}
                </Form.Text>
              </Form.Group>
            </Form>
          </Tab>

          <Tab eventKey="preview" title={<><FaEye className="me-1" />{t('followup.preview')}</>}>
            <div className="border rounded p-3">
              <div className="mb-3 pb-3 border-bottom">
                <strong>{t('followup.to')}:</strong> {visit.patient?.email || 'N/A'}<br />
                <strong>{t('followup.subject')}:</strong> {content.subject}
              </div>
              <div
                className="email-preview"
                style={{ maxHeight: '400px', overflow: 'auto' }}
              >
                {/* Using sandboxed iframe for safe HTML preview - prevents script execution */}
                <iframe
                  title="Email Preview"
                  srcDoc={content.body_html}
                  style={{
                    width: '100%',
                    minHeight: '350px',
                    border: 'none',
                    backgroundColor: '#fff'
                  }}
                  sandbox=""
                />
              </div>
            </div>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleRegenerate}>
          <FaRedo className="me-2" />
          {t('followup.regenerate')}
        </Button>
        <Button variant="secondary" onClick={onHide}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="success"
          onClick={handleSend}
          disabled={!content.subject || !content.body_html}
        >
          <FaPaperPlane className="me-2" />
          {t('followup.sendEmail')}
        </Button>
      </Modal.Footer>
    </>
  );

  const renderSendingStep = () => (
    <Modal.Body className="text-center py-5">
      <Spinner animation="border" variant="success" className="mb-3" />
      <h5>{t('followup.sending')}</h5>
      <p className="text-muted">{t('followup.sendingHint')}</p>
    </Modal.Body>
  );

  const renderSuccessStep = () => (
    <>
      <Modal.Body className="text-center py-5">
        <div className="mb-3" style={{ fontSize: '4rem' }}>
          ✅
        </div>
        <h4 className="text-success">{t('followup.sentSuccessfully')}</h4>
        <p className="text-muted">
          {t('followup.sentTo', { email: visit.patient?.email })}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          {t('common.close')}
        </Button>
      </Modal.Footer>
    </>
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaRobot className="me-2" />
          {t('followup.title')}
          {step === 'editing' && (
            <Badge bg="success" className="ms-2" style={{ fontSize: '0.5em' }}>
              {t('followup.aiGenerated')}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      {step === 'options' && renderOptionsStep()}
      {step === 'generating' && renderGeneratingStep()}
      {step === 'editing' && renderEditingStep()}
      {step === 'sending' && renderSendingStep()}
      {step === 'success' && renderSuccessStep()}
    </Modal>
  );
};

export default GenerateFollowupModal;
