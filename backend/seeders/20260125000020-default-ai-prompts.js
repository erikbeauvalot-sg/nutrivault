'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if AI prompts already exist
    const existingPrompts = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM ai_prompts",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingPrompts[0].count > 0) {
      console.log('ℹ️  AI prompts already exist, skipping seed');
      return;
    }

    const now = new Date();

    const defaultPrompts = [
      // French follow-up prompt
      {
        id: uuidv4(),
        usage: 'followup',
        name: 'Suivi post-consultation',
        description: 'Email de suivi envoyé aux patients après une consultation',
        language_code: 'fr',
        system_prompt: `Tu es un assistant pour un diététicien professionnel.
Génère un email de suivi personnalisé pour un patient après sa consultation.

IMPORTANT - CONFIDENTIALITÉ (RGPD):
- Le nom du patient est anonymisé ("Le patient") - utilise "vous" dans l'email
- Les données patient (mesures, champs personnalisés) sont fournies sans identité
- Le praticien ajoutera le vrai nom lors de l'envoi

INSTRUCTIONS:
- Utilise un ton {{tone}} (professionnel/amical/formel)
- L'email doit être en français
- Structure la réponse en JSON valide uniquement
- Sois chaleureux et encourageant
- Intègre les mesures et données patient si disponibles
- Motive le patient dans son parcours

FORMAT DE SORTIE (JSON uniquement, pas de texte avant ou après):
{
  "subject": "Objet de l'email",
  "greeting": "Salutation personnalisée",
  "summary": "Résumé de la consultation (2-3 phrases)",
  "keyPoints": ["Point clé 1", "Point clé 2"],
  "recommendations": "Recommandations détaillées",
  "nextSteps": ["Étape 1", "Étape 2"],
  "closing": "Message de clôture chaleureux",
  "signature": "Signature professionnelle"
}`,
        user_prompt_template: `Génère un email de suivi pour:

PATIENT: {{patient_name}}
DIÉTÉTICIEN: {{dietitian_name}}
DATE DE CONSULTATION: {{visit_date}}
TYPE DE VISITE: {{visit_type}}

{{#if visit_custom_fields}}
NOTES ET INFORMATIONS DE LA VISITE:
{{visit_custom_fields}}
{{/if}}

{{#if visit_measurements}}
MESURES DE LA VISITE:
{{visit_measurements}}
{{/if}}

{{#if patient_custom_fields}}
PROFIL DU PATIENT (CHAMPS PERSONNALISÉS):
{{patient_custom_fields}}
{{/if}}

{{#if patient_measures}}
HISTORIQUE DES MESURES DU PATIENT:
{{patient_measures}}
{{/if}}

{{#if next_visit_date}}
PROCHAIN RENDEZ-VOUS: {{next_visit_date}}
{{/if}}

TON SOUHAITÉ: {{tone}}`,
        available_variables: JSON.stringify([
          'patient_name',
          'dietitian_name',
          'visit_date',
          'visit_type',
          'visit_custom_fields',
          'visit_measurements',
          'patient_custom_fields',
          'patient_measures',
          'next_visit_date',
          'tone'
        ]),
        is_active: true,
        is_default: true,
        version: 1,
        created_at: now,
        updated_at: now
      },
      // English follow-up prompt
      {
        id: uuidv4(),
        usage: 'followup',
        name: 'Post-consultation follow-up',
        description: 'Follow-up email sent to patients after a consultation',
        language_code: 'en',
        system_prompt: `You are an assistant for a professional dietitian.
Generate a personalized follow-up email for a patient after their consultation.

IMPORTANT - PRIVACY (GDPR):
- The patient's name is anonymized ("The patient") - use "you" in the email
- Patient data (measures, custom fields) is provided without identity
- The practitioner will add the real name when sending

INSTRUCTIONS:
- Use a {{tone}} tone (professional/friendly/formal)
- The email must be in English
- Structure the response as valid JSON only
- Be warm and encouraging
- Integrate measures and patient data if available
- Motivate the patient in their journey

OUTPUT FORMAT (JSON only, no text before or after):
{
  "subject": "Email subject",
  "greeting": "Personalized greeting",
  "summary": "Summary of the consultation (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2"],
  "recommendations": "Detailed recommendations",
  "nextSteps": ["Step 1", "Step 2"],
  "closing": "Warm closing message",
  "signature": "Professional signature"
}`,
        user_prompt_template: `Generate a follow-up email for:

PATIENT: {{patient_name}}
DIETITIAN: {{dietitian_name}}
CONSULTATION DATE: {{visit_date}}
VISIT TYPE: {{visit_type}}

{{#if visit_custom_fields}}
VISIT NOTES AND INFORMATION:
{{visit_custom_fields}}
{{/if}}

{{#if visit_measurements}}
VISIT MEASUREMENTS:
{{visit_measurements}}
{{/if}}

{{#if patient_custom_fields}}
PATIENT PROFILE (CUSTOM FIELDS):
{{patient_custom_fields}}
{{/if}}

{{#if patient_measures}}
PATIENT MEASURES HISTORY:
{{patient_measures}}
{{/if}}

{{#if next_visit_date}}
NEXT APPOINTMENT: {{next_visit_date}}
{{/if}}

DESIRED TONE: {{tone}}`,
        available_variables: JSON.stringify([
          'patient_name',
          'dietitian_name',
          'visit_date',
          'visit_type',
          'visit_custom_fields',
          'visit_measurements',
          'patient_custom_fields',
          'patient_measures',
          'next_visit_date',
          'tone'
        ]),
        is_active: true,
        is_default: true,
        version: 1,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('ai_prompts', defaultPrompts);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('ai_prompts', {
      usage: 'followup'
    });
  }
};
