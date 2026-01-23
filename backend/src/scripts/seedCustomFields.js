/**
 * Seed Default Custom Field Categories and Definitions
 * Creates default patient information fields based on requirements
 */

const db = require('../../../models');
const { v4: uuidv4 } = require('uuid');

async function seedCustomFields() {
  try {
    console.log('🌱 Starting custom fields seed...');

    // Get admin user for created_by
    const adminUser = await db.User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      throw new Error('Admin user not found. Please ensure the database is initialized.');
    }

    const categories = [];
    const definitions = [];

    // ===========================================
    // 1. CATÉGORIE: Informations Générales
    // ===========================================
    const categoryGeneral = {
      id: uuidv4(),
      name: 'Informations Générales',
      description: 'Informations personnelles et situation familiale',
      display_order: 1,
      is_active: true,
      color: '#3498db', // Blue
      created_by: adminUser.id
    };
    categories.push(categoryGeneral);

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'date_naissance',
      field_label: 'Date de naissance',
      field_type: 'date',
      is_required: false,
      validation_rules: JSON.stringify({ dateFormat: 'DD/MM/YYYY' }),
      help_text: 'Date de naissance du patient',
      display_order: 1,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'sexe',
      field_label: 'Sexe',
      field_type: 'select',
      is_required: false,
      select_options: JSON.stringify(['Masculin', 'Féminin', 'Autre']),
      help_text: 'Sexe du patient',
      display_order: 2,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'adresse',
      field_label: 'Adresse',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 500 }),
      help_text: 'Adresse complète du patient',
      display_order: 3,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'code_postal',
      field_label: 'Code postal',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 20 }),
      help_text: 'Code postal',
      display_order: 4,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'ville',
      field_label: 'Ville',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 100 }),
      help_text: 'Ville de résidence',
      display_order: 5,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'situation_familiale',
      field_label: 'Situation familiale',
      field_type: 'select',
      is_required: false,
      select_options: JSON.stringify(['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve', 'Union libre']),
      help_text: 'Situation maritale du patient',
      display_order: 6,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryGeneral.id,
      field_name: 'profession',
      field_label: 'Profession',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 200 }),
      help_text: 'Profession ou activité principale',
      display_order: 7,
      is_active: true,
      created_by: adminUser.id
    });

    // ===========================================
    // 2. CATÉGORIE: Style de vie
    // ===========================================
    const categoryLifestyle = {
      id: uuidv4(),
      name: 'Style de vie',
      description: 'Habitudes de vie et comportements',
      display_order: 2,
      is_active: true,
      color: '#2ecc71', // Green
      created_by: adminUser.id
    };
    categories.push(categoryLifestyle);

    definitions.push({
      id: uuidv4(),
      category_id: categoryLifestyle.id,
      field_name: 'tabagisme_quantite',
      field_label: 'Tabagisme - Quantité par jour',
      field_type: 'number',
      is_required: false,
      validation_rules: JSON.stringify({ min: 0, max: 100 }),
      help_text: 'Nombre de cigarettes par jour (si fumeur)',
      display_order: 1,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryLifestyle.id,
      field_name: 'tabagisme_duree_annees',
      field_label: 'Tabagisme - Durée (années)',
      field_type: 'number',
      is_required: false,
      validation_rules: JSON.stringify({ min: 0, max: 100 }),
      help_text: 'Durée du tabagisme en années',
      display_order: 2,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryLifestyle.id,
      field_name: 'alcool_quantite_hebdo',
      field_label: 'Consommation d\'alcool - Quantité par semaine',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 200 }),
      help_text: 'Quantité d\'alcool consommée par semaine (ex: 2 verres de vin)',
      display_order: 3,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryLifestyle.id,
      field_name: 'activite_physique_type',
      field_label: 'Activité physique - Type',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 200 }),
      help_text: 'Type d\'activité physique pratiquée',
      display_order: 4,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryLifestyle.id,
      field_name: 'activite_physique_frequence',
      field_label: 'Activité physique - Fréquence',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 100 }),
      help_text: 'Fréquence de l\'activité (ex: 3 fois par semaine)',
      display_order: 5,
      is_active: true,
      created_by: adminUser.id
    });

    // ===========================================
    // 3. CATÉGORIE: Données Médicales
    // ===========================================
    const categoryMedical = {
      id: uuidv4(),
      name: 'Données Médicales',
      description: 'Informations médicales et suivi',
      display_order: 3,
      is_active: true,
      color: '#e74c3c', // Red
      created_by: adminUser.id
    };
    categories.push(categoryMedical);

    definitions.push({
      id: uuidv4(),
      category_id: categoryMedical.id,
      field_name: 'medecin_traitant_contact',
      field_label: 'Médecin traitant - Contact',
      field_type: 'text',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 100 }),
      help_text: 'Téléphone ou email du médecin traitant',
      display_order: 1,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryMedical.id,
      field_name: 'autre_suivi_medical',
      field_label: 'Autre suivi médical',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Spécialistes et autres professionnels de santé consultés',
      display_order: 2,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryMedical.id,
      field_name: 'date_derniere_visite_medicale',
      field_label: 'Date de la dernière visite médicale',
      field_type: 'date',
      is_required: false,
      help_text: 'Date de la dernière consultation médicale',
      display_order: 3,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryMedical.id,
      field_name: 'antecedents_familiaux',
      field_label: 'Antécédents familiaux',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 2000 }),
      help_text: 'Maladies héréditaires et antécédents familiaux',
      display_order: 4,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryMedical.id,
      field_name: 'antecedents_familiaux_nutritionnels',
      field_label: 'Antécédents familiaux nutritionnels',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 2000 }),
      help_text: 'Obésité, diabète, maladies cardiovasculaires dans la famille',
      display_order: 5,
      is_active: true,
      created_by: adminUser.id
    });

    // ===========================================
    // 4. CATÉGORIE: Données Cliniques
    // ===========================================
    const categoryClinical = {
      id: uuidv4(),
      name: 'Données Cliniques',
      description: 'État clinique actuel et symptomatologie',
      display_order: 4,
      is_active: true,
      color: '#9b59b6', // Purple
      created_by: adminUser.id
    };
    categories.push(categoryClinical);

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'symptomes_actuels',
      field_label: 'Symptômes actuels',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 2000 }),
      help_text: 'Description des symptômes actuels',
      display_order: 1,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'diagnostic_actuel',
      field_label: 'Diagnostic actuel',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 2000 }),
      help_text: 'Diagnostic médical établi',
      display_order: 2,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'traitement_prescrit',
      field_label: 'Traitement prescrit',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 2000 }),
      help_text: 'Traitements actuellement prescrits',
      display_order: 3,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'alcools_drogues',
      field_label: 'Alcools et drogues',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Type, quantité et fréquence de consommation',
      display_order: 4,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'douleur_chronique',
      field_label: 'Douleur chronique',
      field_type: 'boolean',
      is_required: false,
      help_text: 'Le patient souffre-t-il de douleurs chroniques ?',
      display_order: 5,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'douleur_chronique_details',
      field_label: 'Douleur chronique - Détails',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Localisation, intensité, fréquence',
      display_order: 6,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_sommeil',
      field_label: 'Trouble du sommeil',
      field_type: 'boolean',
      is_required: false,
      help_text: 'Le patient souffre-t-il de troubles du sommeil ?',
      display_order: 7,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_sommeil_details',
      field_label: 'Trouble du sommeil - Détails',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Type de trouble et fréquence',
      display_order: 8,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_digestif',
      field_label: 'Trouble digestif',
      field_type: 'boolean',
      is_required: false,
      help_text: 'Le patient souffre-t-il de troubles digestifs ?',
      display_order: 9,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_digestif_details',
      field_label: 'Trouble digestif - Détails',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Type de trouble et fréquence',
      display_order: 10,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_anxieux_depressif',
      field_label: 'Trouble anxieux ou dépressif',
      field_type: 'boolean',
      is_required: false,
      help_text: 'Le patient souffre-t-il de troubles anxieux ou dépressifs ?',
      display_order: 11,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_anxieux_depressif_details',
      field_label: 'Trouble anxieux ou dépressif - Détails',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Type de trouble et fréquence',
      display_order: 12,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_feminin',
      field_label: 'Trouble féminin',
      field_type: 'boolean',
      is_required: false,
      help_text: 'La patiente souffre-t-elle de troubles féminins ?',
      display_order: 13,
      is_active: true,
      created_by: adminUser.id
    });

    definitions.push({
      id: uuidv4(),
      category_id: categoryClinical.id,
      field_name: 'trouble_feminin_details',
      field_label: 'Trouble féminin - Détails',
      field_type: 'textarea',
      is_required: false,
      validation_rules: JSON.stringify({ maxLength: 1000 }),
      help_text: 'Type de trouble et fréquence',
      display_order: 14,
      is_active: true,
      created_by: adminUser.id
    });

    // ===========================================
    // INSERT DATA
    // ===========================================

    console.log(`📦 Creating ${categories.length} categories...`);
    await db.CustomFieldCategory.bulkCreate(categories);
    console.log('✅ Categories created');

    console.log(`📦 Creating ${definitions.length} field definitions...`);
    await db.CustomFieldDefinition.bulkCreate(definitions);
    console.log('✅ Field definitions created');

    console.log('\n🎉 Custom fields seed completed successfully!');
    console.log('\nSummary:');
    console.log(`  • ${categories.length} categories created`);
    console.log(`  • ${definitions.length} field definitions created`);
    console.log('\nCategories:');
    categories.forEach(cat => console.log(`  - ${cat.name}`));

  } catch (error) {
    console.error('❌ Error seeding custom fields:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedCustomFields()
    .then(() => {
      console.log('✅ Seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedCustomFields;
