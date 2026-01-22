/**
 * Email Service
 * Handles email sending using Nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');

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
 * @returns {Promise<Object>} Email send result
 */
async function sendEmail({ to, subject, text, html, from }) {
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
Date : ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
Date d'échéance : ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'N/A'}

Service : ${invoice.service_description}
Montant total : ${invoice.amount_total.toFixed(2)} €
Montant dû : ${invoice.amount_due.toFixed(2)} €
Statut : ${invoice.status}

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
        <p><strong>Date :</strong> ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Date d'échéance :</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
        <hr>
        <p><strong>Service :</strong> ${invoice.service_description}</p>
        <p><strong>Montant total :</strong> <span class="amount">${invoice.amount_total.toFixed(2)} €</span></p>
        <p><strong>Montant dû :</strong> <span class="amount">${invoice.amount_due.toFixed(2)} €</span></p>
        <p><strong>Statut :</strong> ${invoice.status}</p>
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

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendDocumentShareEmail,
  verifyEmailConfig
};
