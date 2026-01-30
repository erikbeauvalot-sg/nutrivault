'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Add Appointment Invitation Template
 *
 * This template is used for calendar invitations (ICS) that Gmail
 * recognizes and displays as interactive calendar events.
 * Different from appointment_reminder which is a simple email notification.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the template already exists
    const existingTemplate = await queryInterface.sequelize.query(
      "SELECT id FROM email_templates WHERE slug = 'appointment_invitation' OR category = 'appointment_invitation'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingTemplate.length > 0) {
      console.log('Appointment invitation template already exists, skipping');
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert('email_templates', [{
      id: uuidv4(),
      name: 'Invitation Calendrier',
      slug: 'appointment_invitation',
      category: 'appointment_invitation',
      description: 'Invitation calendrier avec fichier ICS integre - reconnu par Gmail, Outlook, etc.',
      subject: 'Invitation : Rendez-vous avec {{dietitian_name}} le {{appointment_date}}',
      body_html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .appointment-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2196F3; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .calendar-note { background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invitation de rendez-vous</h1>
    </div>
    <div class="content">
      <p>Bonjour {{patient_first_name}},</p>
      <p>Vous avez un nouveau rendez-vous :</p>

      <div class="appointment-box">
        <p><strong>Date :</strong> {{appointment_date}}</p>
        <p><strong>Heure :</strong> {{appointment_time}}</p>
        <p><strong>Avec :</strong> {{dietitian_name}}</p>
        <p><strong>Type :</strong> {{visit_type}}</p>
      </div>

      <div class="calendar-note">
        <p><strong>Cette invitation contient un fichier calendrier.</strong></p>
        <p>Gmail, Outlook et la plupart des applications de messagerie vous permettent d'ajouter ce rendez-vous directement a votre agenda.</p>
      </div>

      <p>Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prevenir au plus vite.</p>
      <p>Nous nous rejouissons de vous voir !</p>

      <p>Cordialement,<br><strong>{{dietitian_name}}</strong></p>
    </div>
    <div class="footer">
      <p>Ceci est un email automatique.</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      body_text: `
Invitation de rendez-vous

Bonjour {{patient_first_name}},

Vous avez un nouveau rendez-vous :

Date : {{appointment_date}}
Heure : {{appointment_time}}
Avec : {{dietitian_name}}
Type : {{visit_type}}

Cette invitation contient un fichier calendrier.
Gmail, Outlook et la plupart des applications de messagerie vous permettent d'ajouter ce rendez-vous directement a votre agenda.

Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prevenir au plus vite.

Nous nous rejouissons de vous voir !

Cordialement,
{{dietitian_name}}
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
        'visit_type'
      ]),
      version: 1,
      is_active: true,
      is_system: true,
      created_at: now,
      updated_at: now
    }]);

    console.log('Appointment invitation template created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('email_templates', {
      slug: 'appointment_invitation'
    });
  }
};
