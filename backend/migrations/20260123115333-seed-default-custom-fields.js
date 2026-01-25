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

    // Create categories
    const categories = [
      {
        id: uuidv4(),
        name: 'Informations personnelles',
        name_en: 'Personal Information',
        description: 'Informations de base du patient',
        description_en: 'Basic patient information',
        icon: '👤',
        color: '#3498db',
        display_order: 1,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Coordonnées',
        name_en: 'Contact Details',
        description: 'Adresse et contacts',
        description_en: 'Address and contacts',
        icon: '📍',
        color: '#2ecc71',
        display_order: 2,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Informations médicales',
        name_en: 'Medical Information',
        description: 'Antécédents et conditions médicales',
        description_en: 'Medical history and conditions',
        icon: '🏥',
        color: '#e74c3c',
        display_order: 3,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Habitudes alimentaires',
        name_en: 'Dietary Habits',
        description: 'Préférences et restrictions alimentaires',
        description_en: 'Food preferences and restrictions',
        icon: '🍎',
        color: '#f39c12',
        display_order: 4,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Mode de vie',
        name_en: 'Lifestyle',
        description: 'Activité physique et habitudes',
        description_en: 'Physical activity and habits',
        icon: '🏃',
        color: '#9b59b6',
        display_order: 5,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Assurance et administratif',
        name_en: 'Insurance & Admin',
        description: 'Informations administratives',
        description_en: 'Administrative information',
        icon: '📋',
        color: '#1abc9c',
        display_order: 6,
        is_active: true,
        entity_types: JSON.stringify(['patient']),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Notes de visite',
        name_en: 'Visit Notes',
        description: 'Informations cliniques de la visite',
        description_en: 'Clinical visit information',
        icon: '📝',
        color: '#34495e',
        display_order: 1,
        is_active: true,
        entity_types: JSON.stringify(['visit']),
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

    // Create field definitions
    const definitions = [
      // Personal Information
      {
        id: uuidv4(),
        category_id: getCatId('Informations personnelles'),
        name: 'date_of_birth',
        label: 'Date de naissance',
        label_en: 'Date of Birth',
        field_type: 'date',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: true,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations personnelles'),
        name: 'gender',
        label: 'Genre',
        label_en: 'Gender',
        field_type: 'select',
        options: JSON.stringify([
          { value: 'male', label: 'Homme', label_en: 'Male' },
          { value: 'female', label: 'Femme', label_en: 'Female' },
          { value: 'other', label: 'Autre', label_en: 'Other' }
        ]),
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: true,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations personnelles'),
        name: 'emergency_contact_name',
        label: 'Contact d\'urgence',
        label_en: 'Emergency Contact',
        field_type: 'text',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations personnelles'),
        name: 'emergency_contact_phone',
        label: 'Téléphone d\'urgence',
        label_en: 'Emergency Phone',
        field_type: 'text',
        is_required: false,
        display_order: 4,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Contact Details
      {
        id: uuidv4(),
        category_id: getCatId('Coordonnées'),
        name: 'address',
        label: 'Adresse',
        label_en: 'Address',
        field_type: 'textarea',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Coordonnées'),
        name: 'city',
        label: 'Ville',
        label_en: 'City',
        field_type: 'text',
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: true,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Coordonnées'),
        name: 'zip_code',
        label: 'Code postal',
        label_en: 'Zip Code',
        field_type: 'text',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Medical Information
      {
        id: uuidv4(),
        category_id: getCatId('Informations médicales'),
        name: 'medical_conditions',
        label: 'Conditions médicales',
        label_en: 'Medical Conditions',
        field_type: 'textarea',
        placeholder: 'Diabète, hypertension, etc.',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations médicales'),
        name: 'allergies',
        label: 'Allergies',
        label_en: 'Allergies',
        field_type: 'textarea',
        placeholder: 'Arachides, gluten, lactose...',
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: true,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations médicales'),
        name: 'current_medications',
        label: 'Médicaments actuels',
        label_en: 'Current Medications',
        field_type: 'textarea',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations médicales'),
        name: 'blood_type',
        label: 'Groupe sanguin',
        label_en: 'Blood Type',
        field_type: 'select',
        options: JSON.stringify([
          { value: 'A+', label: 'A+' },
          { value: 'A-', label: 'A-' },
          { value: 'B+', label: 'B+' },
          { value: 'B-', label: 'B-' },
          { value: 'AB+', label: 'AB+' },
          { value: 'AB-', label: 'AB-' },
          { value: 'O+', label: 'O+' },
          { value: 'O-', label: 'O-' }
        ]),
        is_required: false,
        display_order: 4,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Informations médicales'),
        name: 'primary_care_physician',
        label: 'Médecin traitant',
        label_en: 'Primary Care Physician',
        field_type: 'text',
        is_required: false,
        display_order: 5,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Dietary Habits
      {
        id: uuidv4(),
        category_id: getCatId('Habitudes alimentaires'),
        name: 'dietary_preferences',
        label: 'Préférences alimentaires',
        label_en: 'Dietary Preferences',
        field_type: 'textarea',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Habitudes alimentaires'),
        name: 'dietary_restrictions',
        label: 'Restrictions alimentaires',
        label_en: 'Dietary Restrictions',
        field_type: 'multiselect',
        options: JSON.stringify([
          { value: 'vegetarian', label: 'Végétarien', label_en: 'Vegetarian' },
          { value: 'vegan', label: 'Végan', label_en: 'Vegan' },
          { value: 'gluten_free', label: 'Sans gluten', label_en: 'Gluten-free' },
          { value: 'lactose_free', label: 'Sans lactose', label_en: 'Lactose-free' },
          { value: 'halal', label: 'Halal', label_en: 'Halal' },
          { value: 'kosher', label: 'Casher', label_en: 'Kosher' }
        ]),
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: true,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Habitudes alimentaires'),
        name: 'nutritional_goals',
        label: 'Objectifs nutritionnels',
        label_en: 'Nutritional Goals',
        field_type: 'textarea',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Lifestyle
      {
        id: uuidv4(),
        category_id: getCatId('Mode de vie'),
        name: 'exercise_habits',
        label: 'Activité physique',
        label_en: 'Exercise Habits',
        field_type: 'select',
        options: JSON.stringify([
          { value: 'sedentary', label: 'Sédentaire', label_en: 'Sedentary' },
          { value: 'light', label: 'Légère (1-2x/sem)', label_en: 'Light (1-2x/week)' },
          { value: 'moderate', label: 'Modérée (3-4x/sem)', label_en: 'Moderate (3-4x/week)' },
          { value: 'active', label: 'Active (5+x/sem)', label_en: 'Active (5+x/week)' },
          { value: 'athlete', label: 'Athlète', label_en: 'Athlete' }
        ]),
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Mode de vie'),
        name: 'smoking_status',
        label: 'Tabagisme',
        label_en: 'Smoking Status',
        field_type: 'select',
        options: JSON.stringify([
          { value: 'never', label: 'Jamais fumé', label_en: 'Never smoked' },
          { value: 'former', label: 'Ancien fumeur', label_en: 'Former smoker' },
          { value: 'current', label: 'Fumeur actuel', label_en: 'Current smoker' }
        ]),
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Mode de vie'),
        name: 'alcohol_consumption',
        label: 'Consommation d\'alcool',
        label_en: 'Alcohol Consumption',
        field_type: 'select',
        options: JSON.stringify([
          { value: 'none', label: 'Aucune', label_en: 'None' },
          { value: 'occasional', label: 'Occasionnelle', label_en: 'Occasional' },
          { value: 'moderate', label: 'Modérée', label_en: 'Moderate' },
          { value: 'regular', label: 'Régulière', label_en: 'Regular' }
        ]),
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Insurance & Admin
      {
        id: uuidv4(),
        category_id: getCatId('Assurance et administratif'),
        name: 'insurance_provider',
        label: 'Assurance',
        label_en: 'Insurance Provider',
        field_type: 'text',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Assurance et administratif'),
        name: 'insurance_policy_number',
        label: 'Numéro de police',
        label_en: 'Policy Number',
        field_type: 'text',
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Assurance et administratif'),
        name: 'medical_record_number',
        label: 'Numéro de dossier',
        label_en: 'Medical Record Number',
        field_type: 'text',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: true,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Assurance et administratif'),
        name: 'notes',
        label: 'Notes',
        label_en: 'Notes',
        field_type: 'textarea',
        is_required: false,
        display_order: 4,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'patient',
        created_at: now,
        updated_at: now
      },

      // Visit Notes
      {
        id: uuidv4(),
        category_id: getCatId('Notes de visite'),
        name: 'chief_complaint',
        label: 'Motif de consultation',
        label_en: 'Chief Complaint',
        field_type: 'textarea',
        is_required: false,
        display_order: 1,
        is_active: true,
        show_in_basic_info: true,
        show_in_list: false,
        entity_type: 'visit',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Notes de visite'),
        name: 'assessment',
        label: 'Évaluation',
        label_en: 'Assessment',
        field_type: 'textarea',
        is_required: false,
        display_order: 2,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'visit',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Notes de visite'),
        name: 'recommendations',
        label: 'Recommandations',
        label_en: 'Recommendations',
        field_type: 'textarea',
        is_required: false,
        display_order: 3,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'visit',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        category_id: getCatId('Notes de visite'),
        name: 'visit_notes',
        label: 'Notes de visite',
        label_en: 'Visit Notes',
        field_type: 'textarea',
        is_required: false,
        display_order: 4,
        is_active: true,
        show_in_basic_info: false,
        show_in_list: false,
        entity_type: 'visit',
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('custom_field_definitions', definitions);
    console.log(`✅ Created ${definitions.length} custom field definitions`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('custom_field_definitions', null, {});
    await queryInterface.bulkDelete('custom_field_categories', null, {});
  }
};
