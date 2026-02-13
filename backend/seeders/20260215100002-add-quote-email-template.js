'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if template already exists
    const existing = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM email_templates WHERE slug = 'quote_notification'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0].count > 0) {
      console.log('ℹ️  Quote notification template already exists, skipping');
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert('email_templates', [{
      id: uuidv4(),
      name: 'Notification de devis',
      slug: 'quote_notification',
      category: 'quote',
      description: 'Email envoyé aux clients lors de l\'envoi d\'un devis',
      subject: 'Devis {{quote_number}}{{quote_subject}} - NutriVault',
      body_html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2D6A4F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 24px; background-color: #f9f9f9; }
    .quote-details { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2D6A4F; border-radius: 4px; }
    .quote-details p { margin: 8px 0; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .amount { font-size: 24px; font-weight: bold; color: #2D6A4F; }
    .validity { background-color: #fff3cd; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Devis {{quote_number}}</h1>
    </div>
    <div class="content">
      <p>Bonjour {{client_name}},</p>
      <p>Veuillez trouver ci-joint votre devis.</p>

      <div class="quote-details">
        <p><strong>Numéro :</strong> {{quote_number}}</p>
        <p><strong>Date :</strong> {{quote_date}}</p>
        <p><strong>Montant HT :</strong> {{amount_ht}}</p>
        <p><strong>TVA :</strong> {{amount_tax}}</p>
        <p><strong>Montant TTC :</strong> <span class="amount">{{amount_total}}</span></p>
      </div>

      <div class="validity">
        Ce devis est valable jusqu'au <strong>{{validity_date}}</strong>.
      </div>

      <p>N'hésitez pas à nous contacter pour toute question.</p>
      <p>Cordialement,<br><strong>{{dietitian_name}}</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique. Veuillez ne pas répondre à ce message.</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      body_text: `
Bonjour {{client_name}},

Veuillez trouver ci-joint votre devis.

Numéro : {{quote_number}}
Date : {{quote_date}}
Montant HT : {{amount_ht}}
TVA : {{amount_tax}}
Montant TTC : {{amount_total}}

Ce devis est valable jusqu'au {{validity_date}}.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
{{dietitian_name}}
      `.trim(),
      available_variables: JSON.stringify([
        'client_name',
        'client_first_name',
        'client_last_name',
        'client_company',
        'quote_number',
        'quote_date',
        'validity_date',
        'quote_subject',
        'amount_total',
        'amount_tax',
        'amount_ht',
        'items_count',
        'dietitian_name',
        'dietitian_first_name',
        'dietitian_last_name'
      ]),
      version: 1,
      is_active: true,
      is_system: true,
      created_at: now,
      updated_at: now
    }]);

    console.log('✅ Created quote_notification email template');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('email_templates', {
      slug: 'quote_notification'
    });
  }
};
