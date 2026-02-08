/**
 * Recipe Import/Export Service
 *
 * Handles exporting recipes to JSON and importing recipes from JSON
 * with automatic ingredient/category resolution.
 */

const db = require('../../../models');
const Recipe = db.Recipe;
const RecipeCategory = db.RecipeCategory;
const RecipeIngredient = db.RecipeIngredient;
const Ingredient = db.Ingredient;
const User = db.User;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

const EXPORT_VERSION = '1.0';
const EXPORT_TYPE = 'nutrivault-recipes';

const recipeIncludes = [
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
      attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
    }],
    order: [['display_order', 'ASC']]
  }
];

/**
 * Transform a recipe record into the portable export format
 */
function transformRecipeForExport(recipe) {
  const data = recipe.toJSON ? recipe.toJSON() : recipe;

  return {
    title: data.title,
    description: data.description || '',
    instructions: data.instructions || '',
    prep_time_minutes: data.prep_time_minutes || null,
    cook_time_minutes: data.cook_time_minutes || null,
    servings: data.servings || 4,
    difficulty: data.difficulty || 'medium',
    tags: data.tags || [],
    nutrition_per_serving: data.nutrition_per_serving || {},
    category: data.category ? data.category.name : null,
    ingredients: (data.ingredients || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(ri => ({
        name: ri.ingredient ? ri.ingredient.name : 'Unknown',
        quantity: ri.quantity ? parseFloat(ri.quantity) : null,
        unit: ri.unit || 'g',
        notes: ri.notes || '',
        is_optional: ri.is_optional || false,
        display_order: ri.display_order || 0
      }))
  };
}

/**
 * Export multiple recipes as JSON
 *
 * @param {string[]} recipeIds - Array of recipe IDs to export (empty = all active)
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Export data object
 */
async function exportRecipes(recipeIds, user, requestMetadata = {}) {
  try {
    let whereClause = { is_active: true };

    if (recipeIds && recipeIds.length > 0) {
      whereClause.id = { [Op.in]: recipeIds };
    }

    const recipes = await Recipe.findAll({
      where: whereClause,
      include: recipeIncludes,
      order: [['title', 'ASC']]
    });

    const exportData = {
      version: EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      exportedBy: user.username,
      type: EXPORT_TYPE,
      recipes: recipes.map(transformRecipeForExport)
    };

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipes',
      changes: { action: 'export', recipe_count: recipes.length },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return exportData;
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'READ',
      resource_type: 'recipes',
      changes: { action: 'export' },
      status_code: error.statusCode || 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Export a single recipe as JSON
 *
 * @param {string} recipeId - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Export data object
 */
async function exportSingleRecipe(recipeId, user, requestMetadata = {}) {
  const recipe = await Recipe.findOne({
    where: { id: recipeId, is_active: true },
    include: recipeIncludes
  });

  if (!recipe) {
    const error = new Error('Recipe not found');
    error.statusCode = 404;
    throw error;
  }

  const exportData = {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    exportedBy: user.username,
    type: EXPORT_TYPE,
    recipes: [transformRecipeForExport(recipe)]
  };

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'READ',
    resource_type: 'recipes',
    resource_id: recipeId,
    changes: { action: 'export' },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent,
    request_method: requestMetadata.method,
    request_path: requestMetadata.path,
    status_code: 200
  });

  return exportData;
}

/**
 * Import recipes from JSON data
 *
 * @param {Object} importData - Parsed JSON import data
 * @param {Object} options - Import options
 * @param {string} options.duplicateHandling - 'skip' or 'rename'
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Import summary
 */
async function importRecipes(importData, options = {}, user, requestMetadata = {}) {
  const { duplicateHandling = 'skip' } = options;

  // Validate structure
  if (!importData || !importData.version || importData.type !== EXPORT_TYPE) {
    const error = new Error('Invalid import file: missing version or incorrect type');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(importData.recipes) || importData.recipes.length === 0) {
    const error = new Error('Invalid import file: no recipes found');
    error.statusCode = 400;
    throw error;
  }

  const summary = {
    created: 0,
    skipped: 0,
    errors: [],
    ingredientsCreated: [],
    categoriesCreated: []
  };

  const transaction = await db.sequelize.transaction();

  try {
    for (const recipeData of importData.recipes) {
      try {
        if (!recipeData.title) {
          summary.errors.push({ title: '(unnamed)', reason: 'Missing title' });
          continue;
        }

        // Check for duplicates by title
        const existingRecipe = await Recipe.findOne({
          where: {
            title: recipeData.title,
            is_active: true
          },
          transaction
        });

        if (existingRecipe) {
          if (duplicateHandling === 'skip') {
            summary.skipped++;
            continue;
          }
          // rename: append "(imported)"
          recipeData.title = `${recipeData.title} (imported)`;
        }

        // Resolve category
        let categoryId = null;
        if (recipeData.category) {
          const normalizedCatName = recipeData.category.toLowerCase().trim();
          let category = await RecipeCategory.findOne({
            where: db.sequelize.where(
              db.sequelize.fn('lower', db.sequelize.col('name')),
              normalizedCatName
            ),
            transaction
          });

          if (!category) {
            category = await RecipeCategory.create({
              name: recipeData.category.trim(),
              created_by: user.id
            }, { transaction });
            summary.categoriesCreated.push(category.name);
          }

          categoryId = category.id;
        }

        // Generate slug
        let slug = Recipe.generateSlug(recipeData.title);
        const existingSlug = await Recipe.findOne({
          where: { slug },
          transaction
        });
        if (existingSlug) {
          slug = `${slug}-${Date.now()}`;
        }

        // Create recipe (always as draft)
        const newRecipe = await Recipe.create({
          title: recipeData.title,
          slug,
          description: recipeData.description || null,
          instructions: recipeData.instructions || null,
          prep_time_minutes: recipeData.prep_time_minutes || null,
          cook_time_minutes: recipeData.cook_time_minutes || null,
          servings: recipeData.servings || 4,
          difficulty: ['easy', 'medium', 'hard'].includes(recipeData.difficulty) ? recipeData.difficulty : 'medium',
          status: 'draft',
          tags: recipeData.tags || [],
          nutrition_per_serving: recipeData.nutrition_per_serving || {},
          category_id: categoryId,
          created_by: user.id
        }, { transaction });

        // Resolve and create ingredients
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
          for (let i = 0; i < recipeData.ingredients.length; i++) {
            const ingData = recipeData.ingredients[i];
            if (!ingData.name) continue;

            // Resolve ingredient by normalized name
            const normalizedName = ingData.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();

            let ingredient = await Ingredient.findOne({
              where: { name_normalized: normalizedName },
              transaction
            });

            if (!ingredient) {
              ingredient = await Ingredient.create({
                name: ingData.name.trim(),
                name_normalized: normalizedName,
                default_unit: ingData.unit || 'g',
                created_by: user.id
              }, { transaction });
              summary.ingredientsCreated.push(ingredient.name);
            }

            await RecipeIngredient.create({
              recipe_id: newRecipe.id,
              ingredient_id: ingredient.id,
              quantity: ingData.quantity || null,
              unit: ingData.unit || 'g',
              notes: ingData.notes || null,
              is_optional: ingData.is_optional || false,
              display_order: ingData.display_order !== undefined ? ingData.display_order : i
            }, { transaction });
          }
        }

        summary.created++;
      } catch (recipeError) {
        summary.errors.push({
          title: recipeData.title || '(unnamed)',
          reason: recipeError.message
        });
      }
    }

    await transaction.commit();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipes',
      changes: {
        action: 'import',
        created: summary.created,
        skipped: summary.skipped,
        errors: summary.errors.length,
        ingredientsCreated: summary.ingredientsCreated.length,
        categoriesCreated: summary.categoriesCreated.length
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return summary;
  } catch (error) {
    await transaction.rollback();

    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'CREATE',
      resource_type: 'recipes',
      changes: { action: 'import' },
      status_code: error.statusCode || 500,
      error_message: error.message
    });

    throw error;
  }
}

