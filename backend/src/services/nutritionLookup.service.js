/**
 * Nutrition Lookup Service
 * Searches for nutritional data from external APIs
 */

const https = require('https');

/**
 * Search for nutritional data using Open Food Facts API
 * @param {string} query - Ingredient name to search
 * @returns {Promise<Object|null>} Nutritional data or null if not found
 */
async function searchNutrition(query) {
  try {
    console.log(`[NutritionLookup] Searching for: "${query}"`);

    // Use Open Food Facts search API
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;

    console.log(`[NutritionLookup] Querying Open Food Facts...`);
    const searchResult = await fetchJson(searchUrl);

    if (!searchResult || !searchResult.products || searchResult.products.length === 0) {
      console.log(`[NutritionLookup] No results from Open Food Facts, trying USDA...`);
      return await searchUSDA(query);
    }

    console.log(`[NutritionLookup] Found ${searchResult.products.length} products from Open Food Facts`);

    // Find best match - prefer products with nutriments data
    const product = searchResult.products.find(p =>
      p.nutriments &&
      (p.nutriments.energy_100g || p.nutriments['energy-kcal_100g'])
    ) || searchResult.products[0];

    if (!product || !product.nutriments) {
      console.log(`[NutritionLookup] No valid nutriments data, trying USDA...`);
      return await searchUSDA(query);
    }

    const nutriments = product.nutriments;
    console.log(`[NutritionLookup] Using product: "${product.product_name || query}"`);

    // Calculate calories - prefer kcal, fallback to kJ conversion
    let calories = 0;
    if (nutriments['energy-kcal_100g']) {
      calories = Math.round(nutriments['energy-kcal_100g']);
    } else if (nutriments.energy_100g) {
      // energy_100g is in kJ, convert to kcal (1 kcal = 4.184 kJ)
      calories = Math.round(nutriments.energy_100g / 4.184);
    }

    return {
      source: 'Open Food Facts',
      product_name: product.product_name || query,
      nutrition_per_100g: {
        calories: calories,
        protein: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((nutriments.fat_100g || 0) * 10) / 10,
        fiber: Math.round((nutriments.fiber_100g || 0) * 10) / 10,
        sugar: Math.round((nutriments.sugars_100g || 0) * 10) / 10,
        sodium: Math.round((nutriments.sodium_100g || 0) * 1000) // Convert g to mg
      },
      allergens: extractAllergens(product.allergens_tags || []),
      category: guessCategory(product.categories_tags || [], query)
    };
  } catch (error) {
    console.error('[NutritionLookup] Error searching Open Food Facts:', error.message);
    // Try USDA as fallback
    return await searchUSDA(query);
  }
}

/**
 * Search USDA FoodData Central
 * @param {string} query - Ingredient name to search
 * @returns {Promise<Object|null>} Nutritional data or null
 */
async function searchUSDA(query) {
  try {
    // USDA FoodData Central API (free, no key required for basic search)
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&dataType=Foundation,SR%20Legacy`;

    const result = await fetchJson(searchUrl);

    if (!result || !result.foods || result.foods.length === 0) {
      return null;
    }

    const food = result.foods[0];
    const nutrients = food.foodNutrients || [];

    const getNutrient = (name) => {
      const nutrient = nutrients.find(n =>
        n.nutrientName && n.nutrientName.toLowerCase().includes(name.toLowerCase())
      );
      return nutrient ? nutrient.value : 0;
    };

    return {
      source: 'USDA FoodData Central',
      product_name: food.description || query,
      nutrition_per_100g: {
        calories: Math.round(getNutrient('energy') || 0),
        protein: Math.round(getNutrient('protein') * 10) / 10,
        carbs: Math.round(getNutrient('carbohydrate') * 10) / 10,
        fat: Math.round(getNutrient('total lipid') * 10) / 10,
        fiber: Math.round(getNutrient('fiber') * 10) / 10,
        sugar: Math.round(getNutrient('sugars') * 10) / 10,
        sodium: Math.round(getNutrient('sodium') || 0)
      },
      allergens: [],
      category: guessCategory([], query)
    };
  } catch (error) {
    console.error('Error searching USDA:', error);
    return null;
  }
}

/**
 * Fetch JSON from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} Parsed JSON response
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'NutriVault/1.0 - Nutrition App',
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        console.error(`HTTP Error: ${res.statusCode} for URL: ${url}`);
        return resolve(null);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error('JSON parse error:', e.message);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('HTTPS request error:', err.message);
      resolve(null); // Return null instead of rejecting to allow fallback
    }).on('timeout', () => {
      console.error('Request timeout for:', url);
      resolve(null);
    });
  });
}

/**
 * Extract allergens from Open Food Facts tags
 * @param {Array} tags - Allergen tags from API
 * @returns {Array} Normalized allergen list
 */
function extractAllergens(tags) {
  const allergenMap = {
    'gluten': 'gluten',
    'milk': 'dairy',
    'eggs': 'eggs',
    'fish': 'fish',
    'crustaceans': 'shellfish',
    'molluscs': 'shellfish',
    'nuts': 'tree-nuts',
    'peanuts': 'peanuts',
    'soybeans': 'soy',
    'soya': 'soy',
    'sesame': 'sesame'
  };

  const allergens = [];
  tags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    Object.entries(allergenMap).forEach(([key, value]) => {
      if (tagLower.includes(key) && !allergens.includes(value)) {
        allergens.push(value);
      }
    });
  });
  return allergens;
}

/**
 * Guess ingredient category based on tags or name
 * @param {Array} tags - Category tags from API
 * @param {string} name - Ingredient name
 * @returns {string} Category
 */
function guessCategory(tags, name) {
  const nameLower = name.toLowerCase();
  const allTags = tags.join(' ').toLowerCase();

  const categoryPatterns = {
    proteins: ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'tofu', 'viande', 'poulet', 'boeuf', 'porc', 'poisson'],
    dairy: ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'lait', 'fromage', 'yaourt', 'crème', 'beurre'],
    vegetables: ['vegetable', 'carrot', 'broccoli', 'spinach', 'tomato', 'onion', 'légume', 'carotte', 'épinard', 'tomate', 'oignon'],
    fruits: ['fruit', 'apple', 'banana', 'orange', 'berry', 'pomme', 'banane', 'fraise'],
    grains: ['rice', 'pasta', 'bread', 'wheat', 'oat', 'cereal', 'riz', 'pâte', 'pain', 'blé', 'avoine'],
    legumes: ['bean', 'lentil', 'chickpea', 'pea', 'haricot', 'lentille', 'pois'],
    nuts: ['nut', 'almond', 'walnut', 'cashew', 'seed', 'noix', 'amande'],
    oils: ['oil', 'huile'],
    spices: ['spice', 'herb', 'pepper', 'salt', 'épice', 'herbe', 'poivre', 'sel'],
    condiments: ['sauce', 'vinegar', 'mustard', 'ketchup', 'vinaigre', 'moutarde'],
    beverages: ['juice', 'tea', 'coffee', 'jus', 'thé', 'café']
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    for (const pattern of patterns) {
      if (nameLower.includes(pattern) || allTags.includes(pattern)) {
        return category;
      }
    }
  }

  return 'other';
}

module.exports = {
  searchNutrition
};
