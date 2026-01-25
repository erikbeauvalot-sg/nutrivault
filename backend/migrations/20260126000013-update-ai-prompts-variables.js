'use strict';

/**
 * Migration to update AI prompts to use new variable names
 * Replaces old clinical field variables (chief_complaint, assessment, recommendations, notes)
 * with new visit custom fields variables (visit_custom_fields, visit_measurements)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update French follow-up prompt
    const frUserPromptTemplate = `Génère un email de suivi pour:

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

{{#if custom_fields}}
DONNÉES PATIENT (CHAMPS PERSONNALISÉS):
{{custom_fields}}
{{/if}}

{{#if measures}}
ÉVOLUTION DES MESURES DU PATIENT:
{{measures}}
{{/if}}

{{#if next_visit_date}}
PROCHAIN RENDEZ-VOUS: {{next_visit_date}}
{{/if}}

TON SOUHAITÉ: {{tone}}`;

    const frAvailableVariables = JSON.stringify([
      'patient_name',
      'dietitian_name',
      'visit_date',
      'visit_type',
      'visit_custom_fields',
      'visit_measurements',
      'custom_fields',
      'measures',
      'next_visit_date',
      'tone'
    ]);

    // Update English follow-up prompt
    const enUserPromptTemplate = `Generate a follow-up email for:

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

{{#if custom_fields}}
PATIENT DATA (CUSTOM FIELDS):
{{custom_fields}}
{{/if}}

{{#if measures}}
PATIENT MEASURES EVOLUTION:
{{measures}}
{{/if}}

{{#if next_visit_date}}
NEXT APPOINTMENT: {{next_visit_date}}
{{/if}}

DESIRED TONE: {{tone}}`;

    const enAvailableVariables = JSON.stringify([
      'patient_name',
      'dietitian_name',
      'visit_date',
      'visit_type',
      'visit_custom_fields',
      'visit_measurements',
      'custom_fields',
      'measures',
      'next_visit_date',
      'tone'
    ]);

    // Update French prompt
    await queryInterface.sequelize.query(`
      UPDATE ai_prompts
      SET user_prompt_template = :template,
          available_variables = :variables,
          version = version + 1,
          updated_at = datetime('now')
      WHERE usage = 'followup' AND language_code = 'fr'
    `, {
      replacements: { template: frUserPromptTemplate, variables: frAvailableVariables }
    });

    // Update English prompt
    await queryInterface.sequelize.query(`
      UPDATE ai_prompts
      SET user_prompt_template = :template,
          available_variables = :variables,
          version = version + 1,
          updated_at = datetime('now')
      WHERE usage = 'followup' AND language_code = 'en'
    `, {
      replacements: { template: enUserPromptTemplate, variables: enAvailableVariables }
    });

    console.log('Updated AI prompts with new visit custom fields variables');
  },

  async down(queryInterface, Sequelize) {
    // Restore old French prompt template
    const frUserPromptTemplate = `Génère un email de suivi pour:

PATIENT: {{patient_name}}
DIÉTÉTICIEN: {{dietitian_name}}
DATE DE CONSULTATION: {{visit_date}}
TYPE DE VISITE: {{visit_type}}

{{#if chief_complaint}}
MOTIF DE CONSULTATION:
{{chief_complaint}}
{{/if}}

{{#if assessment}}
ÉVALUATION:
{{assessment}}
{{/if}}

{{#if recommendations}}
RECOMMANDATIONS:
{{recommendations}}
{{/if}}

{{#if notes}}
NOTES ADDITIONNELLES:
{{notes}}
{{/if}}

{{#if custom_fields}}
DONNÉES PATIENT (CHAMPS PERSONNALISÉS):
{{custom_fields}}
{{/if}}

{{#if measures}}
MESURES/MÉTRIQUES DU PATIENT:
{{measures}}
{{/if}}

{{#if next_visit_date}}
PROCHAIN RENDEZ-VOUS: {{next_visit_date}}
{{/if}}

TON SOUHAITÉ: {{tone}}`;

    const frAvailableVariables = JSON.stringify([
      'patient_name',
      'dietitian_name',
      'visit_date',
      'visit_type',
      'chief_complaint',
      'assessment',
      'recommendations',
      'notes',
      'next_visit_date',
      'tone',
      'custom_fields',
      'measures'
    ]);

    // Restore old English prompt template
    const enUserPromptTemplate = `Generate a follow-up email for:

PATIENT: {{patient_name}}
DIETITIAN: {{dietitian_name}}
CONSULTATION DATE: {{visit_date}}
VISIT TYPE: {{visit_type}}

{{#if chief_complaint}}
REASON FOR CONSULTATION:
{{chief_complaint}}
{{/if}}

{{#if assessment}}
ASSESSMENT:
{{assessment}}
{{/if}}

{{#if recommendations}}
RECOMMENDATIONS:
{{recommendations}}
{{/if}}

{{#if notes}}
ADDITIONAL NOTES:
{{notes}}
{{/if}}

{{#if custom_fields}}
PATIENT DATA (CUSTOM FIELDS):
{{custom_fields}}
{{/if}}

{{#if measures}}
PATIENT MEASURES/METRICS:
{{measures}}
{{/if}}

{{#if next_visit_date}}
NEXT APPOINTMENT: {{next_visit_date}}
{{/if}}

DESIRED TONE: {{tone}}`;

    const enAvailableVariables = JSON.stringify([
      'patient_name',
      'dietitian_name',
      'visit_date',
      'visit_type',
      'chief_complaint',
      'assessment',
      'recommendations',
      'notes',
      'next_visit_date',
      'tone',
      'custom_fields',
      'measures'
    ]);

    // Restore French prompt
    await queryInterface.sequelize.query(`
      UPDATE ai_prompts
      SET user_prompt_template = :template,
          available_variables = :variables,
          updated_at = datetime('now')
      WHERE usage = 'followup' AND language_code = 'fr'
    `, {
      replacements: { template: frUserPromptTemplate, variables: frAvailableVariables }
    });

    // Restore English prompt
    await queryInterface.sequelize.query(`
      UPDATE ai_prompts
      SET user_prompt_template = :template,
          available_variables = :variables,
          updated_at = datetime('now')
      WHERE usage = 'followup' AND language_code = 'en'
    `, {
      replacements: { template: enUserPromptTemplate, variables: enAvailableVariables }
    });
  }
};
