/**
 * Seeder: Library Documents
 * Creates starter library documents with templates and educational content
 *
 * Note: This seeder creates placeholder document records.
 * In production, you would need to:
 * 1. Upload actual files to the uploads directory
 * 2. Update file_path and file_size to match real files
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { v4: uuidv4 } = require('uuid');

    // Check if library documents already exist
    const existingLibraryDocs = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM documents WHERE is_template = true",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingLibraryDocs[0].count > 0) {
      console.log('ℹ️  Library documents already exist, skipping seed');
      return;
    }

    // Get admin user to use as uploader
    const adminUsers = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'ADMIN') LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (adminUsers.length === 0) {
      console.log('⚠️  No admin user found, skipping library documents seed');
      return;
    }

    const adminId = adminUsers[0].id;
    const now = new Date();

    // Library template documents
    const libraryDocuments = [
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Meal Planning Template.pdf',
        file_path: 'library/templates/meal-planning-template.pdf',
        file_size: 245000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Weekly meal planning template for patients to organize their nutrition',
        tags: JSON.stringify(['meal-planning', 'template', 'nutrition']),
        category: 'Templates',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Food Diary Template.pdf',
        file_path: 'library/templates/food-diary-template.pdf',
        file_size: 180000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Daily food diary template to track meals, snacks, and hydration',
        tags: JSON.stringify(['food-diary', 'template', 'tracking']),
        category: 'Templates',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Healthy Breakfast Recipes.pdf',
        file_path: 'library/recipes/healthy-breakfast-recipes.pdf',
        file_size: 520000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Collection of 15 nutritious and easy breakfast recipes',
        tags: JSON.stringify(['recipes', 'breakfast', 'healthy-eating']),
        category: 'Recipes',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Understanding Macronutrients.pdf',
        file_path: 'library/educational/understanding-macronutrients.pdf',
        file_size: 340000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Educational guide explaining proteins, carbohydrates, and fats',
        tags: JSON.stringify(['education', 'macronutrients', 'nutrition-basics']),
        category: 'Educational',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Portion Control Guide.pdf',
        file_path: 'library/guides/portion-control-guide.pdf',
        file_size: 290000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Visual guide to proper portion sizes for different food groups',
        tags: JSON.stringify(['portions', 'guide', 'weight-management']),
        category: 'Guides',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Hydration Tracking Sheet.pdf',
        file_path: 'library/templates/hydration-tracking.pdf',
        file_size: 150000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Simple daily hydration tracking sheet',
        tags: JSON.stringify(['hydration', 'template', 'tracking']),
        category: 'Templates',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Reading Nutrition Labels.pdf',
        file_path: 'library/educational/reading-nutrition-labels.pdf',
        file_size: 380000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'How to read and understand nutrition labels on packaged foods',
        tags: JSON.stringify(['education', 'labels', 'grocery-shopping']),
        category: 'Educational',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Mediterranean Diet Overview.pdf',
        file_path: 'library/guides/mediterranean-diet.pdf',
        file_size: 450000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Comprehensive guide to the Mediterranean diet and its health benefits',
        tags: JSON.stringify(['diet', 'mediterranean', 'heart-health']),
        category: 'Guides',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Quick & Healthy Snacks.pdf',
        file_path: 'library/recipes/healthy-snacks.pdf',
        file_size: 310000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: '20 quick and nutritious snack ideas for busy schedules',
        tags: JSON.stringify(['recipes', 'snacks', 'quick-meals']),
        category: 'Recipes',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        resource_type: null,
        resource_id: null,
        file_name: 'Grocery Shopping List Template.pdf',
        file_path: 'library/templates/grocery-list.pdf',
        file_size: 120000,
        mime_type: 'application/pdf',
        uploaded_by: adminId,
        description: 'Organized grocery shopping list template by food category',
        tags: JSON.stringify(['template', 'grocery', 'meal-prep']),
        category: 'Templates',
        is_template: true,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('documents', libraryDocuments);
    console.log('✅ Successfully created library documents');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('documents', {
      is_template: true
    }, {});
  }
};
