/**
 * Email Templates Fixtures
 * Test data for email template-related tests
 */

/**
 * Valid email template
 * category: invoice, document_share, payment_reminder, appointment_reminder, follow_up, general
 */
const validTemplate = {
  name: 'Appointment Reminder',
  slug: 'appointment_reminder',
  subject: 'Reminder: Your appointment on {{appointment_date}}',
  body_html: `Dear {{patient_name}},

This is a reminder that you have an appointment scheduled:

Date: {{appointment_date}}
Time: {{appointment_time}}
Location: {{clinic_address}}

If you need to reschedule, please contact us at least 24 hours in advance.

Best regards,
{{dietitian_name}}
{{clinic_name}}`,
  category: 'appointment_reminder',
  is_active: true
};

/**
 * Email template categories
 * category: invoice, document_share, payment_reminder, appointment_reminder, follow_up, general
 */
const templateCategories = {
  appointment: {
    name: 'Appointment Reminder',
    slug: 'appointment_reminder_template',
    subject: 'Reminder: Appointment on {{appointment_date}}',
    body_html: 'Dear {{patient_name}}, you have an appointment on {{appointment_date}} at {{appointment_time}}.',
    category: 'appointment_reminder',
    is_active: true
  },
  invoice: {
    name: 'Invoice Notification',
    slug: 'invoice_notification',
    subject: 'Invoice #{{invoice_number}} from {{clinic_name}}',
    body_html: 'Dear {{patient_name}}, please find attached your invoice #{{invoice_number}} for {{total_amount}}.',
    category: 'invoice',
    is_active: true
  },
  followUp: {
    name: 'Follow-up Email',
    slug: 'follow_up_email',
    subject: 'Follow-up after your visit',
    body_html: 'Dear {{patient_name}}, thank you for your visit on {{visit_date}}. Here are your recommendations...',
    category: 'follow_up',
    is_active: true
  },
  welcome: {
    name: 'Welcome Email',
    code: 'WELCOME',
    subject: 'Welcome to {{clinic_name}}!',
    body_html: 'Dear {{patient_name}}, welcome to {{clinic_name}}! We look forward to supporting your health journey.',
    category: 'general',
    language: 'en',
    is_active: true
  }
};

/**
 * Multi-language templates
 */
const multiLanguageTemplates = {
  en: {
    name: 'Appointment Reminder (EN)',
    code: 'APPOINTMENT_REMINDER_EN',
    subject: 'Reminder: Your appointment on {{appointment_date}}',
    body_html: 'Dear {{patient_name}}, this is a reminder for your upcoming appointment.',
    category: 'appointment',
    language: 'en',
    is_active: true
  },
  fr: {
    name: 'Rappel de Rendez-vous (FR)',
    code: 'APPOINTMENT_REMINDER_FR',
    subject: 'Rappel : Votre rendez-vous le {{appointment_date}}',
    body_html: 'Cher(e) {{patient_name}}, ceci est un rappel pour votre prochain rendez-vous.',
    category: 'appointment',
    language: 'fr',
    is_active: true
  }
};

/**
 * Invalid template data
 */
const invalidTemplates = {
  missingName: {
    code: 'MISSING_NAME',
    subject: 'Test Subject',
    body_html: 'Test body',
    category: 'general',
    language: 'en'
  },
  missingCode: {
    name: 'Missing Code Template',
    subject: 'Test Subject',
    body_html: 'Test body',
    category: 'general',
    language: 'en'
  },
  missingSubject: {
    name: 'Missing Subject Template',
    code: 'MISSING_SUBJECT',
    body_html: 'Test body',
    category: 'general',
    language: 'en'
  },
  missingBody: {
    name: 'Missing Body Template',
    code: 'MISSING_BODY',
    subject: 'Test Subject',
    category: 'general',
    language: 'en'
  },
  invalidLanguage: {
    name: 'Invalid Language Template',
    code: 'INVALID_LANG',
    subject: 'Test Subject',
    body_html: 'Test body',
    category: 'general',
    language: 'invalid'
  },
  duplicateCode: {
    name: 'Duplicate Code Template',
    code: 'APPOINTMENT_REMINDER', // Same as validTemplate
    subject: 'Test Subject',
    body_html: 'Test body',
    category: 'general',
    language: 'en'
  }
};

/**
 * Template update data
 */
const templateUpdates = {
  updateSubject: {
    subject: 'Updated: Your appointment reminder'
  },
  updateBody: {
    body_html: 'Updated email body content with {{patient_name}}.'
  },
  deactivate: {
    is_active: false
  },
  changeCategory: {
    category: 'general'
  }
};

/**
 * Template variables for testing substitution
 */
const templateVariables = {
  patient_name: 'John Doe',
  appointment_date: '2024-06-15',
  appointment_time: '10:00',
  clinic_name: 'NutriCare Clinic',
  clinic_address: '123 Health Street, Paris',
  dietitian_name: 'Dr. Marie Martin',
  invoice_number: 'INV-2024-001',
  total_amount: '85.00 EUR',
  visit_date: '2024-06-10'
};

/**
 * Email sending test data
 */
const emailSendData = {
  valid: {
    recipient_email: 'patient@test.com',
    recipient_name: 'Test Patient',
    variables: {
      patient_name: 'Test Patient',
      appointment_date: '2024-06-15',
      appointment_time: '10:00'
    }
  },
  missingRecipient: {
    recipient_name: 'Test Patient',
    variables: {
      patient_name: 'Test Patient'
    }
  },
  invalidEmail: {
    recipient_email: 'not-an-email',
    recipient_name: 'Test Patient',
    variables: {}
  }
};

/**
 * Template preview data
 */
const previewData = {
  patient_name: 'Preview Patient',
  appointment_date: 'June 15, 2024',
  appointment_time: '2:00 PM',
  clinic_name: 'NutriCare',
  dietitian_name: 'Dr. Smith'
};

module.exports = {
  validTemplate,
  templateCategories,
  multiLanguageTemplates,
  invalidTemplates,
  templateUpdates,
  templateVariables,
  emailSendData,
  previewData
};
