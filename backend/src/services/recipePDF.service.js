/**
 * Recipe PDF Service
 * Generates recipe PDFs using pdfkit
 */

const PDFDocument = require('pdfkit');
const db = require('../../../models');
const Recipe = db.Recipe;
const RecipeCategory = db.RecipeCategory;
const RecipeIngredient = db.RecipeIngredient;
const Ingredient = db.Ingredient;

// A4 page dimensions
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

// Color palette
const COLORS = {
  primary: '#2c3e50',
  secondary: '#7f8c8d',
  accent: '#27ae60',
  text: '#2c3e50',
  lightGray: '#ecf0f1',
  orange: '#e67e22',
  red: '#e74c3c',
  green: '#27ae60'
};

// Translations
const translations = {
  fr: {
    ingredients: 'Ingrédients',
    instructions: 'Instructions',
    prepTime: 'Préparation',
    cookTime: 'Cuisson',
    totalTime: 'Total',
    servings: 'Portions',
    difficulty: 'Difficulté',
    category: 'Catégorie',
    nutrition: 'Valeurs nutritionnelles par portion',
    calories: 'Calories',
    protein: 'Protéines',
    carbs: 'Glucides',
    fat: 'Lipides',
    fiber: 'Fibres',
    min: 'min',
    optional: 'optionnel',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    notes: 'Notes de votre diététicien',
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
    category: 'Category',
    nutrition: 'Nutrition per Serving',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbohydrates',
    fat: 'Fat',
    fiber: 'Fiber',
    min: 'min',
    optional: 'optional',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    notes: 'Notes from your dietitian',
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

/**
 * Get translations for a language
 */
const getTranslations = (lang = 'en') => translations[lang] || translations.en;

/**
 * Format time in minutes to human readable
 */
const formatTime = (minutes, t) => {
  if (!minutes) return null;
  if (minutes < 60) {
    return `${minutes} ${t.min}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}${t.min}` : `${hours}h`;
};

/**
 * Translate unit
 */
const translateUnit = (unit, t) => {
  return t[unit] || unit;
};

/**
 * Get difficulty label with color
 */
const getDifficulty = (difficulty, t) => {
  const config = {
    easy: { label: t.easy, color: COLORS.green },
    medium: { label: t.medium, color: COLORS.orange },
    hard: { label: t.hard, color: COLORS.red }
  };
  return config[difficulty] || config.medium;
};

/**
 * Strip HTML tags for plain text
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

/**
 * Generate recipe PDF
 * @param {string} recipeId - Recipe UUID
 * @param {string} language - Language code ('fr' or 'en')
 * @param {string} notes - Optional notes from dietitian for patient
 * @returns {Promise<PDFDocument>} PDF document stream
 */
const generateRecipePDF = async (recipeId, language = 'en', notes = '') => {
  try {
    // Fetch recipe with all related data
    const recipe = await Recipe.findOne({
      where: { id: recipeId, is_active: true },
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'default_unit', 'nutrition_per_100g']
          }],
          order: [['display_order', 'ASC']]
        }
      ]
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const t = getTranslations(language);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true
    });

    let y = MARGIN;

    // ============ HEADER ============
    // Category badge (if exists)
    if (recipe.category) {
      doc.fontSize(10)
        .fillColor(recipe.category.color || COLORS.accent)
        .text(`${recipe.category.icon || ''} ${recipe.category.name}`.trim(), MARGIN, y);
      y += 20;
    }

    // Title
    doc.fontSize(24)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(recipe.title, MARGIN, y, { width: PAGE_WIDTH - MARGIN * 2 });
    y = doc.y + 10;

    // Description
    if (recipe.description) {
      doc.fontSize(11)
        .fillColor(COLORS.secondary)
        .font('Helvetica')
        .text(recipe.description, MARGIN, y, { width: PAGE_WIDTH - MARGIN * 2 });
      y = doc.y + 15;
    }

    // ============ META INFO ROW ============
    const metaY = y;
    const metaItems = [];

    // Time info
    const prepTime = formatTime(recipe.prep_time_minutes, t);
    const cookTime = formatTime(recipe.cook_time_minutes, t);
    const totalTime = formatTime((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0), t);

    if (prepTime) metaItems.push({ label: t.prepTime, value: prepTime });
    if (cookTime) metaItems.push({ label: t.cookTime, value: cookTime });
    if (totalTime) metaItems.push({ label: t.totalTime, value: totalTime });
    if (recipe.servings) metaItems.push({ label: t.servings, value: recipe.servings.toString() });

    // Difficulty
    if (recipe.difficulty) {
      const diff = getDifficulty(recipe.difficulty, t);
      metaItems.push({ label: t.difficulty, value: diff.label, color: diff.color });
    }

    // Draw meta info in a row
    let metaX = MARGIN;
    const metaWidth = (PAGE_WIDTH - MARGIN * 2) / Math.min(metaItems.length, 5);

    metaItems.forEach((item, index) => {
      if (index > 0) {
        // Divider
        doc.strokeColor(COLORS.lightGray)
          .lineWidth(1)
          .moveTo(metaX - 5, metaY)
          .lineTo(metaX - 5, metaY + 35)
          .stroke();
      }

      doc.fontSize(8)
        .fillColor(COLORS.secondary)
        .font('Helvetica')
        .text(item.label, metaX, metaY);

      doc.fontSize(12)
        .fillColor(item.color || COLORS.primary)
        .font('Helvetica-Bold')
        .text(item.value, metaX, metaY + 14);

      metaX += metaWidth;
    });

    y = metaY + 50;

    // ============ HORIZONTAL LINE ============
    doc.strokeColor(COLORS.lightGray)
      .lineWidth(1)
      .moveTo(MARGIN, y)
      .lineTo(PAGE_WIDTH - MARGIN, y)
      .stroke();
    y += 20;

    // ============ INGREDIENTS SECTION ============
    const ingredientsX = MARGIN;
    const ingredientsWidth = 200;
    const instructionsX = ingredientsX + ingredientsWidth + 30;
    const instructionsWidth = PAGE_WIDTH - MARGIN - instructionsX;

    // Section title
    doc.fontSize(14)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(t.ingredients, ingredientsX, y);

    const ingredientStartY = y + 25;
    let ingredientY = ingredientStartY;

    // List ingredients
    const recipeIngredients = recipe.ingredients || [];
    recipeIngredients.forEach((ri) => {
      const ing = ri.ingredient;
      if (!ing) return;

      // Check for page break
      if (ingredientY > PAGE_HEIGHT - MARGIN - 50) {
        doc.addPage();
        ingredientY = MARGIN;
      }

      // Quantity and unit (translated)
      const unit = ri.unit || ing.default_unit || '';
      const translatedUnit = translateUnit(unit, t);
      const quantity = ri.quantity ? `${parseFloat(ri.quantity).toFixed(ri.quantity % 1 === 0 ? 0 : 1)} ${translatedUnit}`.trim() : '';

      // Bullet point
      doc.fontSize(10)
        .fillColor(COLORS.accent)
        .text('\u2022', ingredientsX, ingredientY);

      // Ingredient name
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .text(`${quantity} ${ing.name}`, ingredientsX + 12, ingredientY, { width: ingredientsWidth - 15 });

      // Optional tag
      if (ri.is_optional) {
        doc.fontSize(8)
          .fillColor(COLORS.secondary)
          .font('Helvetica-Oblique')
          .text(` (${t.optional})`, ingredientsX + 12 + doc.widthOfString(`${quantity} ${ing.name}`), ingredientY);
      }

      // Notes
      if (ri.notes) {
        ingredientY = doc.y + 2;
        doc.fontSize(8)
          .fillColor(COLORS.secondary)
          .font('Helvetica-Oblique')
          .text(ri.notes, ingredientsX + 12, ingredientY, { width: ingredientsWidth - 15 });
      }

      ingredientY = doc.y + 8;
    });

    // ============ INSTRUCTIONS SECTION ============
    doc.fontSize(14)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(t.instructions, instructionsX, y);

    let instructionY = y + 25;

    // Parse and display instructions
    const instructionsText = stripHtml(recipe.instructions || '');
    const steps = instructionsText.split(/\n\n+/).filter(s => s.trim());

    steps.forEach((step, index) => {
      // Check for page break
      if (instructionY > PAGE_HEIGHT - MARGIN - 60) {
        doc.addPage();
        instructionY = MARGIN;
      }

      // Step number
      doc.fontSize(11)
        .fillColor(COLORS.accent)
        .font('Helvetica-Bold')
        .text(`${index + 1}.`, instructionsX, instructionY);

      // Step text
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .text(step.trim(), instructionsX + 20, instructionY, { width: instructionsWidth - 20 });

      instructionY = doc.y + 12;
    });

    // Determine where to continue (below ingredients or instructions)
    y = Math.max(ingredientY, instructionY) + 20;

    // ============ NUTRITION SECTION (if available) ============
    const nutrition = recipe.nutrition_per_serving;
    if (nutrition && Object.keys(nutrition).length > 0) {
      // Check for page break
      if (y > PAGE_HEIGHT - MARGIN - 120) {
        doc.addPage();
        y = MARGIN;
      }

      // Section title
      doc.fontSize(12)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .text(t.nutrition, MARGIN, y);
      y += 20;

      // Nutrition info in columns
      const nutritionItems = [];
      if (nutrition.calories) nutritionItems.push({ label: t.calories, value: `${nutrition.calories} kcal` });
      if (nutrition.protein) nutritionItems.push({ label: t.protein, value: `${nutrition.protein}g` });
      if (nutrition.carbs) nutritionItems.push({ label: t.carbs, value: `${nutrition.carbs}g` });
      if (nutrition.fat) nutritionItems.push({ label: t.fat, value: `${nutrition.fat}g` });
      if (nutrition.fiber) nutritionItems.push({ label: t.fiber, value: `${nutrition.fiber}g` });

      let nutX = MARGIN;
      const nutWidth = (PAGE_WIDTH - MARGIN * 2) / nutritionItems.length;

      nutritionItems.forEach((item) => {
        doc.fontSize(8)
          .fillColor(COLORS.secondary)
          .font('Helvetica')
          .text(item.label, nutX, y);

        doc.fontSize(11)
          .fillColor(COLORS.primary)
          .font('Helvetica-Bold')
          .text(item.value, nutX, y + 12);

        nutX += nutWidth;
      });

      y += 40;
    }

    // ============ DIETITIAN NOTES (if provided) ============
    if (notes && notes.trim()) {
      // Check for page break
      if (y > PAGE_HEIGHT - MARGIN - 100) {
        doc.addPage();
        y = MARGIN;
      }

      // Box background
      const boxHeight = 80;
      doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, boxHeight)
        .fillColor('#f8f9fa')
        .fill();

      // Section title
      doc.fontSize(11)
        .fillColor(COLORS.accent)
        .font('Helvetica-Bold')
        .text(t.notes, MARGIN + 15, y + 15);

      // Notes text
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .text(notes.trim(), MARGIN + 15, y + 32, {
          width: PAGE_WIDTH - MARGIN * 2 - 30,
          height: boxHeight - 45
        });

      y += boxHeight + 20;
    }

    // ============ TAGS FOOTER ============
    if (recipe.tags && recipe.tags.length > 0) {
      // Check for page break
      if (y > PAGE_HEIGHT - MARGIN - 40) {
        doc.addPage();
        y = MARGIN;
      }

      let tagX = MARGIN;
      recipe.tags.forEach((tag) => {
        const tagText = `#${tag}`;
        const tagWidth = doc.widthOfString(tagText) + 16;

        doc.rect(tagX, y, tagWidth, 20)
          .fillColor(COLORS.lightGray)
          .fill();

        doc.fontSize(9)
          .fillColor(COLORS.secondary)
          .font('Helvetica')
          .text(tagText, tagX + 8, y + 5);

        tagX += tagWidth + 8;
      });
    }

    // Finalize PDF
    doc.end();

    return doc;
  } catch (error) {
    console.error('Error generating recipe PDF:', error);
    throw new Error(`Failed to generate recipe PDF: ${error.message}`);
  }
};

module.exports = {
  generateRecipePDF
};
