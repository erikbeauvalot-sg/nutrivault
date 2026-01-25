'use strict';

/**
 * Migration to add patient_custom_fields and patient_measures variables to AI prompts
 * These variables provide patient-level data separate from visit-specific data
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

TON SOUHAITÉ: {{tone}}`;

    const frAvailableVariables = JSON.stringify([
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

DESIRED TONE: {{tone}}`;

    const enAvailableVariables = JSON.stringify([
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

    console.log('Added patient_custom_fields and patient_measures variables to AI prompts');
  },

  async down(queryInterface, Sequelize) {
    // Restore previous version without patient-specific variables
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

    await queryInterface.sequelize.query(`
      UPDATE ai_prompts
      SET user_prompt_template = :template,
          available_variables = :variables,
          updated_at = datetime('now')
      WHERE usage = 'followup' AND language_code = 'fr'
    `, {
      replacements: { template: frUserPromptTemplate, variables: frAvailableVariables }
    });

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
