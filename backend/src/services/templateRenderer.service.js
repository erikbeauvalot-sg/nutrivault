/**
 * Template Renderer Service
 * Handles variable substitution in email templates
 * Uses {{variable}} syntax for safe string replacement
 *
 * Sprint 5: US-5.5.2 - Email Templates
 */

/**
 * Translate invoice/payment status to French
 */
const translateStatus = (status) => {
  const statusMap = {
    'DRAFT': 'Brouillon',
    'SENT': 'Envoyée',
    'PAID': 'Payée',
    'OVERDUE': 'En retard',
    'CANCELLED': 'Annulée',
    'PARTIAL': 'Partielle'
  };
  return statusMap[status] || status;
};

/**
 * Available variables by template category
 */
const CATEGORY_VARIABLES = {
  invoice: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'invoice_number',
    'invoice_date',
    'due_date',
    'service_description',
    'amount_total',
    'amount_due',
    'amount_paid',
    'payment_status',
    'dietitian_name',
    'dietitian_first_name',
    'dietitian_last_name'
  ],
  document_share: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'document_name',
    'document_description',
    'document_category',
    'shared_by_name',
    'shared_by_first_name',
    'shared_by_last_name',
    'share_notes',
    'share_date'
  ],
  payment_reminder: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'invoice_number',
    'due_date',
    'days_overdue',
    'amount_due',
    'invoice_date'
  ],
  appointment_reminder: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'appointment_date',
    'appointment_time',
    'appointment_datetime',
    'dietitian_name',
    'dietitian_first_name',
    'dietitian_last_name',
    'dietitian_phone',
    'dietitian_email',
    'visit_type',
    'unsubscribe_link',
    'clinic_name',
    'clinic_address',
    'clinic_phone'
  ],
  follow_up: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'last_visit_date',
    'next_recommended_date',
    'dietitian_name',
    'dietitian_first_name',
    'dietitian_last_name'
  ],
  general: [
    'patient_name',
    'patient_first_name',
    'patient_last_name',
    'patient_email',
    'dietitian_name',
    'dietitian_first_name',
    'dietitian_last_name',
    'custom_message'
  ]
};

/**
 * Get available variables for a category
 * @param {string} category - Template category
 * @returns {Array<string>} Array of available variable names
 */
function getAvailableVariablesByCategory(category) {
  return CATEGORY_VARIABLES[category] || CATEGORY_VARIABLES.general;
}

/**
 * Build variable context from raw data objects
 * Converts complex objects into flat key-value pairs for template rendering
 *
 * @param {Object} data - Raw data objects
 * @param {Object} data.patient - Patient object
 * @param {Object} data.invoice - Invoice object (optional)
 * @param {Object} data.document - Document object (optional)
 * @param {Object} data.appointment - Appointment object (optional)
 * @param {Object} data.visit - Visit object (optional, for appointment reminders)
 * @param {Object} data.dietitian - Dietitian/user object (optional)
 * @param {Object} data.sharedBy - User who shared document (optional)
 * @param {string} data.notes - Additional notes (optional)
 * @param {string} data.customMessage - Custom message (optional)
 * @returns {Object} Flat key-value variable context
 */
