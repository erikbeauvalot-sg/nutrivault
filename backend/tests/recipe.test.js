/**
 * Recipe Module Tests
 * Tests for Recipe, RecipeCategory, Ingredient models and services
 */

const testDb = require('./setup/testDb');

describe('Recipe Module', () => {
  let db;
  let testUser;
  let testPatient;
  let testCategory;
  let testRecipe;
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
      username: 'recipeuser',
      email: 'recipe@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Recipe',
      last_name: 'Tester',
      role_id: adminRole.id,
      is_active: true
    });

    // Create test patient
    testPatient = await db.Patient.create({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      is_active: true
    });

    // Create test category
    testCategory = await db.RecipeCategory.create({
      name: 'Breakfast',
      description: 'Morning meals',
      icon: '🍳',
      color: '#FFD700',
      display_order: 1,
      created_by: testUser.id,
      is_active: true
    });

    // Create test ingredient
    testIngredient = await db.Ingredient.create({
      name: 'Chicken Breast',
      name_normalized: 'chicken breast',
      category: 'proteins',
      default_unit: 'g',
      nutrition_per_100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
      is_system: true,
      is_active: true,
      created_by: testUser.id
    });

    // Create test recipe
    testRecipe = await db.Recipe.create({
      title: 'Grilled Chicken Salad',
      slug: 'grilled-chicken-salad',
      description: 'A healthy grilled chicken salad',
      instructions: 'Step 1: Grill chicken\nStep 2: Prepare salad',
      prep_time_minutes: 15,
      cook_time_minutes: 20,
      servings: 2,
      difficulty: 'easy',
      status: 'draft',
      category_id: testCategory.id,
      created_by: testUser.id,
      is_active: true
    });
  });

  // ========================================
  // RecipeCategory Model Tests
  // ========================================
  describe('RecipeCategory Model', () => {
    it('creates a category with valid data', async () => {
      const category = await db.RecipeCategory.create({
        name: 'Lunch',
        description: 'Midday meals',
        icon: '🥗',
        color: '#32CD32',
        display_order: 2,
        created_by: testUser.id,
        is_active: true
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Lunch');
      expect(category.icon).toBe('🥗');
    });

    it('requires name field', async () => {
      await expect(db.RecipeCategory.create({
        description: 'No name category',
        created_by: testUser.id
      })).rejects.toThrow();
    });
  });

  // ========================================
  // Recipe Model Tests
  // ========================================
  describe('Recipe Model', () => {
    it('creates a recipe with valid data', async () => {
      expect(testRecipe.id).toBeDefined();
      expect(testRecipe.title).toBe('Grilled Chicken Salad');
      expect(testRecipe.slug).toContain('grilled-chicken-salad'); // Slug includes timestamp
      expect(testRecipe.status).toBe('draft');
    });

    it('generates slug automatically if not provided', async () => {
      const recipe = await db.Recipe.create({
        title: 'My Amazing Recipe',
        description: 'Test recipe',
        created_by: testUser.id,
        is_active: true
      });

      expect(recipe.slug).toContain('my-amazing-recipe');
    });

    it('requires title field', async () => {
      await expect(db.Recipe.create({
        description: 'No title recipe',
        created_by: testUser.id
      })).rejects.toThrow();
    });

    it('validates difficulty enum', async () => {
      const recipe = await db.Recipe.create({
        title: 'Hard Recipe',
        difficulty: 'hard',
        created_by: testUser.id,
        is_active: true
      });

      expect(recipe.difficulty).toBe('hard');
    });

    it('validates status enum', async () => {
      const recipe = await db.Recipe.create({
        title: 'Published Recipe',
        status: 'published',
        created_by: testUser.id,
        is_active: true
      });

      expect(recipe.status).toBe('published');
    });

    it('associates with category', async () => {
      const recipe = await db.Recipe.findByPk(testRecipe.id, {
        include: [{ model: db.RecipeCategory, as: 'category' }]
      });

      expect(recipe.category).toBeDefined();
      expect(recipe.category.name).toBe('Breakfast');
    });
  });

  // ========================================
  // Ingredient Model Tests
  // ========================================
  describe('Ingredient Model', () => {
    it('creates an ingredient with valid data', async () => {
      expect(testIngredient.id).toBeDefined();
      expect(testIngredient.name).toBe('Chicken Breast');
      expect(testIngredient.name_normalized).toBe('chicken breast');
      expect(testIngredient.category).toBe('proteins');
    });

    it('stores nutrition data as JSON', async () => {
      expect(testIngredient.nutrition_per_100g).toBeDefined();
      expect(testIngredient.nutrition_per_100g.calories).toBe(165);
      expect(testIngredient.nutrition_per_100g.protein).toBe(31);
    });

    it('requires name field', async () => {
      await expect(db.Ingredient.create({
        category: 'proteins',
        created_by: testUser.id
      })).rejects.toThrow();
    });
  });

  // ========================================
  // RecipeIngredient Model Tests
  // ========================================
  describe('RecipeIngredient Model', () => {
    it('creates a recipe-ingredient association', async () => {
      const recipeIngredient = await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 200,
        unit: 'g',
        notes: 'Boneless, skinless',
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
      expect(recipe.ingredients[0].ingredient.name).toBe('Chicken Breast');
    });
  });

  // ========================================
  // RecipePatientAccess Model Tests
  // ========================================
  describe('RecipePatientAccess Model', () => {
    it('creates a recipe share with patient', async () => {
      // First publish the recipe
      await testRecipe.update({ status: 'published' });

      const access = await db.RecipePatientAccess.create({
        recipe_id: testRecipe.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        notes: 'Recommended for your diet plan',
        shared_at: new Date(),
        is_active: true
      });

      expect(access.id).toBeDefined();
      expect(access.notes).toBe('Recommended for your diet plan');
    });

    it('fetches shared recipes for a patient', async () => {
      await testRecipe.update({ status: 'published' });

      await db.RecipePatientAccess.create({
        recipe_id: testRecipe.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        shared_at: new Date(),
        is_active: true
      });

      const shares = await db.RecipePatientAccess.findAll({
        where: { patient_id: testPatient.id, is_active: true },
        include: [{ model: db.Recipe, as: 'recipe' }]
      });

      expect(shares).toHaveLength(1);
      expect(shares[0].recipe.title).toBe('Grilled Chicken Salad');
    });

    it('soft deletes access when revoking', async () => {
      await testRecipe.update({ status: 'published' });

      const access = await db.RecipePatientAccess.create({
        recipe_id: testRecipe.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        shared_at: new Date(),
        is_active: true
      });

      await access.update({ is_active: false });

      const activeShares = await db.RecipePatientAccess.findAll({
        where: { patient_id: testPatient.id, is_active: true }
      });

      expect(activeShares).toHaveLength(0);
    });
  });

  // ========================================
  // Recipe Workflow Tests
  // ========================================
  describe('Recipe Workflow', () => {
    it('publishes a draft recipe', async () => {
      expect(testRecipe.status).toBe('draft');

      await testRecipe.update({ status: 'published' });

      expect(testRecipe.status).toBe('published');
    });

    it('archives a published recipe', async () => {
      await testRecipe.update({ status: 'published' });
      await testRecipe.update({ status: 'archived' });

      expect(testRecipe.status).toBe('archived');
    });

    it('soft deletes a recipe', async () => {
      await testRecipe.update({ is_active: false });

      const deletedRecipe = await db.Recipe.findOne({
        where: { id: testRecipe.id, is_active: true }
      });

      expect(deletedRecipe).toBeNull();
    });
  });

  // ========================================
  // Recipe PDF Translation Tests
  // ========================================
  describe('Recipe PDF Translation Helpers', () => {
    const translations = {
      fr: {
        ingredients: 'Ingrédients',
        instructions: 'Instructions',
        prepTime: 'Préparation',
        cookTime: 'Cuisson',
        totalTime: 'Total',
        servings: 'Portions',
        difficulty: 'Difficulté',
        min: 'min',
        optional: 'optionnel',
        easy: 'Facile',
        medium: 'Moyen',
        hard: 'Difficile',
        // Units
        g: 'g',
        kg: 'kg',
        ml: 'ml',
        l: 'L',
        cup: 'tasse',
        tbsp: 'c. à soupe',
        tsp: 'c. à café',
        piece: 'pièce',
        slice: 'tranche'
      },
      en: {
        ingredients: 'Ingredients',
        instructions: 'Instructions',
        prepTime: 'Prep Time',
        cookTime: 'Cook Time',
        totalTime: 'Total Time',
        servings: 'Servings',
        difficulty: 'Difficulty',
        min: 'min',
        optional: 'optional',
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        // Units
        g: 'g',
        kg: 'kg',
        ml: 'ml',
        l: 'L',
        cup: 'cup',
        tbsp: 'tbsp',
        tsp: 'tsp',
        piece: 'piece',
        slice: 'slice'
      }
    };

    const translateUnit = (unit, t) => t[unit] || unit;
    const formatTime = (minutes, t) => {
      if (!minutes) return null;
      if (minutes < 60) return `${minutes} ${t.min}`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}${t.min}` : `${hours}h`;
    };

    it('translates units to French', () => {
      const t = translations.fr;
      expect(translateUnit('cup', t)).toBe('tasse');
      expect(translateUnit('tbsp', t)).toBe('c. à soupe');
      expect(translateUnit('tsp', t)).toBe('c. à café');
      expect(translateUnit('piece', t)).toBe('pièce');
      expect(translateUnit('slice', t)).toBe('tranche');
    });

    it('translates units to English', () => {
      const t = translations.en;
      expect(translateUnit('cup', t)).toBe('cup');
      expect(translateUnit('tbsp', t)).toBe('tbsp');
      expect(translateUnit('tsp', t)).toBe('tsp');
      expect(translateUnit('piece', t)).toBe('piece');
      expect(translateUnit('slice', t)).toBe('slice');
    });

    it('preserves unknown units', () => {
      const t = translations.fr;
      expect(translateUnit('oz', t)).toBe('oz');
      expect(translateUnit('lb', t)).toBe('lb');
    });

    it('translates difficulty levels to French', () => {
      const t = translations.fr;
      expect(t.easy).toBe('Facile');
      expect(t.medium).toBe('Moyen');
      expect(t.hard).toBe('Difficile');
    });

    it('translates difficulty levels to English', () => {
      const t = translations.en;
      expect(t.easy).toBe('Easy');
      expect(t.medium).toBe('Medium');
      expect(t.hard).toBe('Hard');
    });

    it('formats time correctly in French', () => {
      const t = translations.fr;
      expect(formatTime(15, t)).toBe('15 min');
      expect(formatTime(60, t)).toBe('1h');
      expect(formatTime(90, t)).toBe('1h 30min');
    });

    it('formats time correctly in English', () => {
      const t = translations.en;
      expect(formatTime(15, t)).toBe('15 min');
      expect(formatTime(60, t)).toBe('1h');
      expect(formatTime(90, t)).toBe('1h 30min');
    });

    it('translates section headers to French', () => {
      const t = translations.fr;
      expect(t.ingredients).toBe('Ingrédients');
      expect(t.instructions).toBe('Instructions');
      expect(t.prepTime).toBe('Préparation');
      expect(t.cookTime).toBe('Cuisson');
      expect(t.servings).toBe('Portions');
    });

    it('translates section headers to English', () => {
      const t = translations.en;
      expect(t.ingredients).toBe('Ingredients');
      expect(t.instructions).toBe('Instructions');
      expect(t.prepTime).toBe('Prep Time');
      expect(t.cookTime).toBe('Cook Time');
      expect(t.servings).toBe('Servings');
    });
  });

  // ========================================
  // Recipe Ingredient Units Tests
  // ========================================
  describe('Recipe Ingredient Units', () => {
    it('supports various unit types', async () => {
      const units = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

      for (const unit of units) {
        const recipeIngredient = await db.RecipeIngredient.create({
          recipe_id: testRecipe.id,
          ingredient_id: testIngredient.id,
          quantity: 1,
          unit: unit,
          display_order: 1
        });
        expect(recipeIngredient.unit).toBe(unit);
        await recipeIngredient.destroy();
      }
    });

    it('stores quantity as decimal', async () => {
      const recipeIngredient = await db.RecipeIngredient.create({
        recipe_id: testRecipe.id,
        ingredient_id: testIngredient.id,
        quantity: 0.5,
        unit: 'cup',
        display_order: 1
      });

      expect(recipeIngredient.quantity).toBe(0.5);
    });
  });
});
