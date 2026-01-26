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
        // Use API base URL from environment or default
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        // Add timestamp to prevent caching issues
        setLogoPreview(`${baseURL}${data.logo_url}?t=${new Date().getTime()}`);
      }
      if (data.signature_url) {
        // Use API base URL from environment or default
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        // Add timestamp to prevent caching issues
        setSignaturePreview(`${baseURL}${data.signature_url}?t=${new Date().getTime()}`);
      }
    } catch (err) {
      console.error('Error fetching customization:', err);
      setError(err.response?.data?.error || 'Failed to load customization');
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
      setSuccess('Logo uploaded successfully');
      setLogoFile(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload logo');
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
      setSuccess('Signature uploaded successfully');
      setSignatureFile(null);
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload signature');
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
      setSuccess('Settings saved successfully');
      await fetchCustomization();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
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
          <p className="mt-2">Loading...</p>
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
            <h1 className="mb-0">Invoice Customization</h1>
            <p className="text-muted">Customize your invoice template with branding and contact information</p>
          </Col>
          <Col xs="auto">
            <Button variant="outline-secondary" onClick={handleReset} disabled={saving} className="me-2">
              Reset to Defaults
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" className="me-2" /> : null}
              Save Settings
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
          <Tab eventKey="branding" title="Logo & Branding">
            <Card>
              <Card.Body>
                <h5>Logo</h5>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_logo"
                    label="Show logo on invoices"
                    checked={formData.show_logo}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Upload Logo</Form.Label>
                      <Form.Control type="file" accept="image/png,image/jpeg" onChange={handleLogoSelect} />
                      <Form.Text>Max 5MB, PNG or JPG</Form.Text>
                    </Form.Group>
                    {logoFile && (
                      <Button size="sm" className="mt-2" onClick={handleLogoUpload} disabled={saving}>
                        Upload
                      </Button>
                    )}
                  </Col>
                  <Col md={6}>
                    {logoPreview && (
                      <div>
                        <p className="mb-1"><strong>Preview:</strong></p>
                        <img src={logoPreview} alt="Logo" style={{ maxWidth: '200px', maxHeight: '100px' }} className="border p-2" />
                        <br />
                        <Button size="sm" variant="outline-danger" className="mt-2" onClick={handleLogoDelete}>
                          Delete Logo
                        </Button>
                      </div>
                    )}
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Logo Width (px)</Form.Label>
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
                      <Form.Label>Logo Height (px)</Form.Label>
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

                <h5>Color Scheme</h5>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Primary Color</Form.Label>
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
                      <Form.Label>Secondary Color</Form.Label>
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
                      <Form.Label>Accent Color</Form.Label>
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
                  <Form.Label>Business Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    placeholder="e.g., NutriVault Practice"
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>

          {/* Contact Info Tab */}
          <Tab eventKey="contact" title="Contact Information">
            <Card>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_contact_info"
                    label="Show contact information on invoices"
                    checked={formData.show_contact_info}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address Line 1</Form.Label>
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
                      <Form.Label>Address Line 2</Form.Label>
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
                      <Form.Label>City</Form.Label>
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
                      <Form.Label>Postal Code</Form.Label>
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
                      <Form.Label>Country</Form.Label>
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
                      <Form.Label>Phone</Form.Label>
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
                      <Form.Label>Email</Form.Label>
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
                      <Form.Label>Website</Form.Label>
                      <Form.Control
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Divers</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="misc_info"
                        value={formData.misc_info}
                        onChange={handleInputChange}
                        placeholder="Informations supplémentaires..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* Footer Tab */}
          <Tab eventKey="footer" title="Footer & Signature">
            <Card>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="show_footer"
                    label="Show footer on invoices"
                    checked={formData.show_footer}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Footer Text</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="footer_text"
                    value={formData.footer_text}
                    onChange={handleInputChange}
                    placeholder="e.g., Thank you for your business!"
                    maxLength={1000}
                  />
                  <Form.Text>{formData.footer_text.length} / 1000</Form.Text>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Signature Name</Form.Label>
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
                      <Form.Label>Signature Title</Form.Label>
                      <Form.Control
                        type="text"
                        name="signature_title"
                        value={formData.signature_title}
                        onChange={handleInputChange}
                        placeholder="e.g., Registered Dietitian"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <h5>Signature Image (Optional)</h5>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Upload Signature</Form.Label>
                      <Form.Control type="file" accept="image/png,image/jpeg" onChange={handleSignatureSelect} />
                      <Form.Text>Max 2MB, PNG or JPG</Form.Text>
                    </Form.Group>
                    {signatureFile && (
                      <Button size="sm" className="mt-2" onClick={handleSignatureUpload} disabled={saving}>
                        Upload
                      </Button>
                    )}
                  </Col>
                  <Col md={6}>
                    {signaturePreview && (
                      <div>
                        <p className="mb-1"><strong>Preview:</strong></p>
                        <img src={signaturePreview} alt="Signature" style={{ maxWidth: '200px', maxHeight: '100px' }} className="border p-2" />
                        <br />
                        <Button size="sm" variant="outline-danger" className="mt-2" onClick={handleSignatureDelete}>
                          Delete Signature
                        </Button>
                      </div>
                    )}
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Default Invoice Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="invoice_notes"
                    value={formData.invoice_notes}
                    onChange={handleInputChange}
                    placeholder="Default notes to include on all invoices..."
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