function buildVariableContext(data = {}) {
  const context = {};
  const {
    patient,
    invoice,
    document,
    appointment,
    visit,
    dietitian,
    sharedBy,
    notes,
    customMessage
  } = data;

  // Patient variables
  if (patient) {
    context.patient_name = `${patient.first_name} ${patient.last_name}`;
    context.patient_first_name = patient.first_name;
    context.patient_last_name = patient.last_name;
    context.patient_email = patient.email;

    // Add unsubscribe link if patient has unsubscribe token
    if (patient.unsubscribe_token) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      context.unsubscribe_link = `${baseUrl}/unsubscribe.html?token=${patient.unsubscribe_token}`;
    }
  }

  // Invoice variables
  if (invoice) {
    context.invoice_number = invoice.invoice_number;
    context.invoice_date = invoice.invoice_date
      ? new Date(invoice.invoice_date).toLocaleDateString('fr-FR')
      : '';
    context.due_date = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR')
      : '';
    context.service_description = invoice.service_description || '';
    context.amount_total = invoice.amount_total
      ? `${parseFloat(invoice.amount_total).toFixed(2)} €`
      : '0.00 €';
    context.amount_due = invoice.amount_due
      ? `${parseFloat(invoice.amount_due).toFixed(2)} €`
      : '0.00 €';
    context.amount_paid = invoice.amount_paid
      ? `${parseFloat(invoice.amount_paid).toFixed(2)} €`
      : '0.00 €';
    context.payment_status = translateStatus(invoice.status) || '';

    // Calculate days overdue
    if (invoice.due_date) {
      const daysOverdue = Math.floor(
        (new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)
      );
      context.days_overdue = daysOverdue > 0 ? daysOverdue : 0;
    }
  }

  // Document variables
  if (document) {
    context.document_name = document.file_name || document.name || '';
    context.document_description = document.description || '';
    context.document_category = document.category || '';
  }

  // Appointment variables
  if (appointment) {
    context.appointment_date = appointment.appointment_date
      ? new Date(appointment.appointment_date).toLocaleDateString('fr-FR')
      : '';
    context.appointment_time = appointment.appointment_time || '';
    context.appointment_datetime = appointment.appointment_date
      ? new Date(appointment.appointment_date).toLocaleString('fr-FR')
      : '';
  }

  // Visit variables (for appointment reminders)
  if (visit) {
    const visitDate = new Date(visit.visit_date);
    context.appointment_date = visitDate.toLocaleDateString('fr-FR');
    context.appointment_time = visitDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    context.appointment_datetime = visitDate.toLocaleString('fr-FR');
    context.visit_type = visit.visit_type || 'Consultation';
  }

  // Dietitian/user variables
  if (dietitian) {
    context.dietitian_name = `${dietitian.first_name} ${dietitian.last_name}`;
    context.dietitian_first_name = dietitian.first_name;
    context.dietitian_last_name = dietitian.last_name;
    context.dietitian_email = dietitian.email;
    context.dietitian_phone = dietitian.phone || '';
  }

  // Shared by variables (for document sharing)
  if (sharedBy) {
    context.shared_by_name = `${sharedBy.first_name} ${sharedBy.last_name}`;
    context.shared_by_first_name = sharedBy.first_name;
    context.shared_by_last_name = sharedBy.last_name;
    context.share_date = new Date().toLocaleDateString('fr-FR');
  }

  // Additional fields
  if (notes) {
    context.share_notes = notes;
  }

  if (customMessage) {
    context.custom_message = customMessage;
  }

  // Visit dates (for follow-up)
  if (data.lastVisitDate) {
    context.last_visit_date = new Date(data.lastVisitDate).toLocaleDateString('fr-FR');
  }

  if (data.nextRecommendedDate) {
    context.next_recommended_date = new Date(data.nextRecommendedDate).toLocaleDateString('fr-FR');
  }

  // Clinic info (for appointments)
  if (data.clinic) {
    context.clinic_name = data.clinic.name || '';
    context.clinic_address = data.clinic.address || '';
    context.clinic_phone = data.clinic.phone || '';
  }

  return context;
}

/**
 * Render template with variables
 * Replaces {{variable}} placeholders with actual values
 * Missing variables are replaced with [variable_name] placeholder
 *
 * @param {string} template - Template string with {{variables}}
 * @param {Object} variables - Key-value pairs of variables
 * @returns {string} Rendered template
 */
function render(template, variables = {}) {
  if (!template) {
    return '';
  }

  // Replace all {{variable}} with values
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];

    // Return value if exists, otherwise show placeholder
    if (value !== undefined && value !== null) {
      return String(value);
    }

    // Return placeholder for missing variables
    return `[${variableName}]`;
  });
}

/**
 * Validate template variables
 * Checks if all used variables are in the available list
 *
 * @param {string} template - Template string
 * @param {Array<string>} availableVariables - List of available variable names
 * @returns {Object} { valid: boolean, missing: Array<string>, used: Array<string> }
 */
function validateVariables(template, availableVariables = []) {
  if (!template) {
    return { valid: true, missing: [], used: [] };
  }

  // Extract all variables from template
  const variableRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const usedVariables = new Set();
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    usedVariables.add(match[1]);
  }

  const usedArray = Array.from(usedVariables).sort();
  const availableSet = new Set(availableVariables);

  // Find missing variables
  const missing = usedArray.filter(v => !availableSet.has(v));

  return {
    valid: missing.length === 0,
    missing,
    used: usedArray
  };
}

/**
 * Strip HTML tags from string (simple implementation)
 * Used to generate plain text from HTML templates
 *
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) {
    return '';
  }

  return html
    // Replace <br> and <p> tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Render template object (subject, HTML, and text)
 *
 * @param {Object} template - Template object with subject, body_html, body_text
 * @param {Object} variables - Key-value pairs of variables
 * @returns {Object} { subject, html, text }
 */
function renderTemplate(template, variables = {}) {
  const subject = render(template.subject, variables);
  const html = render(template.body_html, variables);

  // Use body_text if provided, otherwise generate from HTML
  const text = template.body_text
    ? render(template.body_text, variables)
    : stripHtml(html);

  return { subject, html, text };
}

module.exports = {
  getAvailableVariablesByCategory,
  buildVariableContext,
  render,
  validateVariables,
  stripHtml,
  renderTemplate,
  CATEGORY_VARIABLES
};
