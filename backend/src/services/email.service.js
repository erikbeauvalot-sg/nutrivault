/**
 * Email Service
 * Handles email sending using Nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');
const { getTemplateBySlug } = require('./emailTemplate.service');
const { renderTemplate, buildVariableContext } = require('./templateRenderer.service');
const { generateInvoicePDF } = require('./invoicePDF.service');
const emailTemplateTranslationService = require('./emailTemplateTranslation.service');
const db = require('../../../models');
const EmailLog = db.EmailLog;
const { formatDate } = require('../utils/timezone');

/**
 * Translate invoice status to French
 */
const translateInvoiceStatus = (status) => {
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
 * Create and configure email transporter
 * Uses Gmail SMTP with environment variables
 */
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // For development - remove in production with valid certificates
    }
  });
};

/**
 * Send a generic email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} options.from - Sender email (optional)
 * @param {Array} options.attachments - Email attachments (optional)
 * @param {Object} options.icalEvent - iCalendar event for calendar invitations (optional)
 * @returns {Promise<Object>} Email send result
 */
async function sendEmail({ to, subject, text, html, from, attachments, icalEvent }) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('📧 Email not sent (service not configured):', { to, subject });
      return {
        success: false,
        message: 'Email service not configured',
        mock: true
      };
    }

    const mailOptions = {
      from: from || `"${process.env.EMAIL_FROM_NAME || 'NutriVault'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    // Add iCalendar event for calendar invitations (Gmail will recognize this)
    if (icalEvent) {
      mailOptions.icalEvent = icalEvent;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', {
      to,
      subject,
      messageId: info.messageId
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Send invoice email to patient
 * @param {Object} invoice - Invoice object with patient info
 * @param {Object} patient - Patient object
 * @returns {Promise<Object>} Email send result
 */
async function sendInvoiceEmail(invoice, patient) {
  const subject = `Facture #${invoice.invoice_number} - NutriVault`;

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

Veuillez trouver ci-dessous les détails de votre facture :

Numéro de facture : ${invoice.invoice_number}
Date : ${formatDate(invoice.invoice_date, 'fr')}
Date d'échéance : ${invoice.due_date ? formatDate(invoice.due_date, 'fr') : 'N/A'}

Service : ${invoice.service_description}
Montant total : ${invoice.amount_total.toFixed(2)} €
Montant dû : ${invoice.amount_due.toFixed(2)} €
Statut : ${translateInvoiceStatus(invoice.status)}

Merci de votre confiance !

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Facture #${invoice.invoice_number}</h1>
    </div>
    <div class="content">
      <p>Bonjour ${patient.first_name} ${patient.last_name},</p>
      <p>Veuillez trouver ci-dessous les détails de votre facture :</p>

      <div class="invoice-details">
        <p><strong>Numéro de facture :</strong> ${invoice.invoice_number}</p>
        <p><strong>Date :</strong> ${formatDate(invoice.invoice_date, 'fr')}</p>
        <p><strong>Date d'échéance :</strong> ${invoice.due_date ? formatDate(invoice.due_date, 'fr') : 'N/A'}</p>
        <hr>
        <p><strong>Service :</strong> ${invoice.service_description}</p>
        <p><strong>Montant total :</strong> <span class="amount">${invoice.amount_total.toFixed(2)} €</span></p>
        <p><strong>Montant dû :</strong> <span class="amount">${invoice.amount_due.toFixed(2)} €</span></p>
        <p><strong>Statut :</strong> ${translateInvoiceStatus(invoice.status)}</p>
      </div>

      <p>Merci de votre confiance !</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html
  });
}

/**
 * Send document share notification to patient
 * @param {Object} document - Document object
 * @param {Object} patient - Patient object
 * @param {Object} sharedBy - User who shared the document
 * @param {string} notes - Optional notes about the sharing
 * @returns {Promise<Object>} Email send result
 */
