'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeder: Default Billing Templates
 * Sprint 5: US-5.5.1 - Billing Templates
 *
 * Creates common billing templates for French dietitian practices:
 * 1. Consultation Initiale (Initial Consultation)
 * 2. Consultation de Suivi (Follow-up Consultation)
 * 3. Forfait 5 Séances (5-Session Package)
 * 4. Bilan Nutritionnel Complet (Complete Nutritional Assessment)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if billing templates already exist
    const existingTemplates = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM billing_templates",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingTemplates[0].count > 0) {
      console.log('ℹ️  Billing templates already exist, skipping seed');
      return;
    }

    const now = new Date();

    // Template 1: Consultation Initiale (DEFAULT)
    const template1Id = uuidv4();
    await queryInterface.bulkInsert('billing_templates', [{
      id: template1Id,
      name: 'Consultation Initiale',
      description: 'Première consultation avec bilan nutritionnel complet et plan alimentaire personnalisé',
      is_default: true,
      is_active: true,
      created_by: null,
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('billing_template_items', [
      {
        id: uuidv4(),
        billing_template_id: template1Id,
        item_name: 'Consultation diététique initiale',
        description: 'Entretien approfondi (60-90 minutes)',
        quantity: 1.00,
        unit_price: 85.00,
        sort_order: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template1Id,
        item_name: 'Bilan nutritionnel complet',
        description: 'Analyse des habitudes alimentaires et besoins nutritionnels',
        quantity: 1.00,
        unit_price: 45.00,
        sort_order: 2,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template1Id,
        item_name: 'Plan alimentaire personnalisé',
        description: 'Programme nutritionnel adapté aux objectifs',
        quantity: 1.00,
        unit_price: 35.00,
        sort_order: 3,
        created_at: now,
        updated_at: now
      }
    ]);

    // Template 2: Consultation de Suivi
    const template2Id = uuidv4();
    await queryInterface.bulkInsert('billing_templates', [{
      id: template2Id,
      name: 'Consultation de Suivi',
      description: 'Consultation de suivi avec ajustement du plan alimentaire',
      is_default: false,
      is_active: true,
      created_by: null,
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('billing_template_items', [
      {
        id: uuidv4(),
        billing_template_id: template2Id,
        item_name: 'Consultation de suivi',
        description: 'Suivi des progrès et ajustements (45 minutes)',
        quantity: 1.00,
        unit_price: 55.00,
        sort_order: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template2Id,
        item_name: 'Ajustement du plan alimentaire',
        description: 'Modification et optimisation du programme',
        quantity: 1.00,
        unit_price: 25.00,
        sort_order: 2,
        created_at: now,
        updated_at: now
      }
    ]);

    // Template 3: Forfait 5 Séances
    const template3Id = uuidv4();
    await queryInterface.bulkInsert('billing_templates', [{
      id: template3Id,
      name: 'Forfait 5 Séances',
      description: 'Forfait avantageux pour 5 consultations de suivi (économie de 50€)',
      is_default: false,
      is_active: true,
      created_by: null,
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('billing_template_items', [
      {
        id: uuidv4(),
        billing_template_id: template3Id,
        item_name: 'Forfait 5 consultations',
        description: 'Pack de 5 séances de suivi (valable 6 mois)',
        quantity: 1.00,
        unit_price: 250.00,
        sort_order: 1,
        created_at: now,
        updated_at: now
      }
    ]);

    // Template 4: Bilan Nutritionnel Complet
    const template4Id = uuidv4();
    await queryInterface.bulkInsert('billing_templates', [{
      id: template4Id,
      name: 'Bilan Nutritionnel Complet',
      description: 'Bilan approfondi avec analyse corporelle et recommandations détaillées',
      is_default: false,
      is_active: true,
      created_by: null,
      created_at: now,
      updated_at: now
    }]);

    await queryInterface.bulkInsert('billing_template_items', [
      {
        id: uuidv4(),
        billing_template_id: template4Id,
        item_name: 'Consultation initiale',
        description: 'Entretien et anamnèse complète (90 minutes)',
        quantity: 1.00,
        unit_price: 95.00,
        sort_order: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template4Id,
        item_name: 'Analyse de composition corporelle',
        description: 'Impédancemétrie et mesures anthropométriques',
        quantity: 1.00,
        unit_price: 40.00,
        sort_order: 2,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template4Id,
        item_name: 'Plan nutritionnel détaillé',
        description: 'Programme personnalisé avec recettes et listes de courses',
        quantity: 1.00,
        unit_price: 50.00,
        sort_order: 3,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        billing_template_id: template4Id,
        item_name: 'Suivi par email (1 mois)',
        description: 'Accompagnement et réponses aux questions',
        quantity: 1.00,
        unit_price: 30.00,
        sort_order: 4,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Delete all template items first (due to foreign key constraint)
    await queryInterface.bulkDelete('billing_template_items', null, {});

    // Then delete templates
    await queryInterface.bulkDelete('billing_templates', {
      name: [
        'Consultation Initiale',
        'Consultation de Suivi',
        'Forfait 5 Séances',
        'Bilan Nutritionnel Complet'
      ]
    });
  }
};