// ============================================
// URL Import (Schema.org/Recipe scraper)
// ============================================

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate that a URL does not target private/internal networks (SSRF prevention)
 */
function isUrlAllowed(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') return false;

  // Block private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return false;                        // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false;           // 192.168.0.0/16
    if (a === 0) return false;                          // 0.0.0.0/8
  }

  return true;
}

/**
 * Strip HTML tags from a string (basic sanitization for imported text)
 */
function stripHtml(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Parse ISO 8601 duration (PT30M, PT1H30M, etc.) to minutes
 */
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes || null;
}

/**
 * Extract JSON-LD blocks from HTML and find a Recipe object
 */
function extractRecipeFromHtml(html) {
  const jsonLdBlocks = [];
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      jsonLdBlocks.push(JSON.parse(match[1]));
    } catch {
      // skip malformed JSON-LD
    }
  }

  for (const block of jsonLdBlocks) {
    if (block['@type'] === 'Recipe') return block;

    if (Array.isArray(block)) {
      const recipe = block.find(item => item['@type'] === 'Recipe');
      if (recipe) return recipe;
    }

    if (block['@graph'] && Array.isArray(block['@graph'])) {
      const recipe = block['@graph'].find(item => item['@type'] === 'Recipe');
      if (recipe) return recipe;
    }
  }

  return null;
}