async function sendDocumentShareEmail(document, patient, sharedBy, notes = null) {
  const subject = `Document partagé : ${document.file_name} - NutriVault`;

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

${sharedBy.first_name} ${sharedBy.last_name} a partagé un document avec vous :

Document : ${document.file_name}
${document.description ? `Description : ${document.description}` : ''}
${document.category ? `Catégorie : ${document.category}` : ''}
${notes ? `\nNote : ${notes}` : ''}

Vous pouvez accéder à ce document via votre portail patient ou nous contacter pour obtenir de l'aide.

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .document-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .note { background-color: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Document partagé</h1>
    </div>
    <div class="content">
      <p>Bonjour ${patient.first_name} ${patient.last_name},</p>
      <p><strong>${sharedBy.first_name} ${sharedBy.last_name}</strong> a partagé un document avec vous :</p>

      <div class="document-details">
        <p><strong>Document :</strong> ${document.file_name}</p>
        ${document.description ? `<p><strong>Description :</strong> ${document.description}</p>` : ''}
        ${document.category ? `<p><strong>Catégorie :</strong> ${document.category}</p>` : ''}
        ${document.tags && document.tags.length > 0 ? `<p><strong>Tags :</strong> ${document.tags.join(', ')}</p>` : ''}
      </div>

      ${notes ? `<div class="note"><strong>Note :</strong> ${notes}</div>` : ''}

      <p>Vous pouvez accéder à ce document via votre portail patient ou nous contacter pour obtenir de l'aide.</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html
  });
}

/**
 * Verify email configuration
 * @returns {Promise<boolean>} True if email is configured and working
 */
async function verifyEmailConfig() {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return false;
    }

    await transporter.verify();
    console.log('✅ Email service is configured and ready');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error.message);
    return false;
  }
}

/**
 * Send payment reminder email for overdue invoice
 * @param {Object} invoice - Invoice object with patient info
 * @param {Object} patient - Patient object
 * @returns {Promise<Object>} Email send result
 */
async function sendPaymentReminderEmail(invoice, patient) {
  const daysOverdue = invoice.due_date
    ? Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))
    : 0;

  const subject = `Rappel de paiement - Facture #${invoice.invoice_number}`;

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

Nous vous rappelons que votre facture suivante est en attente de paiement :

Numéro de facture : ${invoice.invoice_number}
Date d'échéance : ${invoice.due_date ? formatDate(invoice.due_date, 'fr') : 'N/A'}
${daysOverdue > 0 ? `Retard : ${daysOverdue} jour(s)` : ''}

Montant dû : ${invoice.amount_due.toFixed(2)} €

Merci de bien vouloir régulariser votre situation dans les plus brefs délais.

Si vous avez déjà effectué le paiement, veuillez ne pas tenir compte de ce message.

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .reminder-box { background-color: #fff3cd; border: 2px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .amount { font-size: 24px; font-weight: bold; color: #ff9800; }
    .overdue { color: #d32f2f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Rappel de paiement</h1>
    </div>
    <div class="content">
      <p>Bonjour ${patient.first_name} ${patient.last_name},</p>

      <div class="reminder-box">
        <p style="margin: 0; font-weight: bold;">⚠️ Nous vous rappelons que votre facture suivante est en attente de paiement.</p>
      </div>

      <div class="invoice-details">
        <p><strong>Numéro de facture :</strong> ${invoice.invoice_number}</p>
        <p><strong>Date d'échéance :</strong> ${invoice.due_date ? formatDate(invoice.due_date, 'fr') : 'N/A'}</p>
        ${daysOverdue > 0 ? `<p class="overdue"><strong>Retard :</strong> ${daysOverdue} jour(s)</p>` : ''}
        <hr>
        <p><strong>Montant dû :</strong> <span class="amount">${invoice.amount_due.toFixed(2)} €</span></p>
      </div>

      <p>Merci de bien vouloir régulariser votre situation dans les plus brefs délais.</p>
      <p><em>Si vous avez déjà effectué le paiement, veuillez ne pas tenir compte de ce message.</em></p>

      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: patient.email,
    subject,
    text,
    html
  });
}

