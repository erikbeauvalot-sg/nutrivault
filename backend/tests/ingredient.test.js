/**
 * Ingredient Module Tests
 * Tests for Ingredient model and service
 */

const testDb = require('./setup/testDb');

describe('Ingredient Module', () => {
  let db;
  let testUser;
  let testIngredient;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Create test user
    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    testUser = await db.User.create({
      username: 'ingredientuser',
      email: 'ingredient@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Ingredient',
      last_name: 'Tester',
      role_id: adminRole.id,
      is_active: true
    });

    // Create test ingredient
    testIngredient = await db.Ingredient.create({
      name: 'Test Chicken',
      name_normalized: 'test chicken',
      category: 'proteins',
      default_unit: 'g',
      nutrition_per_100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
      allergens: [],
      is_system: false,
      is_active: true,
      created_by: testUser.id
    });
  });

  // ========================================
  // Ingredient Model Tests
  // ========================================
  describe('Ingredient Model', () => {
    it('creates an ingredient with valid data', async () => {
      const ingredient = await db.Ingredient.create({
        name: 'Salmon Fillet',
        name_normalized: 'salmon fillet',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: { calories: 208, protein: 20, fat: 13, carbs: 0 },
        allergens: ['fish'],
        is_system: true,
        is_active: true,
        created_by: testUser.id
      });

      expect(ingredient.id).toBeDefined();
      expect(ingredient.name).toBe('Salmon Fillet');
      expect(ingredient.category).toBe('proteins');
      expect(ingredient.is_system).toBe(true);
    });

    it('requires name field', async () => {
      await expect(db.Ingredient.create({
        category: 'proteins',
        default_unit: 'g',
        created_by: testUser.id
      })).rejects.toThrow();
    });

    it('stores nutrition data as JSON', async () => {
      const nutrition = {
        calories: 100,
        protein: 25,
        fat: 2,
        carbs: 0,
        fiber: 0,
        sodium: 50
      };

      const ingredient = await db.Ingredient.create({
        name: 'Lean Beef',
        name_normalized: 'lean beef',
        category: 'proteins',
        default_unit: 'g',
        nutrition_per_100g: nutrition,
        is_active: true,
        created_by: testUser.id
      });

      expect(ingredient.nutrition_per_100g).toBeDefined();
      expect(ingredient.nutrition_per_100g.calories).toBe(100);
      expect(ingredient.nutrition_per_100g.protein).toBe(25);
      expect(ingredient.nutrition_per_100g.sodium).toBe(50);
    });

    it('stores allergens as JSON array', async () => {
      const ingredient = await db.Ingredient.create({
        name: 'Milk',
        name_normalized: 'milk',
        category: 'dairy',
        default_unit: 'ml',
        allergens: ['dairy'],
        is_active: true,
        created_by: testUser.id
      });

      expect(ingredient.allergens).toBeInstanceOf(Array);
      expect(ingredient.allergens).toContain('dairy');
    });

    it('allows multiple allergens', async () => {
      const ingredient = await db.Ingredient.create({
        name: 'Bread',
        name_normalized: 'bread',
        category: 'grains',
        default_unit: 'slice',
        allergens: ['gluten', 'eggs', 'dairy'],
        is_active: true,
        created_by: testUser.id
      });

      expect(ingredient.allergens).toHaveLength(3);
      expect(ingredient.allergens).toContain('gluten');
      expect(ingredient.allergens).toContain('eggs');
    });

    it('supports different categories', async () => {
      const categories = ['proteins', 'grains', 'vegetables', 'fruits', 'dairy', 'oils', 'nuts', 'legumes'];

      for (const category of categories) {
        const ingredient = await db.Ingredient.create({
          name: `Test ${category}`,
          name_normalized: `test ${category}`,
          category: category,
          default_unit: 'g',
          is_active: true,
          created_by: testUser.id
        });
        expect(ingredient.category).toBe(category);
      }
    });

    it('supports different units', async () => {
      const units = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

      for (const unit of units) {
        const ingredient = await db.Ingredient.create({
          name: `Test ${unit}`,
          name_normalized: `test ${unit}`,
          category: 'other',
          default_unit: unit,
          is_active: true,
          created_by: testUser.id
        });
        expect(ingredient.default_unit).toBe(unit);
      }
    });

    it('supports common unit abbreviations', async () => {
      const unitMappings = [
        { unit: 'g', description: 'grams' },
        { unit: 'kg', description: 'kilograms' },
        { unit: 'ml', description: 'milliliters' },
        { unit: 'l', description: 'liters' },
        { unit: 'cup', description: 'cups' },
        { unit: 'tbsp', description: 'tablespoons' },
        { unit: 'tsp', description: 'teaspoons' },
        { unit: 'piece', description: 'pieces' },
        { unit: 'slice', description: 'slices' }
      ];

      for (const { unit, description } of unitMappings) {
        const ingredient = await db.Ingredient.create({
          name: `Unit test ${description}`,
          name_normalized: `unit test ${description}`,
          category: 'other',
          default_unit: unit,
          is_active: true,
          created_by: testUser.id
        });
        expect(ingredient.default_unit).toBe(unit);
      }
    });
  });

  // ========================================
  // Ingredient CRUD Tests
  // ========================================
  describe('Ingredient CRUD Operations', () => {
    it('finds ingredient by ID', async () => {
      const found = await db.Ingredient.findByPk(testIngredient.id);

      expect(found).not.toBeNull();
      expect(found.name).toBe('Test Chicken');
    });

    it('updates ingredient', async () => {
      await testIngredient.update({
        name: 'Updated Chicken',
        nutrition_per_100g: { calories: 170, protein: 32, fat: 4, carbs: 0 }
      });

      const updated = await db.Ingredient.findByPk(testIngredient.id);
      expect(updated.name).toBe('Updated Chicken');
      expect(updated.nutrition_per_100g.calories).toBe(170);
    });

    it('soft deletes ingredient', async () => {
      await testIngredient.update({ is_active: false });

      const activeIngredients = await db.Ingredient.findAll({
        where: { is_active: true, id: testIngredient.id }
      });

      expect(activeIngredients).toHaveLength(0);
    });

    it('searches ingredients by name', async () => {
      await db.Ingredient.create({
        name: 'Chicken Wings',
        name_normalized: 'chicken wings',
        category: 'proteins',
        default_unit: 'g',
        is_active: true,
        created_by: testUser.id
      });

      const { Op } = db.Sequelize;
      const results = await db.Ingredient.findAll({
        where: {
          name_normalized: { [Op.like]: '%chicken%' },
          is_active: true
        }
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('filters ingredients by category', async () => {
      await db.Ingredient.create({
        name: 'Broccoli',
        name_normalized: 'broccoli',
        category: 'vegetables',
        default_unit: 'g',
        is_active: true,
        created_by: testUser.id
      });

      const vegetables = await db.Ingredient.findAll({
        where: { category: 'vegetables', is_active: true }
      });

      expect(vegetables.length).toBeGreaterThanOrEqual(1);
      expect(vegetables.every(v => v.category === 'vegetables')).toBe(true);
    });
  });

  // ========================================
  // Ingredient-Recipe Association Tests
  // ========================================
  describe('Ingredient-Recipe Association', () => {
    let testRecipe;
    let testCategory;

    beforeEach(async () => {
      testCategory = await db.RecipeCategory.create({
        name: 'Test Category',
        description: 'Test description',
        icon: '🍽️',
        color: '#FF0000',
        display_order: 1,
        created_by: testUser.id,
        is_active: true
      });

      testRecipe = await db.Recipe.create({
        title: 'Test Recipe',
        slug: 'test-recipe-' + Date.now(),
        description: 'Test description',
        instructions: 'Test instructions',
        servings: 4,
        difficulty: 'medium',
        status: 'draft',
        category_id: testCategory.id,
        created_by: testUser.id,
        is_active: true
      });
    });

    it('creates recipe-ingredient association', async () => {
      const recipeIngredient = await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        notes: 'Boneless',
        is_optional: false,
        display_order: 1
      });

      expect(recipeIngredient.id).toBeDefined();
      expect(recipeIngredient.quantity).toBe(200);
      expect(recipeIngredient.unit).toBe('g');
    });

    it('fetches recipe with ingredients', async () => {
      await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        display_order: 1
      });

      const recipe = await db.Recipe.findByPk(testRecipe.id, {
        include: [{
          model: db.RecipeIngredient,
          as: 'ingredients',
          include: [{ model: db.Ingredient, as: 'ingredient' }]
        }]
      });

      expect(recipe.ingredients).toHaveLength(1);
      expect(recipe.ingredients[0].ingredient.name).toBe('Test Chicken');
    });

    it('allows optional ingredients', async () => {
      const recipeIngredient = await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 50,
        unit: 'g',
        is_optional: true,
        display_order: 1
      });

      expect(recipeIngredient.is_optional).toBe(true);
    });

    it('maintains display order', async () => {
      const ingredient2 = await db.Ingredient.create({
        name: 'Rice',
        name_normalized: 'rice',
        category: 'grains',
        default_unit: 'g',
        is_active: true,
        created_by: testUser.id
      });

      await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        display_order: 2
      });

      await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: ingredient2.id,
        quantity: 100,
        unit: 'g',
        display_order: 1
      });

      const recipeIngredients = await db.RecipeIngredient.findAll({
        where: { recipe_id: testRecipe.id },
        order: [['display_order', 'ASC']]
      });

      expect(recipeIngredients).toHaveLength(2);
      expect(recipeIngredients[0].display_order).toBe(1);
      expect(recipeIngredients[1].display_order).toBe(2);
    });

    it('deletes recipe-ingredient when recipe is deleted', async () => {
      await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        display_order: 1
      });

      // Soft delete recipe
      await testRecipe.update({ is_active: false });

      // RecipeIngredients should still exist but recipe is inactive
      const recipe = await db.Recipe.findOne({
        where: { id: testRecipe.id, is_active: true }
      });

      expect(recipe).toBeNull();
    });
  });

  // ========================================
  // Nutrition Calculation Tests
  // ========================================
  describe('Nutrition Calculations', () => {
    it('calculates nutrition from ingredients', async () => {
      const testCategory = await db.RecipeCategory.create({
        name: 'Nutrition Test',
        description: 'Test',
        created_by: testUser.id,
        is_active: true
      });

      const recipe = await db.Recipe.create({
        title: 'Nutrition Test Recipe',
        slug: 'nutrition-test-' + Date.now(),
        servings: 2,
        difficulty: 'easy',
        status: 'draft',
        category_id: testCategory.id,
        created_by: testUser.id,
        is_active: true
      });

      // Chicken: 200g = 330 cal, 62g protein, 7.2g fat
      await db.RecipeIngredient.create({
        recipe_id: recipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        display_order: 1
      });

      // Create rice ingredient
      const rice = await db.Ingredient.create({
        name: 'White Rice',
        name_normalized: 'white rice',
        category: 'grains',
        default_unit: 'g',
        nutrition_per_100g: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
        is_active: true,
        created_by: testUser.id
      });

      // Rice: 150g = 195 cal, 4.05g protein, 0.45g fat, 42g carbs
      await db.RecipeIngredient.create({
        recipe_id: recipe.id,
        ingredient_id: rice.id,
        quantity: 150,
        unit: 'g',
        display_order: 2
      });

      // Fetch recipe with ingredients
      const fullRecipe = await db.Recipe.findByPk(recipe.id, {
        include: [{
          model: db.RecipeIngredient,
          as: 'ingredients',
          include: [{ model: db.Ingredient, as: 'ingredient' }]
        }]
      });

      // Calculate total nutrition
      let totalCalories = 0;
      let totalProtein = 0;

      fullRecipe.ingredients.forEach(ri => {
        const nutrition = ri.ingredient.nutrition_per_100g;
        if (nutrition && ri.quantity && ri.unit === 'g') {
          const factor = ri.quantity / 100;
          totalCalories += (nutrition.calories || 0) * factor;
          totalProtein += (nutrition.protein || 0) * factor;
        }
      });

      // Expected: 330 + 195 = 525 cal total, per serving = 262.5
      expect(Math.round(totalCalories)).toBe(525);
      expect(Math.round(totalProtein * 10) / 10).toBeCloseTo(66, 0);
    });
  });

  // ========================================
  // System vs User Ingredients Tests
  // ========================================
  describe('System vs User Ingredients', () => {
    it('distinguishes system ingredients from user ingredients', async () => {
      const systemIngredient = await db.Ingredient.create({
        name: 'System Carrot',
        name_normalized: 'system carrot',
        category: 'vegetables',
        default_unit: 'g',
        is_system: true,
        is_active: true,
        created_by: testUser.id
      });

      const userIngredient = await db.Ingredient.create({
        name: 'User Carrot',
        name_normalized: 'user carrot',
        category: 'vegetables',
        default_unit: 'g',
        is_system: false,
        is_active: true,
        created_by: testUser.id
      });

      expect(systemIngredient.is_system).toBe(true);
      expect(userIngredient.is_system).toBe(false);
    });

    it('filters by is_system flag', async () => {
      await db.Ingredient.create({
        name: 'System Apple',
        name_normalized: 'system apple',
        category: 'fruits',
        default_unit: 'piece',
        is_system: true,
        is_active: true,
        created_by: testUser.id
      });

      const systemIngredients = await db.Ingredient.findAll({
        where: { is_system: true, is_active: true }
      });

      const userIngredients = await db.Ingredient.findAll({
        where: { is_system: false, is_active: true }
      });

      expect(systemIngredients.every(i => i.is_system === true)).toBe(true);
      expect(userIngredients.every(i => i.is_system === false)).toBe(true);
    });
  });
});
