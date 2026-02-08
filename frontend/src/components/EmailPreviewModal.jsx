/**
 * EmailPreviewModal Component
 * Preview email template with sample data
 * Sprint 5: US-5.5.2 - Email Templates
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Alert,
  Spinner,
  Tabs,
  Tab,
  Badge,
  Form
} from 'react-bootstrap';
import DOMPurify from 'dompurify';
import emailTemplateService from '../services/emailTemplateService';

// Sample data by category
const SAMPLE_DATA = {
  invoice: {
    patient: {
      first_name: 'Marie',
      last_name: 'Dubois',
      email: 'marie.dubois@example.com'
    },
    invoice: {
      invoice_number: 'INV-2026-001',
      invoice_date: '2026-01-24',
      due_date: '2026-02-24',
      service_description: 'Consultation nutritionnelle',
      amount_total: 85.00,
      amount_due: 85.00,
      amount_paid: 0.00,
      status: 'pending'
    },
    dietitian: {
      first_name: 'Dr. Sophie',
      last_name: 'Martin',
      email: 'sophie.martin@nutrivault.com',
      phone: '+33 1 23 45 67 89'
    }
  },
  document_share: {
    patient: {
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@example.com'
    },
    document: {
      file_name: 'Plan alimentaire - Janvier 2026.pdf',
      name: 'Plan alimentaire - Janvier 2026.pdf',
      description: 'Votre plan alimentaire personnalisé pour le mois de janvier',
      category: 'meal_plan'
    },
    sharedBy: {
      first_name: 'Dr. Sophie',
      last_name: 'Martin'
    },
    notes: 'Veuillez suivre ce plan et me tenir informée de vos progrès.'
  },
  payment_reminder: {
    patient: {
      first_name: 'Pierre',
      last_name: 'Laurent',
      email: 'pierre.laurent@example.com'
    },
    invoice: {
      invoice_number: 'INV-2025-123',
      invoice_date: '2025-12-15',
      due_date: '2026-01-15',
      amount_due: 75.00
    }
  },
  appointment_reminder: {
    patient: {
      first_name: 'Claire',
      last_name: 'Bernard',
      email: 'claire.bernard@example.com'
    },
    appointment: {
      appointment_date: '2026-02-01T14:30:00',
      appointment_time: '14:30'
    },
    dietitian: {
      first_name: 'Dr. Sophie',
      last_name: 'Martin',
      email: 'sophie.martin@nutrivault.com',
      phone: '+33 1 23 45 67 89'
    },
    clinic: {
      name: 'Cabinet NutriVault',
      address: '123 Rue de la Santé, 75013 Paris',
      phone: '+33 1 23 45 67 89'
    }
  },
  follow_up: {
    patient: {
      first_name: 'Antoine',
      last_name: 'Rousseau',
      email: 'antoine.rousseau@example.com'
    },
    dietitian: {
      first_name: 'Dr. Sophie',
      last_name: 'Martin'
    },
    lastVisitDate: '2026-01-10',
    nextRecommendedDate: '2026-02-10'
  },
  general: {
    patient: {
      first_name: 'Émilie',
      last_name: 'Petit',
      email: 'emilie.petit@example.com'
    },
    dietitian: {
      first_name: 'Dr. Sophie',
      last_name: 'Martin'
    },
    customMessage: 'Nous vous rappelons de prendre vos rendez-vous régulièrement.'
  }
};

const EmailPreviewModal = ({ show, onHide, template }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('html');

  useEffect(() => {
    if (show && template) {
      loadPreview();
    }
  }, [show, template]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get sample data for template category
      const sampleData = SAMPLE_DATA[template.category] || SAMPLE_DATA.general;

      // Request preview from backend
      const response = await emailTemplateService.previewTemplate(template.id, sampleData);
      // Backend returns { success: true, data: { subject, html, text, ... } }
      const previewData = response.data?.data || response.data;
      setPreview(previewData);
    } catch (err) {
      console.error('Error loading preview:', err);
      setError(err.response?.data?.error || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="md-down" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Preview: {template.name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {error && <Alert variant="danger">{error}</Alert>}

        {preview && (
          <>
            {/* Template Info */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <Badge bg="secondary" className="me-2">{template.slug}</Badge>
                  <Badge bg="primary" className="me-2">{template.category}</Badge>
                  <Badge bg="info">v{template.version}</Badge>
                </div>
                {preview.validation && !preview.validation.valid && (
                  <Badge bg="warning" text="dark">
                    Missing variables: {preview.validation.missing.join(', ')}
                  </Badge>
                )}
              </div>

              <div className="mb-2">
                <strong>Subject:</strong>
                <div className="p-2 bg-light rounded">{preview.subject}</div>
              </div>
            </div>

            {/* Preview Tabs */}
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
              {/* HTML Preview */}
              <Tab eventKey="html" title="HTML Preview">
                {/* Note: Admin-only preview of templates rendered server-side */}
                <div
                  className="border rounded p-3"
                  style={{
                    maxHeight: '500px',
                    overflowY: 'auto',
                    backgroundColor: '#fff'
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.html) }}
                />
              </Tab>

              {/* Plain Text Preview */}
              <Tab eventKey="text" title="Plain Text">
                <Form.Control
                  as="textarea"
                  readOnly
                  value={preview.text}
                  rows={15}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Tab>

              {/* HTML Source */}
              <Tab eventKey="source" title="HTML Source">
                <Form.Control
                  as="textarea"
                  readOnly
                  value={preview.html}
                  rows={15}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa'
                  }}
                />
              </Tab>

              {/* Variables Used */}
              <Tab eventKey="variables" title="Variables">
                <div className="p-3">
                  <h6>Sample Data Used:</h6>
                  <pre
                    className="bg-light p-3 rounded"
                    style={{
                      maxHeight: '500px',
                      overflowY: 'auto',
                      fontSize: '0.85rem'
                    }}
                  >
                    {JSON.stringify(preview.variables_used, null, 2)}
                  </pre>

                  {preview.validation && (
                    <>
                      <h6 className="mt-3">Validation:</h6>
                      <div>
                        <Badge bg={preview.validation.valid ? 'success' : 'warning'} className="me-2">
                          {preview.validation.valid ? 'Valid' : 'Has Issues'}
                        </Badge>
                      </div>

                      {preview.validation.used.length > 0 && (
                        <div className="mt-2">
                          <strong>Variables used in template:</strong>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {preview.validation.used.map(v => (
                              <Badge key={v} bg="secondary">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.validation.missing.length > 0 && (
                        <div className="mt-2">
                          <strong>Missing variables:</strong>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {preview.validation.missing.map(v => (
                              <Badge key={v} bg="warning" text="dark">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Tab>
            </Tabs>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmailPreviewModal;
