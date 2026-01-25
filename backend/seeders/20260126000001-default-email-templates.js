'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: Default Email Templates
 * Sprint 5: US-5.5.2 - Email Templates
 *
 * Migrates hard-coded email templates to database-driven system:
 * 1. Invoice Notification
 * 2. Document Share Notification
 * 3. Payment Reminder
 * 4. Appointment Reminder (US-5.5.4)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const defaultTemplates = [
      // 1. Invoice Notification Template
      {
        id: uuidv4(),
        name: 'Invoice Notification',
        slug: 'invoice_notification',
        category: 'invoice',
        description: 'Email sent to patients when a new invoice is created',
        subject: 'Facture #{{invoice_number}} - NutriVault',
        body_html: `
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
      <h1>Facture #{{invoice_number}}</h1>
    </div>
    <div class="content">
      <p>Bonjour {{patient_first_name}} {{patient_last_name}},</p>
      <p>Veuillez trouver ci-dessous les détails de votre facture :</p>

      <div class="invoice-details">
        <p><strong>Numéro de facture :</strong> {{invoice_number}}</p>
        <p><strong>Date :</strong> {{invoice_date}}</p>
        <p><strong>Date d'échéance :</strong> {{due_date}}</p>
        <hr>
        <p><strong>Service :</strong> {{service_description}}</p>
        <p><strong>Montant total :</strong> <span class="amount">{{amount_total}}</span></p>
        <p><strong>Montant dû :</strong> <span class="amount">{{amount_due}}</span></p>
        <p><strong>Statut :</strong> {{payment_status}}</p>
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
        `.trim(),
        body_text: `
Bonjour {{patient_first_name}} {{patient_last_name}},

Veuillez trouver ci-dessous les détails de votre facture :

Numéro de facture : {{invoice_number}}
Date : {{invoice_date}}
Date d'échéance : {{due_date}}

Service : {{service_description}}
Montant total : {{amount_total}}
Montant dû : {{amount_due}}
Statut : {{payment_status}}

Merci de votre confiance !

Cordialement,
L'équipe NutriVault
        `.trim(),
        available_variables: JSON.stringify([
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
        ]),
        version: 1,
        is_active: true,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // 2. Document Share Notification Template
      {
        id: uuidv4(),
        name: 'Document Share Notification',
        slug: 'document_share_notification',
        category: 'document_share',
        description: 'Email sent to patients when a document is shared with them',
        subject: 'Document partagé : {{document_name}} - NutriVault',
        body_html: `
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
      <p>Bonjour {{patient_first_name}} {{patient_last_name}},</p>
      <p><strong>{{shared_by_first_name}} {{shared_by_last_name}}</strong> a partagé un document avec vous :</p>

      <div class="document-details">
        <p><strong>Document :</strong> {{document_name}}</p>
        <p><strong>Description :</strong> {{document_description}}</p>
        <p><strong>Catégorie :</strong> {{document_category}}</p>
        <p><strong>Date de partage :</strong> {{share_date}}</p>
      </div>

      <p>Vous pouvez accéder à ce document via votre portail patient ou nous contacter pour obtenir de l'aide.</p>
      <p>Cordialement,<br><strong>L'équipe NutriVault</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
        body_text: `
Bonjour {{patient_first_name}} {{patient_last_name}},

{{shared_by_first_name}} {{shared_by_last_name}} a partagé un document avec vous :

Document : {{document_name}}
Description : {{document_description}}
Catégorie : {{document_category}}
Date de partage : {{share_date}}

Vous pouvez accéder à ce document via votre portail patient ou nous contacter pour obtenir de l'aide.

Cordialement,
L'équipe NutriVault
        `.trim(),
        available_variables: JSON.stringify([
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
        ]),
        version: 1,
        is_active: true,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // 3. Payment Reminder Template
      {
        id: uuidv4(),
        name: 'Payment Reminder',
        slug: 'payment_reminder',
        category: 'payment_reminder',
        description: 'Email sent to patients for overdue invoice payments',
        subject: 'Rappel de paiement - Facture #{{invoice_number}}',
        body_html: `
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
      <p>Bonjour {{patient_first_name}} {{patient_last_name}},</p>

      <div class="reminder-box">
        <p style="margin: 0; font-weight: bold;">⚠️ Nous vous rappelons que votre facture suivante est en attente de paiement.</p>
      </div>

      <div class="invoice-details">
        <p><strong>Numéro de facture :</strong> {{invoice_number}}</p>
        <p><strong>Date d'échéance :</strong> {{due_date}}</p>
        <p class="overdue"><strong>Retard :</strong> {{days_overdue}} jour(s)</p>
        <hr>
        <p><strong>Montant dû :</strong> <span class="amount">{{amount_due}}</span></p>
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
        `.trim(),
        body_text: `
Bonjour {{patient_first_name}} {{patient_last_name}},

Nous vous rappelons que votre facture suivante est en attente de paiement :

Numéro de facture : {{invoice_number}}
Date d'échéance : {{due_date}}
Retard : {{days_overdue}} jour(s)

Montant dû : {{amount_due}}

Merci de bien vouloir régulariser votre situation dans les plus brefs délais.

Si vous avez déjà effectué le paiement, veuillez ne pas tenir compte de ce message.

Cordialement,
L'équipe NutriVault
        `.trim(),
        available_variables: JSON.stringify([
          'patient_name',
          'patient_first_name',
          'patient_last_name',
          'invoice_number',
          'due_date',
          'days_overdue',
          'amount_due',
          'invoice_date'
        ]),
        version: 1,
        is_active: true,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // 4. Appointment Reminder Template (US-5.5.4)
      {
        id: uuidv4(),
        name: 'Appointment Reminder',
        slug: 'appointment_reminder',
        category: 'appointment_reminder',
        description: 'Automated reminder email sent before scheduled appointments',
        subject: 'Rappel : Rendez-vous avec {{dietitian_name}} le {{appointment_date}}',
        body_html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .appointment-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .unsubscribe { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Rappel de rendez-vous</h1>
    </div>
    <div class="content">
      <p>Bonjour {{patient_first_name}},</p>
      <p>Nous vous rappelons votre rendez-vous :</p>

      <div class="appointment-box">
        <p><strong>📅 Date :</strong> {{appointment_date}}</p>
        <p><strong>⏰ Heure :</strong> {{appointment_time}}</p>
        <p><strong>👤 Avec :</strong> {{dietitian_name}}</p>
        <p><strong>📍 Type :</strong> {{visit_type}}</p>
      </div>

      <p>Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prévenir au plus vite.</p>
      <p>Nous nous réjouissons de vous voir !</p>

      <p>Cordialement,<br><strong>{{dietitian_name}}</strong></p>

      <div class="unsubscribe">
        <p>Vous ne souhaitez plus recevoir de rappels de rendez-vous ?<br>
        <a href="{{unsubscribe_link}}" style="color: #999;">Se désabonner des rappels de rendez-vous</a></p>
      </div>
    </div>
  </div>
</body>
</html>
        `.trim(),
        body_text: `
Rappel de rendez-vous

Bonjour {{patient_first_name}},

Nous vous rappelons votre rendez-vous :

📅 Date : {{appointment_date}}
⏰ Heure : {{appointment_time}}
👤 Avec : {{dietitian_name}}
📍 Type : {{visit_type}}

Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prévenir au plus vite.

Nous nous réjouissons de vous voir !

Cordialement,
{{dietitian_name}}

---
Se désabonner des rappels de rendez-vous : {{unsubscribe_link}}
        `.trim(),
        available_variables: JSON.stringify([
          'patient_first_name',
          'patient_last_name',
          'patient_name',
          'appointment_date',
          'appointment_time',
          'appointment_datetime',
          'dietitian_name',
          'dietitian_first_name',
          'dietitian_last_name',
          'visit_type',
          'unsubscribe_link'
        ]),
        version: 1,
        is_active: true,
        is_system: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('email_templates', defaultTemplates);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('email_templates', {
      slug: [
        'invoice_notification',
        'document_share_notification',
        'payment_reminder',
        'appointment_reminder'
      ]
    });
  }
};