/**
 * Send email using a template
 * Supports multi-language: automatically selects patient's preferred language
 *
 * @param {Object} options - Email options
 * @param {string} options.templateSlug - Template slug to use
 * @param {string} options.to - Recipient email address
 * @param {Object} options.variables - Raw data objects (patient, invoice, etc.)
 * @param {Object} options.patient - Patient object (for logging and language preference)
 * @param {Object} options.user - User sending the email (for logging)
 * @param {string} options.from - Sender email (optional)
 * @param {Array} options.attachments - Email attachments (optional)
 * @param {string} options.languageCode - Override language code (optional)
 * @param {string} options.visitId - Visit ID for linking email to visit (optional)
 * @param {string} options.billingId - Billing ID for linking email to invoice (optional)
 * @returns {Promise<Object>} Email send result with log entry
 */
async function sendEmailFromTemplate({
  templateSlug,
  to,
  variables = {},
  patient = null,
  user = null,
  from = null,
  attachments = null,
  languageCode = null,
  visitId = null,
  billingId = null
}) {
  try {
    // Get template
    const template = await getTemplateBySlug(templateSlug);

    if (!template.is_active) {
      throw new Error(`Template '${templateSlug}' is not active`);
    }

    // Determine language: explicit override > patient preference > default
    const preferredLanguage = languageCode || patient?.language_preference || null;

    // Get template content in the appropriate language
    let templateContent;
    let languageUsed = null;

    if (preferredLanguage) {
      try {
        templateContent = await emailTemplateTranslationService.getTemplateInLanguage(
          template.id,
          preferredLanguage
        );
        languageUsed = templateContent.language_used;
      } catch (translationError) {
        console.warn(`⚠️ Translation lookup failed, using base template:`, translationError.message);
        templateContent = {
          subject: template.subject,
          body_html: template.body_html,
          body_text: template.body_text
        };
      }
    } else {
      templateContent = {
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text
      };
    }

    // Build variable context from raw data objects
    const variableContext = buildVariableContext(variables);

    // Create a mock template object for rendering
    const templateToRender = {
      subject: templateContent.subject,
      body_html: templateContent.body_html,
      body_text: templateContent.body_text
    };

    // Render template
    const { subject, html, text } = renderTemplate(templateToRender, variableContext);

    // Determine email type from template slug/category
    const getEmailTypeFromTemplate = (slug, category) => {
      if (slug.includes('invoice') || slug.includes('facture')) return 'invoice';
      if (slug.includes('reminder') || slug.includes('rappel')) return 'reminder';
      if (slug.includes('payment') || slug.includes('relance')) return 'payment_reminder';
      if (slug.includes('welcome') || slug.includes('bienvenue')) return 'welcome';
      if (slug.includes('followup') || slug.includes('suivi')) return 'followup';
      if (category === 'billing') return 'invoice';
      if (category === 'reminder') return 'reminder';
      return 'other';
    };

    // Create email log entry (before sending)
    const emailLog = await EmailLog.create({
      template_id: template.id,
      template_slug: templateSlug,
      email_type: getEmailTypeFromTemplate(templateSlug, template.category),
      sent_to: to,
      patient_id: patient?.id || null,
      visit_id: visitId || null,
      billing_id: billingId || null,
      subject,
      body_html: html,
      body_text: text,
      variables_used: variableContext,
      status: 'queued',
      sent_by: user?.id || null,
      language_code: languageUsed
    });

    try {
      // Send email
      const result = await sendEmail({
        to,
        subject,
        text,
        html,
        from,
        attachments
      });

      // Update log entry on success
      await emailLog.update({
        status: 'sent',
        sent_at: new Date()
      });

      return {
        ...result,
        logId: emailLog.id,
        templateSlug,
        subject,
        languageUsed
      };
    } catch (error) {
      // Update log entry on failure
      await emailLog.update({
        status: 'failed',
        error_message: error.message,
        sent_at: new Date()
      });

      throw error;
    }
  } catch (error) {
    console.error(`❌ Error sending email from template '${templateSlug}':`, error);
    throw error;
  }
}