/**
 * French unit patterns — checked before the English regex.
 * Order matters: longer patterns first to avoid partial matches.
 */
const FRENCH_UNIT_PATTERNS = [
  // Full forms
  { pattern: /cuill[eè]res?\s+[àa]\s+caf[ée]/i, unit: 'tsp' },
  { pattern: /cuill[eè]res?\s+[àa]\s+soupe/i, unit: 'tbsp' },
  { pattern: /cuill[eè]res?\s+[àa]\s+th[ée]/i, unit: 'tsp' },
  // Abbreviated forms (c. à café, c. à soupe, c. à thé)
  { pattern: /c\.\s*[àa]\s*caf[ée]/i, unit: 'tsp' },
  { pattern: /c\.\s*[àa]\s*soupe/i, unit: 'tbsp' },
  { pattern: /c\.\s*[àa]\s*th[ée]/i, unit: 'tsp' },
  { pattern: /c\.\s*[àa]\s*s\./i, unit: 'tbsp' },
  { pattern: /c\.\s*[àa]\s*c\./i, unit: 'tsp' },
  // Short abbreviations
  { pattern: /\bcas\b/i, unit: 'tbsp' },
  { pattern: /\bcac\b/i, unit: 'tsp' },
  { pattern: /\bcs\b/i, unit: 'tbsp' },
  { pattern: /\bcc\b/i, unit: 'tsp' },
  // Other French units
  { pattern: /gousses?/i, unit: 'piece' },
  { pattern: /pinc[ée]es?/i, unit: 'pinch' },
  { pattern: /tranches?/i, unit: 'slice' },
  { pattern: /bottes?/i, unit: 'piece' },
  { pattern: /branches?/i, unit: 'piece' },
  { pattern: /tasses?/i, unit: 'cup' },
  { pattern: /verres?/i, unit: 'cup' },
  { pattern: /morceaux?/i, unit: 'piece' },
  { pattern: /feuilles?/i, unit: 'piece' },
  { pattern: /poign[ée]es?/i, unit: 'piece' },
  { pattern: /sachets?/i, unit: 'piece' },
  { pattern: /bo[iî]tes?/i, unit: 'can' },
  { pattern: /barquettes?/i, unit: 'piece' },
];

/**
 * Try to extract a French unit from a cleaned ingredient string.
 * Returns { quantity, unit, name } or null if no French unit found.
 */
