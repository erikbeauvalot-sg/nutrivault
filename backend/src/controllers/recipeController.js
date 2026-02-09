/**
 * Recipe Controller
 *
 * HTTP request handlers for recipe management.
 */

const recipeService = require('../services/recipe.service');
const recipeSharingService = require('../services/recipeSharing.service');
const recipePDFService = require('../services/recipePDF.service');
const recipeImportExportService = require('../services/recipeImportExport.service');
const fs = require('fs');

/**
 * Extract request metadata for audit logging
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/recipes - Get all recipes
 */
exports.getAllRecipes = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      status: req.query.status,
      category_id: req.query.category_id,
      difficulty: req.query.difficulty,
      created_by: req.query.created_by,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeService.getRecipes(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.recipes,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/:id - Get recipe by ID
 */
exports.getRecipeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.getRecipeById(id, user, requestMetadata);

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/slug/:slug - Get recipe by slug
 */
exports.getRecipeBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.getRecipeBySlug(slug, user, requestMetadata);

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes - Create new recipe
 */
exports.createRecipe = async (req, res, next) => {
  try {
    const recipeData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.createRecipe(recipeData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: recipe,
      message: 'Recipe created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/recipes/:id - Update recipe
 */
exports.updateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.updateRecipe(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: recipe,
      message: 'Recipe updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recipes/:id - Delete recipe
 */
exports.deleteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeService.deleteRecipe(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/:id/publish - Publish recipe
 */
exports.publishRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.publishRecipe(id, user, requestMetadata);

    res.json({
      success: true,
      data: recipe,
      message: 'Recipe published successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/:id/archive - Archive recipe
 */
exports.archiveRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.archiveRecipe(id, user, requestMetadata);

    res.json({
      success: true,
      data: recipe,
      message: 'Recipe archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/:id/duplicate - Duplicate recipe
 */
exports.duplicateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const recipe = await recipeService.duplicateRecipe(id, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: recipe,
      message: 'Recipe duplicated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/:id/share - Share recipe with a patient
 */
exports.shareRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { patient_id, notes, send_email } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const access = await recipeSharingService.shareRecipe(id, patient_id, { notes, send_email }, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: access,
      message: 'Recipe shared successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/:id/shares - Get recipe shares
 */
exports.getRecipeShares = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const shares = await recipeSharingService.getRecipeShares(id, user, requestMetadata);

    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recipe-access/:id - Revoke recipe access
 */
exports.revokeAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeSharingService.revokeAccess(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/recipe-access/:id - Update share notes
 */
exports.updateShareNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const access = await recipeSharingService.updateShareNotes(id, notes, user, requestMetadata);

    res.json({
      success: true,
      data: access,
      message: 'Notes updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id/recipes - Get recipes shared with a patient
 */
exports.getPatientRecipes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const filters = {
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeSharingService.getPatientRecipes(id, user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.shares,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/:id/shares/:shareId/resend - Resend share email
 */
exports.resendShareEmail = async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeSharingService.resendShareEmail(shareId, user, requestMetadata);

    res.json({
      success: true,
      message: result.message,
      data: {
        patient_email: result.patient_email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/recipes/:id/visibility - Update recipe visibility
 */
exports.setVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { visibility } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeSharingService.setVisibility(id, visibility, user, requestMetadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/export/json - Export recipes as JSON
 */
exports.exportRecipesJSON = async (req, res, next) => {
  try {
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    // Parse recipeIds from query param (comma-separated or array)
    let recipeIds = [];
    if (req.query.recipeIds) {
      recipeIds = Array.isArray(req.query.recipeIds)
        ? req.query.recipeIds
        : req.query.recipeIds.split(',').map(id => id.trim()).filter(Boolean);
    }

    const exportData = await recipeImportExportService.exportRecipes(recipeIds, user, requestMetadata);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `nutrivault-recipes-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/:id/export/json - Export single recipe as JSON
 */
exports.exportSingleRecipeJSON = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const exportData = await recipeImportExportService.exportSingleRecipe(id, user, requestMetadata);

    const recipe = exportData.recipes[0];
    const slugify = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
    };
    const titleSlug = slugify(recipe.title);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `recipe-${titleSlug}-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipes/import - Import recipes from JSON file
 */
exports.importRecipesJSON = async (req, res, next) => {
  try {
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Read and parse the uploaded JSON file
    let importData;
    try {
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      importData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON file'
      });
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    const options = {
      duplicateHandling: req.body.duplicateHandling || 'skip'
    };

    const summary = await recipeImportExportService.importRecipes(importData, options, user, requestMetadata);

    res.status(200).json({
      success: true,
      data: summary,
      message: `Import complete: ${summary.created} created, ${summary.skipped} skipped`
    });
  } catch (error) {
    // Cleanup temp file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    next(error);
  }
};

/**
 * POST /api/recipes/import/url - Import recipe from a URL
 */
exports.importFromUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const summary = await recipeImportExportService.importFromUrl(url, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: summary,
      message: `Recipe "${summary.recipe?.title || 'Unknown'}" imported successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipes/:id/export/pdf - Export recipe as PDF
 */
exports.exportRecipePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const language = req.query.lang || 'en';
    const notes = req.query.notes || '';

    // Get recipe to build filename
    const recipe = await recipeService.getRecipeById(id, req.user);

    // Create slug-friendly filename
    const slugify = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphen
        .replace(/^-+|-+$/g, '')          // Remove leading/trailing hyphens
        .substring(0, 50);                // Limit length
    };

    const prefix = language === 'fr' ? 'recette' : 'recipe';
    const titleSlug = slugify(recipe.title);
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${prefix}-${titleSlug}-${dateStr}.pdf`;

    const pdfStream = await recipePDFService.generateRecipePDF(id, language, notes);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the PDF stream to response
    pdfStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
