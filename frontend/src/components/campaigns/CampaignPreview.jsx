/**
 * Campaign Preview Component
 * Shows a preview of the email content
 */

import { useState } from 'react';
import { Card, Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const CampaignPreview = ({ campaign }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('desktop');

  // Sample variable replacement for preview
  const replaceVariables = (content) => {
    if (!content) return '';

    const sampleVars = {
      patient_first_name: 'Marie',
      patient_last_name: 'Dupont',
      patient_email: 'marie.dupont@email.com',
      dietitian_name: 'Dr. Martin',
      unsubscribe_link: '#'
    };

    let result = content;
    Object.entries(sampleVars).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(pattern, value);
    });

    return result;
  };

  const previewSubject = replaceVariables(campaign.subject);
  const previewHtml = replaceVariables(campaign.body_html);

  // Add default styling if not present
  const getStyledHtml = () => {
    if (!previewHtml) return '';

    // Check if already has HTML structure
    if (previewHtml.includes('<html') || previewHtml.includes('<!DOCTYPE')) {
      return previewHtml;
    }

    // Convert newlines to <br> if content doesn't already have HTML tags
    let processedHtml = previewHtml;
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(previewHtml);
    if (!hasHtmlTags) {
      // Plain text - convert newlines to <br>
      processedHtml = previewHtml.replace(/\n/g, '<br>');
    }

    // Wrap in basic HTML structure with styling
    return `
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
          }
          a { color: #007bff; }
          p { margin: 0 0 16px 0; }
          h1, h2, h3 { margin: 0 0 16px 0; }
        </style>
      </head>
      <body>
        ${processedHtml}
      </body>
      </html>
    `;
  };

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-eye me-2"></i>
            {t('campaigns.preview', 'Preview')}
          </h5>
          <Nav variant="pills" className="nav-sm">
            <Nav.Item>
              <Nav.Link
                active={activeTab === 'desktop'}
                onClick={() => setActiveTab('desktop')}
                className="py-1 px-2"
              >
                <i className="bi bi-display me-1"></i>
                {t('campaigns.desktop', 'Desktop')}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === 'mobile'}
                onClick={() => setActiveTab('mobile')}
                className="py-1 px-2"
              >
                <i className="bi bi-phone me-1"></i>
                {t('campaigns.mobile', 'Mobile')}
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {/* Email header */}
        <div className="p-3 border-bottom bg-light">
          <div className="small text-muted mb-1">{t('campaigns.from', 'From')}: NutriVault</div>
          <div className="small text-muted mb-1">{t('campaigns.to', 'To')}: marie.dupont@email.com</div>
          <div className="small"><strong>{t('campaigns.subject', 'Subject')}:</strong> {previewSubject || t('campaigns.noSubject', '(No subject)')}</div>
        </div>

        {/* Email content */}
        <div
          className={`email-preview-container ${activeTab === 'mobile' ? 'mobile-preview' : ''}`}
          style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            minHeight: '400px'
          }}
        >
          <div
            className={`email-content-frame bg-white shadow-sm ${activeTab === 'mobile' ? 'mx-auto' : ''}`}
            style={{
              maxWidth: activeTab === 'mobile' ? '375px' : '100%',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {previewHtml ? (
              <iframe
                srcDoc={getStyledHtml()}
                title="Email Preview"
                style={{
                  width: '100%',
                  height: activeTab === 'mobile' ? '500px' : '400px',
                  border: 'none'
                }}
              />
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-envelope display-4 d-block mb-3"></i>
                <p>{t('campaigns.noContent', 'No content to preview. Add content in the previous step.')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview note */}
        <div className="p-3 bg-light border-top">
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            {t('campaigns.previewNote', 'This preview shows sample data. Actual emails will be personalized for each recipient.')}
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CampaignPreview;