function extractFrenchUnit(cleaned) {
  // Match leading quantity: digits, fractions, slashes, dots, commas
  const qtyRegex = /^([\d\u00BC\u00BD\u00BE\u2153\u2154\u215B\u215C\u215D\u215E/.,\s]+)/;
  const qtyMatch = cleaned.match(qtyRegex);
  const quantityStr = qtyMatch ? qtyMatch[1].trim() : '';
  const afterQty = qtyMatch ? cleaned.slice(qtyMatch[0].length).trim() : cleaned;

  for (const { pattern, unit } of FRENCH_UNIT_PATTERNS) {
    const unitMatch = afterQty.match(pattern);
    if (unitMatch && unitMatch.index === 0) {
      let name = afterQty.slice(unitMatch[0].length).trim();
      // Strip leading "de ", "d'", "du ", "des "
      name = name.replace(/^d[eu]s?\s+|^d'/i, '').trim();
      if (!name) continue; // unit matched but nothing left — skip
      return {
        name,
        quantity: parseQuantity(quantityStr),
        unit
      };
    }
  }

  return null;
}

/**
 * Parse a recipeIngredient string like "2 cups all-purpose flour" into parts
 */
function parseIngredientString(str) {
  if (!str || typeof str !== 'string') return null;

  const cleaned = str.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  // Try French units first
  const frenchResult = extractFrenchUnit(cleaned);
  if (frenchResult) return frenchResult;

  const unitPattern = /^([\d\u00BC\u00BD\u00BE\u2153\u2154\u215B\u215C\u215D\u215E/.,\s]+)?\s*(cups?|tablespoons?|tbsps?|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|pieces?|pinch(?:es)?|cloves?|cans?|slices?|stalks?|sprigs?|heads?|bunche?s?)?\s*(?:of\s+)?(.+)/i;

  const match = cleaned.match(unitPattern);
  if (!match) {
    return { name: cleaned, quantity: null, unit: null };
  }

  let quantityStr = (match[1] || '').trim();
  let unit = (match[2] || '').trim().toLowerCase() || null;
  let name = (match[3] || '').trim();

  if (!name && !unit) {
    return { name: cleaned, quantity: null, unit: null };
  }
  if (!name && unit) {
    return { name: unit, quantity: parseQuantity(quantityStr), unit: null };
  }

  return {
    name,
    quantity: parseQuantity(quantityStr),
    unit: normalizeUnit(unit)
  };
}

function parseQuantity(str) {
  if (!str) return null;
  str = str.trim();

  const fractionMap = {
    '\u00BC': 0.25, '\u00BD': 0.5, '\u00BE': 0.75,
    '\u2153': 0.333, '\u2154': 0.667,
    '\u215B': 0.125, '\u215C': 0.375, '\u215D': 0.625, '\u215E': 0.875
  };
  for (const [frac, val] of Object.entries(fractionMap)) {
    if (str.includes(frac)) {
      const rest = str.replace(frac, '').trim();
      const whole = rest ? parseFloat(rest) : 0;
      return isNaN(whole) ? val : whole + val;
    }
  }

  const slashMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (slashMatch) {
    return parseInt(slashMatch[1], 10) + parseInt(slashMatch[2], 10) / parseInt(slashMatch[3], 10);
  }
  const simpleFrac = str.match(/^(\d+)\/(\d+)$/);
  if (simpleFrac) {
    return parseInt(simpleFrac[1], 10) / parseInt(simpleFrac[2], 10);
  }

  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? null : num;
}

function normalizeUnit(unit) {
  if (!unit) return null;
  const map = {
    cup: 'cup', cups: 'cup',
    tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp',
    ounce: 'oz', ounces: 'oz', oz: 'oz',
    pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
    gram: 'g', grams: 'g', g: 'g',
    kilogram: 'kg', kilograms: 'kg', kg: 'kg',
    milliliter: 'ml', milliliters: 'ml', ml: 'ml',
    liter: 'l', liters: 'l', l: 'l',
    piece: 'piece', pieces: 'piece',
    pinch: 'pinch', pinches: 'pinch',
    clove: 'piece', cloves: 'piece',
    can: 'can', cans: 'can',
    slice: 'slice', slices: 'slice',
    stalk: 'piece', stalks: 'piece',
    sprig: 'piece', sprigs: 'piece',
    head: 'piece', heads: 'piece',
    bunch: 'piece', bunches: 'piece'
  };
  return map[unit.toLowerCase()] || unit.toLowerCase();
}

/**
 * Convert recipeInstructions (string, array of strings, or HowToStep[]) to text
 */
function parseInstructions(instructions) {
  if (!instructions) return null;
  if (typeof instructions === 'string') return instructions;

  if (Array.isArray(instructions)) {
    return instructions.map((step, i) => {
      if (typeof step === 'string') return `${i + 1}. ${step}`;
      if (step.text) return `${i + 1}. ${step.text}`;
      if (step.name) return `${i + 1}. ${step.name}`;
      return null;
    }).filter(Boolean).join('\n');
  }

  return null;
}

/**
 * Parse nutrition info from schema.org NutritionInformation
 */
function parseNutrition(nutrition) {
  if (!nutrition) return {};

  const result = {};
  const extractNum = (val) => {
    if (!val) return null;
    const num = parseFloat(String(val).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
  };

  const cal = extractNum(nutrition.calories);
  if (cal) result.calories = cal;
  const protein = extractNum(nutrition.proteinContent);
  if (protein) result.protein = protein;
  const carbs = extractNum(nutrition.carbohydrateContent);
  if (carbs) result.carbs = carbs;
  const fat = extractNum(nutrition.fatContent);
  if (fat) result.fat = fat;
  const fiber = extractNum(nutrition.fiberContent);
  if (fiber) result.fiber = fiber;
  const sodium = extractNum(nutrition.sodiumContent);
  if (sodium) result.sodium = sodium;
  const sugar = extractNum(nutrition.sugarContent);
  if (sugar) result.sugar = sugar;

  return result;
}

/**
 * Parse keywords from schema.org (can be string or array)
 */
function parseKeywords(keywords) {
  if (!keywords) return [];
  if (Array.isArray(keywords)) return keywords.map(k => String(k).trim()).filter(Boolean);
  if (typeof keywords === 'string') {
    return keywords.split(',').map(k => k.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Extract image URL from schema.org image field
 */
function parseImageUrl(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return image[0] || null;
  if (image.url) return image.url;
  return null;
}

/**
 * Parse servings from recipeYield (can be "4", "4 servings", ["4 servings"])
 */
function parseServings(recipeYield) {
  if (!recipeYield) return 4;
  const yieldStr = Array.isArray(recipeYield) ? recipeYield[0] : String(recipeYield);
  const num = parseInt(yieldStr, 10);
  return isNaN(num) || num < 1 ? 4 : num;
}

/**
 * Import a recipe from a URL by scraping schema.org/Recipe JSON-LD
 *
 * @param {string} url - The URL to fetch
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} The created recipe with summary info
 */
async function importFromUrl(url, user, requestMetadata = {}) {
  // SSRF validation
  if (!isUrlAllowed(url)) {
    const error = new Error('URL not allowed: private/internal addresses are blocked');
    error.statusCode = 400;
    throw error;
  }

  // Fetch the page HTML
  let html;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NutriVault/1.0; +https://nutrivault.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const error = new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      error.statusCode = 400;
      throw error;
    }

    // Check Content-Length if available
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_RESPONSE_SIZE) {
      const error = new Error('Response too large');
      error.statusCode = 400;
      throw error;
    }

    // Read body with size limit
    const reader = response.body.getReader();
    const chunks = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        const error = new Error('Response too large');
        error.statusCode = 400;
        throw error;
      }
      chunks.push(value);
    }
    html = Buffer.concat(chunks).toString('utf-8');
  } catch (fetchError) {
    if (fetchError.statusCode) throw fetchError;
    const error = new Error(`Could not fetch URL: ${fetchError.message}`);
    error.statusCode = 400;
    throw error;
  }

  // Extract Recipe from JSON-LD
  const schemaRecipe = extractRecipeFromHtml(html);
  if (!schemaRecipe) {
    const error = new Error('No recipe data found on this page. The page may not contain structured recipe data (schema.org/Recipe).');
    error.statusCode = 400;
    throw error;
  }

  // Map schema.org fields to NutriVault format
  const title = schemaRecipe.name;
  if (!title) {
    const error = new Error('Recipe found but has no title');
    error.statusCode = 400;
    throw error;
  }

  const recipeData = {
    title: stripHtml(String(title)).substring(0, 200),
    description: schemaRecipe.description ? stripHtml(String(schemaRecipe.description)) : null,
    instructions: stripHtml(parseInstructions(schemaRecipe.recipeInstructions)),
    prep_time_minutes: parseDuration(schemaRecipe.prepTime),
    cook_time_minutes: parseDuration(schemaRecipe.cookTime),
    servings: parseServings(schemaRecipe.recipeYield),
    tags: parseKeywords(schemaRecipe.keywords),
    nutrition_per_serving: parseNutrition(schemaRecipe.nutrition),
    image_url: parseImageUrl(schemaRecipe.image),
    source_url: url,
    category: schemaRecipe.recipeCategory
      ? (Array.isArray(schemaRecipe.recipeCategory) ? schemaRecipe.recipeCategory[0] : schemaRecipe.recipeCategory)
      : null,
    ingredients: (schemaRecipe.recipeIngredient || []).map(str => parseIngredientString(str)).filter(Boolean)
  };

  const summary = {
    created: 0,
    skipped: 0,
    errors: [],
    ingredientsCreated: [],
    categoriesCreated: [],
    recipe: null
  };

  const transaction = await db.sequelize.transaction();

  try {
    // Resolve category
    let categoryId = null;
    if (recipeData.category) {
      const normalizedCatName = String(recipeData.category).toLowerCase().trim();
      let category = await RecipeCategory.findOne({
        where: db.sequelize.where(
          db.sequelize.fn('lower', db.sequelize.col('name')),
          normalizedCatName
        ),
        transaction
      });

      if (!category) {
        category = await RecipeCategory.create({
          name: String(recipeData.category).trim(),
          created_by: user.id
        }, { transaction });
        summary.categoriesCreated.push(category.name);
      }

      categoryId = category.id;
    }

    // Generate slug
    let slug = Recipe.generateSlug(recipeData.title);
    const existingSlug = await Recipe.findOne({
      where: { slug },
      transaction
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create recipe as draft
    const newRecipe = await Recipe.create({
      title: recipeData.title,
      slug,
      description: recipeData.description,
      instructions: recipeData.instructions,
      prep_time_minutes: recipeData.prep_time_minutes,
      cook_time_minutes: recipeData.cook_time_minutes,
      servings: recipeData.servings,
      difficulty: 'medium',
      status: 'draft',
      tags: recipeData.tags,
      nutrition_per_serving: recipeData.nutrition_per_serving,
      image_url: recipeData.image_url ? String(recipeData.image_url).substring(0, 500) : null,
      source_url: recipeData.source_url,
      category_id: categoryId,
      created_by: user.id
    }, { transaction });

    // Resolve and create ingredients
    for (let i = 0; i < recipeData.ingredients.length; i++) {
      const ingData = recipeData.ingredients[i];
      if (!ingData.name) continue;

      const normalizedName = ingData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      let ingredient = await Ingredient.findOne({
        where: { name_normalized: normalizedName },
        transaction
      });

      if (!ingredient) {
        ingredient = await Ingredient.create({
          name: ingData.name.trim(),
          name_normalized: normalizedName,
          default_unit: ingData.unit || 'g',
          created_by: user.id
        }, { transaction });
        summary.ingredientsCreated.push(ingredient.name);
      }

      await RecipeIngredient.create({
        recipe_id: newRecipe.id,
        ingredient_id: ingredient.id,
        quantity: ingData.quantity || null,
        unit: ingData.unit || 'g',
        is_optional: false,
        display_order: i
      }, { transaction });
    }

    await transaction.commit();

    // Re-fetch with includes for the response
    const fullRecipe = await Recipe.findOne({
      where: { id: newRecipe.id },
      include: recipeIncludes
    });

    summary.created = 1;
    summary.recipe = fullRecipe;

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipes',
      resource_id: newRecipe.id,
      changes: {
        action: 'import_from_url',
        source_url: url,
        ingredientsCreated: summary.ingredientsCreated.length,
        categoriesCreated: summary.categoriesCreated.length
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return summary;
  } catch (error) {
    await transaction.rollback();

    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'CREATE',
      resource_type: 'recipes',
      changes: { action: 'import_from_url', source_url: url },
      status_code: error.statusCode || 500,
      error_message: error.message
    });

    throw error;
  }
}

module.exports = {
  exportRecipes,
  exportSingleRecipe,
  importRecipes,
  importFromUrl,
  EXPORT_VERSION,
  EXPORT_TYPE
};
