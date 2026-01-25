'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Seed default custom field categories and definitions
 * Creates essential patient data fields that were removed from the patients table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if already seeded
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM custom_field_categories",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.count > 0) {
      console.log('ℹ️  Custom fields already exist, skipping');
      return;
    }

    const now = new Date();

    // Create categories (only columns that exist in the table)
    const categories = [
      {
        id: uuidv4(),
        name: 'Informations personnelles',
        description: 'Informations de base du patient',
        display_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Coordonnées',
        description: 'Adresse et contacts',
        display_order: 2,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Informations médicales',
        description: 'Antécédents et conditions médicales',
        display_order: 3,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Habitudes alimentaires',
        description: 'Préférences et restrictions alimentaires',
        display_order: 4,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Mode de vie',
        description: 'Activité physique et habitudes',
        display_order: 5,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Assurance et administratif',
        description: 'Informations administratives',
        display_order: 6,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Notes de visite',
        description: 'Informations cliniques de la visite',
        display_order: 7,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('custom_field_categories', categories);
    console.log('✅ Created 7 custom field categories');

    // Get category IDs
    const [cats] = await queryInterface.sequelize.query(
      "SELECT id, name FROM custom_field_categories"
    );
    const getCatId = (name) => cats.find(c => c.name === name)?.id;

    // Create field definitions (using correct column names from the table)
    // Columns: id, category_id, field_name, field_label, field_type, is_required,
    //          validation_rules, select_options, help_text, display_order, is_active, created_at, updated_at
    const definitions = [
      // Personal Information
      { id: uuidv4(), category_id: getCatId('Informations personnelles'), field_name: 'date_of_birth', field_label: 'Date de naissance', field_type: 'date', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations personnelles'), field_name: 'gender', field_label: 'Genre', field_type: 'select', select_options: JSON.stringify([{ value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }, { value: 'other', label: 'Autre' }]), is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations personnelles'), field_name: 'emergency_contact_name', field_label: 'Contact d\'urgence', field_type: 'text', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations personnelles'), field_name: 'emergency_contact_phone', field_label: 'Téléphone d\'urgence', field_type: 'text', is_required: false, display_order: 4, is_active: true, created_at: now, updated_at: now },

      // Contact Details
      { id: uuidv4(), category_id: getCatId('Coordonnées'), field_name: 'address', field_label: 'Adresse', field_type: 'textarea', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Coordonnées'), field_name: 'city', field_label: 'Ville', field_type: 'text', is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Coordonnées'), field_name: 'zip_code', field_label: 'Code postal', field_type: 'text', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },

      // Medical Information
      { id: uuidv4(), category_id: getCatId('Informations médicales'), field_name: 'medical_conditions', field_label: 'Conditions médicales', field_type: 'textarea', help_text: 'Diabète, hypertension, etc.', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations médicales'), field_name: 'allergies', field_label: 'Allergies', field_type: 'textarea', help_text: 'Arachides, gluten, lactose...', is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations médicales'), field_name: 'current_medications', field_label: 'Médicaments actuels', field_type: 'textarea', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations médicales'), field_name: 'blood_type', field_label: 'Groupe sanguin', field_type: 'select', select_options: JSON.stringify([{ value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }]), is_required: false, display_order: 4, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Informations médicales'), field_name: 'primary_care_physician', field_label: 'Médecin traitant', field_type: 'text', is_required: false, display_order: 5, is_active: true, created_at: now, updated_at: now },

      // Dietary Habits
      { id: uuidv4(), category_id: getCatId('Habitudes alimentaires'), field_name: 'dietary_preferences', field_label: 'Préférences alimentaires', field_type: 'textarea', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Habitudes alimentaires'), field_name: 'dietary_restrictions', field_label: 'Restrictions alimentaires', field_type: 'select', select_options: JSON.stringify([{ value: 'vegetarian', label: 'Végétarien' }, { value: 'vegan', label: 'Végan' }, { value: 'gluten_free', label: 'Sans gluten' }, { value: 'lactose_free', label: 'Sans lactose' }, { value: 'halal', label: 'Halal' }, { value: 'kosher', label: 'Casher' }]), is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Habitudes alimentaires'), field_name: 'nutritional_goals', field_label: 'Objectifs nutritionnels', field_type: 'textarea', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },

      // Lifestyle
      { id: uuidv4(), category_id: getCatId('Mode de vie'), field_name: 'exercise_habits', field_label: 'Activité physique', field_type: 'select', select_options: JSON.stringify([{ value: 'sedentary', label: 'Sédentaire' }, { value: 'light', label: 'Légère (1-2x/sem)' }, { value: 'moderate', label: 'Modérée (3-4x/sem)' }, { value: 'active', label: 'Active (5+x/sem)' }, { value: 'athlete', label: 'Athlète' }]), is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Mode de vie'), field_name: 'smoking_status', field_label: 'Tabagisme', field_type: 'select', select_options: JSON.stringify([{ value: 'never', label: 'Jamais fumé' }, { value: 'former', label: 'Ancien fumeur' }, { value: 'current', label: 'Fumeur actuel' }]), is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Mode de vie'), field_name: 'alcohol_consumption', field_label: 'Consommation d\'alcool', field_type: 'select', select_options: JSON.stringify([{ value: 'none', label: 'Aucune' }, { value: 'occasional', label: 'Occasionnelle' }, { value: 'moderate', label: 'Modérée' }, { value: 'regular', label: 'Régulière' }]), is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },

      // Insurance & Admin
      { id: uuidv4(), category_id: getCatId('Assurance et administratif'), field_name: 'insurance_provider', field_label: 'Assurance', field_type: 'text', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Assurance et administratif'), field_name: 'insurance_policy_number', field_label: 'Numéro de police', field_type: 'text', is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Assurance et administratif'), field_name: 'medical_record_number', field_label: 'Numéro de dossier', field_type: 'text', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Assurance et administratif'), field_name: 'notes', field_label: 'Notes', field_type: 'textarea', is_required: false, display_order: 4, is_active: true, created_at: now, updated_at: now },

      // Visit Notes
      { id: uuidv4(), category_id: getCatId('Notes de visite'), field_name: 'chief_complaint', field_label: 'Motif de consultation', field_type: 'textarea', is_required: false, display_order: 1, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Notes de visite'), field_name: 'assessment', field_label: 'Évaluation', field_type: 'textarea', is_required: false, display_order: 2, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Notes de visite'), field_name: 'recommendations', field_label: 'Recommandations', field_type: 'textarea', is_required: false, display_order: 3, is_active: true, created_at: now, updated_at: now },
      { id: uuidv4(), category_id: getCatId('Notes de visite'), field_name: 'visit_notes', field_label: 'Notes de visite', field_type: 'textarea', is_required: false, display_order: 4, is_active: true, created_at: now, updated_at: now }
    ];

    await queryInterface.bulkInsert('custom_field_definitions', definitions);
    console.log(`✅ Created ${definitions.length} custom field definitions`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('custom_field_definitions', null, {});
    await queryInterface.bulkDelete('custom_field_categories', null, {});
  }
};
