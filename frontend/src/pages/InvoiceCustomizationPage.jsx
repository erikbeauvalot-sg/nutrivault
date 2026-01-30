/**
 * Invoice Customization Page
 * Allows users to customize their invoice template with branding and contact info
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Tabs,
  Tab,
  InputGroup
} from 'react-bootstrap';
import { HexColorPicker } from 'react-colorful';
import Layout from '../components/layout/Layout';
import invoiceCustomizationService from '../services/invoiceCustomizationService';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';

const InvoiceCustomizationPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [customization, setCustomization] = useState(null);
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const [showDeleteSignatureConfirm, setShowDeleteSignatureConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Colors
    primary_color: '#3498db',
    secondary_color: '#2c3e50',
    accent_color: '#e74c3c',

    // Logo
    logo_width: 150,
    logo_height: 80,
    show_logo: true,

    // Contact Info
    business_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
    misc_info: '',
    show_contact_info: true,

    // Footer
    footer_text: '',
    signature_name: '',
    signature_title: '',
    show_footer: true,

    // Additional
    invoice_notes: ''
  });

  // File uploads
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  // Color picker visibility
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showAccentPicker, setShowAccentPicker] = useState(false);

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      setLoading(true);
      const response = await invoiceCustomizationService.getMyCustomization();
      setCustomization(response.data);

      // Populate form
      const data = response.data;
      setFormData({
        primary_color: data.primary_color || '#3498db',
        secondary_color: data.secondary_color || '#2c3e50',
        accent_color: data.accent_color || '#e74c3c',
        logo_width: data.logo_width || 150,
        logo_height: data.logo_height || 80,
        show_logo: data.show_logo !== false,
        business_name: data.business_name || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'France',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        misc_info: data.misc_info || '',
        show_contact_info: data.show_contact_info !== false,
        footer_text: data.footer_text || '',
        signature_name: data.signature_name || '',
        signature_title: data.signature_title || '',
        show_footer: data.show_footer !== false,
        invoice_notes: data.invoice_notes || ''
      });

      // Set logo and signature previews if they exist
      if (data.logo_url) {
        // Use server base URL (not API URL) for static files
        // In production, images are served from the same origin
        // In development, use localhost:3001 (backend port)
        const serverURL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
        // Add timestamp to prevent caching issues
        setLogoPreview(`${serverURL}${data.logo_url}?t=${new Date().getTime()}`);
      }
      if (data.signature_url) {
        // Use server base URL (not API URL) for static files
        const serverURL = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
        // Add timestamp to prevent caching issues
        setSignaturePreview(`${serverURL}${data.signature_url}?t=${new Date().getTime()}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSignatureSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      setSaving(true);
      await invoiceCustomizationService.uploadLogo(logoFile);
      setSuccess(t('invoiceCustomization.logo.uploaded', 'Logo uploaded successfully'));
      setLogoFile(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.logo.uploadError', 'Failed to upload logo'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoDelete = () => {
    setShowDeleteLogoConfirm(true);
  };

  const confirmDeleteLogo = async () => {
    try {
      setSaving(true);
      await invoiceCustomizationService.deleteLogo();
      setSuccess(t('invoiceCustomization.logoDeletedSuccess', 'Logo deleted successfully'));
      setLogoPreview(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.logoDeleteFailed', 'Failed to delete logo'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async () => {
    if (!signatureFile) return;

    try {
      setSaving(true);
      await invoiceCustomizationService.uploadSignature(signatureFile);
      setSuccess(t('invoiceCustomization.footer.uploaded', 'Signature uploaded successfully'));
      setSignatureFile(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.footer.uploadError', 'Failed to upload signature'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureDelete = () => {
    setShowDeleteSignatureConfirm(true);
  };

  const confirmDeleteSignature = async () => {
    try {
      setSaving(true);
      await invoiceCustomizationService.deleteSignature();
      setSuccess(t('invoiceCustomization.signatureDeletedSuccess', 'Signature deleted successfully'));
      setSignaturePreview(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.signatureDeleteFailed', 'Failed to delete signature'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await invoiceCustomizationService.updateCustomization(formData);
      setSuccess(t('invoiceCustomization.saved'));
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    try {
      setSaving(true);
      await invoiceCustomizationService.resetToDefaults();
      setSuccess(t('invoiceCustomization.resetSuccess', 'Settings reset to defaults'));
      setLogoPreview(null);
      setSignaturePreview(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || t('invoiceCustomization.resetFailed', 'Failed to reset settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <Spinner animation="border" />
          <p className="mt-2">{t('invoiceCustomization.loading')}</p>
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
            <h1 className="mb-0">{t('invoiceCustomization.title')}</h1>
            <p className="text-muted">{t('invoiceCustomization.subtitle')}</p>
          </Col>
          <Col xs="auto">
            <Button variant="outline-secondary" onClick={handleReset} disabled={saving} className="me-2">
              {t('invoiceCustomization.actions.reset')}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" className="me-2" /> : null}
              {t('invoiceCustomization.actions.save')}
            </Button>
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

        {/* Tabs */}
        <Tabs defaultActiveKey="branding" className="mb-3">
          {/* Branding Tab */}
          <Tab eventKey="branding" title={t('invoiceCustomization.tabs.logoBranding')}>
            <Card>
              <Card.Body>
                <h5>{t('invoiceCustomization.logo.title')}</h5>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_logo"
                    label={t('invoiceCustomization.logo.showOnInvoices')}
                    checked={formData.show_logo}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('invoiceCustomization.logo.uploadNew')}</Form.Label>
                      <Form.Control type="file" accept="image/png,image/jpeg" onChange={handleLogoSelect} />
                      <Form.Text>{t('invoiceCustomization.logo.maxSize', 'Max 5MB, PNG ou JPG')}</Form.Text>
                    </Form.Group>
                    {logoFile && (
                      <Button size="sm" className="mt-2" onClick={handleLogoUpload} disabled={saving}>
                        {t('invoiceCustomization.logo.upload', 'Téléverser')}
                      </Button>
                    )}
                  </Col>
                  <Col md={6}>
                    {logoPreview ? (
                      <div>
                        <p className="mb-1"><strong>{t('invoiceCustomization.logo.currentLogo')}:</strong></p>
                        <img
                          src={logoPreview}
                          alt="Logo"
                          style={{ maxWidth: '200px', maxHeight: '100px' }}
                          className="border p-2"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <br />
                        <Button size="sm" variant="outline-danger" className="mt-2" onClick={handleLogoDelete}>
                          {t('invoiceCustomization.logo.delete')}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted">{t('invoiceCustomization.logo.noLogo')}</p>
                    )}
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.logo.width')}</Form.Label>
                      <Form.Control
                        type="number"
                        name="logo_width"
                        value={formData.logo_width}
                        onChange={handleInputChange}
                        min="50"
                        max="500"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.logo.height')}</Form.Label>
                      <Form.Control
                        type="number"
                        name="logo_height"
                        value={formData.logo_height}
                        onChange={handleInputChange}
                        min="30"
                        max="300"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <h5>{t('invoiceCustomization.colors.title')}</h5>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.colors.primary')}</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: formData.primary_color,
                            border: '1px solid #ddd',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                        />
                        <Form.Control
                          type="text"
                          name="primary_color"
                          value={formData.primary_color}
                          onChange={handleInputChange}
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                      {showPrimaryPicker && (
                        <div className="mt-2">
                          <HexColorPicker
                            color={formData.primary_color}
                            onChange={(color) => setFormData(prev => ({ ...prev, primary_color: color }))}
                          />
                        </div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.colors.secondary')}</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: formData.secondary_color,
                            border: '1px solid #ddd',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowSecondaryPicker(!showSecondaryPicker)}
                        />
                        <Form.Control
                          type="text"
                          name="secondary_color"
                          value={formData.secondary_color}
                          onChange={handleInputChange}
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                      {showSecondaryPicker && (
                        <div className="mt-2">
                          <HexColorPicker
                            color={formData.secondary_color}
                            onChange={(color) => setFormData(prev => ({ ...prev, secondary_color: color }))}
                          />
                        </div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.colors.accent')}</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: formData.accent_color,
                            border: '1px solid #ddd',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowAccentPicker(!showAccentPicker)}
                        />
                        <Form.Control
                          type="text"
                          name="accent_color"
                          value={formData.accent_color}
                          onChange={handleInputChange}
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                      {showAccentPicker && (
                        <div className="mt-2">
                          <HexColorPicker
                            color={formData.accent_color}
                            onChange={(color) => setFormData(prev => ({ ...prev, accent_color: color }))}
                          />
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>{t('invoiceCustomization.contact.businessName')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    placeholder={t('invoiceCustomization.contact.businessNamePlaceholder')}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>

          {/* Contact Info Tab */}
          <Tab eventKey="contact" title={t('invoiceCustomization.tabs.contactInfo')}>
            <Card>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_contact_info"
                    label={t('invoiceCustomization.contact.showOnInvoices')}
                    checked={formData.show_contact_info}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.addressLine1')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="address_line1"
                        value={formData.address_line1}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.addressLine2')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="address_line2"
                        value={formData.address_line2}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.city')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.postalCode')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.country')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.phone')}</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.email')}</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.website')}</Form.Label>
                      <Form.Control
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder={t('invoiceCustomization.contact.websitePlaceholder')}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.contact.miscInfo')}</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="misc_info"
                        value={formData.misc_info}
                        onChange={handleInputChange}
                        placeholder={t('invoiceCustomization.contact.miscInfoPlaceholder')}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* Footer Tab */}
          <Tab eventKey="footer" title={t('invoiceCustomization.tabs.footerSignature')}>
            <Card>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_footer"
                    label={t('invoiceCustomization.footer.showOnInvoices')}
                    checked={formData.show_footer}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('invoiceCustomization.footer.closingMessage')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="footer_text"
                    value={formData.footer_text}
                    onChange={handleInputChange}
                    placeholder={t('invoiceCustomization.footer.closingMessagePlaceholder')}
                    maxLength={1000}
                  />
                  <Form.Text>{formData.footer_text.length} / 1000</Form.Text>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.footer.signatureName')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="signature_name"
                        value={formData.signature_name}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('invoiceCustomization.footer.signatureTitle')}</Form.Label>
                      <Form.Control
                        type="text"
                        name="signature_title"
                        value={formData.signature_title}
                        onChange={handleInputChange}
                        placeholder={t('invoiceCustomization.footer.signatureTitlePlaceholder')}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <h5>{t('invoiceCustomization.footer.signature')}</h5>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>{t('invoiceCustomization.footer.uploadNew')}</Form.Label>
                      <Form.Control type="file" accept="image/png,image/jpeg" onChange={handleSignatureSelect} />
                      <Form.Text>{t('invoiceCustomization.footer.maxSize', 'Max 2MB, PNG ou JPG')}</Form.Text>
                    </Form.Group>
                    {signatureFile && (
                      <Button size="sm" className="mt-2" onClick={handleSignatureUpload} disabled={saving}>
                        {t('invoiceCustomization.footer.upload', 'Téléverser')}
                      </Button>
                    )}
                  </Col>
                  <Col md={6}>
                    {signaturePreview ? (
                      <div>
                        <p className="mb-1"><strong>{t('invoiceCustomization.footer.currentSignature')}:</strong></p>
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          style={{ maxWidth: '200px', maxHeight: '100px' }}
                          className="border p-2"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <br />
                        <Button size="sm" variant="outline-danger" className="mt-2" onClick={handleSignatureDelete}>
                          {t('invoiceCustomization.footer.delete')}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted">{t('invoiceCustomization.footer.noSignature')}</p>
                    )}
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>{t('invoiceCustomization.notes.title')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="invoice_notes"
                    value={formData.invoice_notes}
                    onChange={handleInputChange}
                    placeholder={t('invoiceCustomization.notes.placeholder')}
                    maxLength={2000}
                  />
                  <Form.Text>{formData.invoice_notes.length} / 2000</Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>

        {/* Delete Logo Confirm Modal */}
        <ConfirmModal
          show={showDeleteLogoConfirm}
          onHide={() => setShowDeleteLogoConfirm(false)}
          onConfirm={confirmDeleteLogo}
          title={t('common.confirmation', 'Confirmation')}
          message={t('invoiceCustomization.confirmDeleteLogo', 'Delete logo image?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Delete Signature Confirm Modal */}
        <ConfirmModal
          show={showDeleteSignatureConfirm}
          onHide={() => setShowDeleteSignatureConfirm(false)}
          onConfirm={confirmDeleteSignature}
          title={t('common.confirmation', 'Confirmation')}
          message={t('invoiceCustomization.confirmDeleteSignature', 'Delete signature image?')}
          confirmLabel={t('common.delete', 'Delete')}
          variant="danger"
        />

        {/* Reset Confirm Modal */}
        <ConfirmModal
          show={showResetConfirm}
          onHide={() => setShowResetConfirm(false)}
          onConfirm={confirmReset}
          title={t('common.confirmation', 'Confirmation')}
          message={t('invoiceCustomization.confirmReset', 'Reset all customization to defaults? This will delete uploaded files.')}
          confirmLabel={t('common.reset', 'Reset')}
          variant="warning"
        />
      </Container>
    </Layout>
  );
};

export default InvoiceCustomizationPage;
