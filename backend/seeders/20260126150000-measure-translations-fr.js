'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: French Translations for Default Measure Definitions
 *
 * Adds French translations for all default measures
 */

// French translations for measures (keyed by measure name)
const frenchTranslations = {
  // Vitals
  weight: {
    display_name: 'Poids',
    description: 'Mesure du poids corporel'
  },
  height: {
    display_name: 'Taille',
    description: 'Mesure de la taille corporelle'
  },
  blood_pressure_systolic: {
    display_name: 'Pression artérielle (Systolique)',
    description: 'Pression artérielle systolique'
  },
  blood_pressure_diastolic: {
    display_name: 'Pression artérielle (Diastolique)',
    description: 'Pression artérielle diastolique'
  },
  heart_rate: {
    display_name: 'Fréquence cardiaque',
    description: 'Fréquence cardiaque au repos'
  },
  body_temperature: {
    display_name: 'Température corporelle',
    description: 'Température corporelle centrale'
  },

  // Lab Results
  blood_glucose: {
    display_name: 'Glycémie',
    description: 'Taux de glucose sanguin à jeun'
  },
  hba1c: {
    display_name: 'HbA1c',
    description: 'Hémoglobine glyquée (moyenne de la glycémie)'
  },
  cholesterol_total: {
    display_name: 'Cholestérol total',
    description: 'Cholestérol sanguin total'
  },
  cholesterol_ldl: {
    display_name: 'Cholestérol LDL',
    description: 'Lipoprotéines de basse densité (mauvais cholestérol)'
  },
  cholesterol_hdl: {
    display_name: 'Cholestérol HDL',
    description: 'Lipoprotéines de haute densité (bon cholestérol)'
  },
  triglycerides: {
    display_name: 'Triglycérides',
    description: 'Taux de triglycérides sanguins'
  },

  // Anthropometric
  waist_circumference: {
    display_name: 'Tour de taille',
    description: 'Mesure du tour de taille au niveau du nombril'
  },
  hip_circumference: {
    display_name: 'Tour de hanches',
    description: 'Mesure du tour de hanches au point le plus large'
  },
  body_fat_percentage: {
    display_name: 'Pourcentage de graisse corporelle',
    description: 'Pourcentage du poids corporel en graisse'
  },
  muscle_mass: {
    display_name: 'Masse musculaire',
    description: 'Masse musculaire squelettique'
  },

  // Lifestyle
  sleep_hours: {
    display_name: 'Durée du sommeil',
    description: 'Heures de sommeil par nuit'
  },
  water_intake: {
    display_name: 'Consommation d\'eau',
    description: 'Consommation quotidienne d\'eau'
  },
  exercise_minutes: {
    display_name: 'Durée d\'exercice',
    description: 'Exercice/activité physique quotidienne'
  },

  // Symptoms
  fatigue: {
    display_name: 'Fatigue',
    description: 'Ressent une fatigue inhabituelle'
  },
  headache: {
    display_name: 'Maux de tête',
    description: 'Ressent des maux de tête'
  },
  nausea: {
    display_name: 'Nausées',
    description: 'Ressent des nausées'
  },

  // Additional measures that might exist
  weight_change: {
    display_name: 'Variation de poids',
    description: 'Changement de poids depuis la dernière mesure'
  },
  map: {
    display_name: 'Pression artérielle moyenne',
    description: 'Pression artérielle moyenne (PAM)'
  },
  pulse_pressure: {
    display_name: 'Pression pulsée',
    description: 'Différence entre pression systolique et diastolique'
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Get all measure definitions
    const measures = await queryInterface.sequelize.query(
      "SELECT id, name FROM measure_definitions WHERE is_active = 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (measures.length === 0) {
      console.log('ℹ️  No measure definitions found, skipping translations seed');
      return;
    }

    const translations = [];

    for (const measure of measures) {
      const frTranslation = frenchTranslations[measure.name];

      if (!frTranslation) {
        console.log(`⚠️  No French translation defined for measure: ${measure.name}`);
        continue;
      }

      // Check if translations already exist for this measure
      const existing = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM measure_translations
         WHERE entity_id = '${measure.id}' AND language_code = 'fr'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existing[0].count > 0) {
        console.log(`ℹ️  Translations already exist for ${measure.name}, skipping`);
        continue;
      }

      // Add display_name translation
      translations.push({
        id: uuidv4(),
        entity_type: 'measure_definition',
        entity_id: measure.id,
        language_code: 'fr',
        field_name: 'display_name',
        translated_value: frTranslation.display_name,
        created_at: now,
        updated_at: now
      });

      // Add description translation
      translations.push({
        id: uuidv4(),
        entity_type: 'measure_definition',
        entity_id: measure.id,
        language_code: 'fr',
        field_name: 'description',
        translated_value: frTranslation.description,
        created_at: now,
        updated_at: now
      });
    }

    if (translations.length > 0) {
      await queryInterface.bulkInsert('measure_translations', translations);
      console.log(`✅ Inserted ${translations.length} French translations for ${translations.length / 2} measures`);
    } else {
      console.log('ℹ️  No new translations to insert');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('measure_translations', {
      language_code: 'fr',
      entity_type: 'measure_definition'
    });
    console.log('✅ Removed French measure translations');
  }
};