/**
 * Send document as email attachment to patient
 * @param {Object} document - Document object
 * @param {Object} patient - Patient object
 * @param {Object} sharedBy - User who is sending the document
 * @param {string} filePath - Full path to the document file
 * @param {string} message - Optional custom message
 * @returns {Promise<Object>} Email send result
 */
async function sendDocumentAsAttachment(document, patient, sharedBy, filePath, message = null) {
  const subject = `Document : ${document.file_name} - NutriVault`;

  const customMessage = message ? `<p style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Message :</strong><br>${message.replace(/\n/g, '<br>')}</p>` : '';
  const customMessageText = message ? `\nMessage :\n${message}\n` : '';

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

${sharedBy.first_name} ${sharedBy.last_name} vous envoie le document suivant en pièce jointe :

Document : ${document.file_name}
${document.description ? `Description : ${document.description}` : ''}
${customMessageText}
Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .document-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .attachment-notice { background-color: #e8f5e9; border: 1px solid #4CAF50; padding: 10px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📎 Document en pièce jointe</h1>
    </div>
    <div class="content">
      <p>Bonjour ${patient.first_name} ${patient.last_name},</p>
      <p><strong>${sharedBy.first_name} ${sharedBy.last_name}</strong> vous envoie le document suivant en pièce jointe :</p>

      <div class="document-details">
        <p><strong>📄 Document :</strong> ${document.file_name}</p>
        ${document.description ? `<p><strong>Description :</strong> ${document.description}</p>` : ''}
      </div>

      ${customMessage}

      <div class="attachment-notice">
        <strong>📎 Pièce jointe :</strong> ${document.file_name}
      </div>

      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const attachments = [
    {
      filename: document.file_name,
      path: filePath,
      contentType: document.mime_type
    }
  ];

  // Create email log entry before sending
  const emailLog = await EmailLog.create({
    template_slug: 'document_attachment',
    email_type: 'document',
    sent_to: patient.email,
    patient_id: patient.id,
    subject,
    body_html: html,
    body_text: text,
    variables_used: {
      document_id: document.id,
      document_name: document.file_name,
      has_attachment: true
    },
    status: 'queued',
    sent_by: sharedBy.id
  });

  try {
    const result = await sendEmail({
      to: patient.email,
      subject,
      text,
      html,
      attachments
    });

    // Update log entry on success
    await emailLog.update({
      status: 'sent',
      sent_at: new Date()
    });

    return {
      ...result,
      logId: emailLog.id
    };
  } catch (error) {
    // Update log entry on failure
    await emailLog.update({
      status: 'failed',
      error_message: error.message,
      sent_at: new Date()
    });

    throw error;
  }
}

/**
 * Send recipe share notification to patient with PDF attachment
 * @param {Object} recipe - Recipe object
 * @param {Object} patient - Patient object
 * @param {Object} sharedBy - User who shared the recipe
 * @param {string} notes - Optional notes about the sharing
 * @returns {Promise<Object>} Email send result
 */
async function sendRecipeShareEmail(recipe, patient, sharedBy, notes = null) {
  const { generateRecipePDF } = require('./recipePDF.service');

  const subject = `Recette partagée : ${recipe.title} - NutriVault`;

  const difficultyLabels = {
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile'
  };

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  const text = `
Bonjour ${patient.first_name} ${patient.last_name},

${sharedBy.first_name} ${sharedBy.last_name} a partagé une recette avec vous :

Recette : ${recipe.title}
${recipe.description ? `Description : ${recipe.description}` : ''}
${recipe.servings ? `Portions : ${recipe.servings}` : ''}
${totalTime > 0 ? `Temps total : ${totalTime} min` : ''}
${recipe.difficulty ? `Difficulté : ${difficultyLabels[recipe.difficulty] || recipe.difficulty}` : ''}
${notes ? `\nNote de votre diététicien(ne) : ${notes}` : ''}

Vous trouverez la recette complète en pièce jointe (PDF).

Cette recette a été spécialement sélectionnée pour vous par votre diététicien(ne).

Cordialement,
L'équipe NutriVault
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .recipe-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FF9800; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .note { background-color: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; border-left: 3px solid #2196F3; }
    .meta-info { display: flex; gap: 15px; margin: 10px 0; color: #666; }
    .meta-item { display: inline-block; }
    .attachment-notice { background-color: #e8f5e9; border: 1px solid #4CAF50; padding: 10px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍽️ Recette partagée</h1>
    </div>
    <div class="content">
      <p>Bonjour ${patient.first_name} ${patient.last_name},</p>
      <p><strong>${sharedBy.first_name} ${sharedBy.last_name}</strong> a partagé une recette avec vous :</p>

      <div class="recipe-details">
        <h2 style="margin-top: 0; color: #FF9800;">${recipe.title}</h2>
        ${recipe.description ? `<p>${recipe.description}</p>` : ''}
        <div class="meta-info">
          ${recipe.servings ? `<span class="meta-item">👥 ${recipe.servings} portions</span>` : ''}
          ${totalTime > 0 ? `<span class="meta-item">⏱️ ${totalTime} min</span>` : ''}
          ${recipe.difficulty ? `<span class="meta-item">📊 ${difficultyLabels[recipe.difficulty] || recipe.difficulty}</span>` : ''}
        </div>
      </div>

      ${notes ? `<div class="note"><strong>💬 Note de votre diététicien(ne) :</strong><br>${notes}</div>` : ''}

      <div class="attachment-notice">
        <strong>📎 Pièce jointe :</strong> Recette complète en PDF
      </div>

      <p>Cette recette a été spécialement sélectionnée pour vous par votre diététicien(ne).</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Generate PDF attachment
  let attachments = [];
  try {
    const pdfDoc = await generateRecipePDF(recipe.id, 'fr', notes);

    // Collect PDF data into buffer
    const chunks = [];
    await new Promise((resolve, reject) => {
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Sanitize filename
    const safeTitle = recipe.title
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    attachments = [{
      filename: `Recette_${safeTitle}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];

    console.log(`[RecipeShareEmail] PDF generated for recipe "${recipe.title}" (${pdfBuffer.length} bytes)`);
  } catch (pdfError) {
    // Log error but continue sending email without attachment
    console.error('[RecipeShareEmail] Failed to generate PDF attachment:', pdfError.message);
  }

  // Create email log entry
  const emailLog = await EmailLog.create({
    template_slug: 'recipe_share',
    email_type: 'recipe',
    sent_to: patient.email,
    patient_id: patient.id,
    subject,
    body_html: html,
    body_text: text,
    variables_used: {
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      has_attachment: attachments.length > 0
    },
    status: 'queued',
    sent_by: sharedBy.id
  });

  try {
    const result = await sendEmail({
      to: patient.email,
      subject,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    // Update log entry on success
    await emailLog.update({
      status: 'sent',
      sent_at: new Date()
    });

    return {
      ...result,
      logId: emailLog.id
    };
  } catch (error) {
    // Update log entry on failure
    await emailLog.update({
      status: 'failed',
      error_message: error.message,
      sent_at: new Date()
    });

    throw error;
  }
}

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendDocumentShareEmail,
  sendRecipeShareEmail,
  sendDocumentAsAttachment,
  sendPaymentReminderEmail,
  verifyEmailConfig,
  sendEmailFromTemplate
};
