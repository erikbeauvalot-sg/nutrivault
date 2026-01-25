/**
 * Invoice Customizations Fixtures
 * Test data for invoice customization-related tests
 */

/**
 * Valid invoice customization
 */
const validCustomization = {
  business_name: 'NutriCare Clinic',
  business_address: '123 Health Street',
  business_city: 'Paris',
  business_postal_code: '75001',
  business_country: 'France',
  business_phone: '+33 1 23 45 67 89',
  business_email: 'contact@nutricare.fr',
  tax_id: 'FR12345678901',
  payment_terms: 'Payment due within 30 days',
  bank_details: 'IBAN: FR76 1234 5678 9012 3456 7890 123\nBIC: ABCDEFGH',
  footer_text: 'Thank you for your business!',
  currency: 'EUR',
  tax_rate: 0,
  invoice_prefix: 'NC',
  next_invoice_number: 1
};

/**
 * Minimal customization (only required fields)
 */
const minimalCustomization = {
  business_name: 'My Clinic'
};

/**
 * Full customization with all fields
 */
const fullCustomization = {
  business_name: 'Complete Nutrition Center',
  business_address: '456 Wellness Boulevard, Suite 200',
  business_city: 'Lyon',
  business_postal_code: '69001',
  business_country: 'France',
  business_phone: '+33 4 56 78 90 12',
  business_email: 'billing@completenutrition.fr',
  business_website: 'www.completenutrition.fr',
  tax_id: 'FR98765432109',
  siret: '12345678901234',
  professional_id: 'ADELI-123456789',
  payment_terms: 'Payment due upon receipt. Late payments subject to 10% penalty.',
  bank_details: 'Bank: BNP Paribas\nIBAN: FR76 3000 4000 0500 0060 0070 089\nBIC: BNPAFRPP',
  cheque_payable_to: 'Complete Nutrition Center SARL',
  footer_text: 'Thank you for trusting us with your health. All services are non-refundable.',
  notes: 'VAT not applicable - Article 261, 4, 1° of the French Tax Code',
  currency: 'EUR',
  tax_rate: 0,
  invoice_prefix: 'CNC',
  next_invoice_number: 100,
  logo_url: '/uploads/logos/complete-nutrition.png',
  signature_url: '/uploads/signatures/director-signature.png',
  primary_color: '#2563eb',
  secondary_color: '#1e40af'
};

/**
 * Customizations for different users
 */
const userCustomizations = {
  user1: {
    business_name: 'Dietitian Practice 1',
    business_address: '10 Rue de la Santé',
    business_city: 'Marseille',
    business_postal_code: '13001',
    business_country: 'France',
    currency: 'EUR',
    invoice_prefix: 'DP1',
    next_invoice_number: 1
  },
  user2: {
    business_name: 'Nutrition Expert',
    business_address: '25 Avenue du Bien-être',
    business_city: 'Toulouse',
    business_postal_code: '31000',
    business_country: 'France',
    currency: 'EUR',
    invoice_prefix: 'NE',
    next_invoice_number: 50
  }
};

/**
 * Invalid customization data
 */
const invalidCustomizations = {
  missingBusinessName: {
    business_address: '123 Test Street',
    business_city: 'Paris'
  },
  invalidEmail: {
    business_name: 'Test Clinic',
    business_email: 'not-an-email'
  },
  invalidCurrency: {
    business_name: 'Test Clinic',
    currency: 'INVALID'
  },
  negativeTaxRate: {
    business_name: 'Test Clinic',
    tax_rate: -10
  },
  taxRateOver100: {
    business_name: 'Test Clinic',
    tax_rate: 150
  },
  negativeInvoiceNumber: {
    business_name: 'Test Clinic',
    next_invoice_number: -1
  }
};

/**
 * Customization update data
 */
const customizationUpdates = {
  updateBusinessInfo: {
    business_name: 'Updated Clinic Name',
    business_address: 'New Address 123'
  },
  updatePaymentDetails: {
    payment_terms: 'Updated payment terms - Net 15',
    bank_details: 'Updated bank details'
  },
  updateInvoiceSettings: {
    invoice_prefix: 'NEW',
    next_invoice_number: 200
  },
  updateBranding: {
    primary_color: '#10b981',
    secondary_color: '#059669',
    footer_text: 'Updated footer message'
  },
  updateTaxSettings: {
    tax_rate: 20,
    tax_id: 'FR11111111111'
  }
};

/**
 * Logo and signature upload test data
 */
const fileUploads = {
  validLogo: {
    fieldname: 'logo',
    originalname: 'logo.png',
    mimetype: 'image/png',
    size: 50000 // 50KB
  },
  validSignature: {
    fieldname: 'signature',
    originalname: 'signature.png',
    mimetype: 'image/png',
    size: 30000 // 30KB
  },
  invalidType: {
    fieldname: 'logo',
    originalname: 'document.pdf',
    mimetype: 'application/pdf',
    size: 100000
  },
  tooLarge: {
    fieldname: 'logo',
    originalname: 'large-image.png',
    mimetype: 'image/png',
    size: 10000000 // 10MB
  }
};

module.exports = {
  validCustomization,
  minimalCustomization,
  fullCustomization,
  userCustomizations,
  invalidCustomizations,
  customizationUpdates,
  fileUploads
};
