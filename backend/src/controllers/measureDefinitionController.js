/**
 * Measure Definition Controller
 *
 * Handles HTTP requests for measure definitions.
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

const measureDefinitionService = require('../services/measureDefinition.service');

/**
 * GET /api/measures
 * Get all measure definitions
 */
async function getAllDefinitions(req, res) {
  try {
    const filters = {
      category: req.query.category,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      measure_type: req.query.measure_type
    };

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measures = await measureDefinitionService.getAllDefinitions(
      req.user,
      filters,
      requestMetadata
    );

    res.json({
      success: true,
      data: measures,
      count: measures.length
    });
  } catch (error) {
    console.error('Error in getAllDefinitions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch measure definitions'
    });
  }
}

/**
 * GET /api/measures/:id
 * Get measure definition by ID
 */
async function getDefinitionById(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measure = await measureDefinitionService.getDefinitionById(
      req.params.id,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measure
    });
  } catch (error) {
    console.error('Error in getDefinitionById:', error);
    const statusCode = error.message === 'Measure definition not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch measure definition'
    });
  }
}

/**
 * POST /api/measures
 * Create new measure definition
 */
async function createDefinition(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measure = await measureDefinitionService.createDefinition(
      req.body,
      req.user,
      requestMetadata
    );

    res.status(201).json({
      success: true,
      data: measure,
      message: 'Measure definition created successfully'
    });
  } catch (error) {
    console.error('Error in createDefinition:', error);
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create measure definition'
    });
  }
}

/**
 * PUT /api/measures/:id
 * Update measure definition
 */
async function updateDefinition(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measure = await measureDefinitionService.updateDefinition(
      req.params.id,
      req.body,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measure,
      message: 'Measure definition updated successfully'
    });
  } catch (error) {
    console.error('Error in updateDefinition:', error);
    const statusCode = error.message === 'Measure definition not found' ? 404 :
                       error.message.includes('already exists') ? 409 :
                       error.message.includes('Cannot modify') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update measure definition'
    });
  }
}

/**
 * DELETE /api/measures/:id
 * Delete measure definition (soft delete)
 */
async function deleteDefinition(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    await measureDefinitionService.deleteDefinition(
      req.params.id,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      message: 'Measure definition deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteDefinition:', error);
    const statusCode = error.message === 'Measure definition not found' ? 404 :
                       error.message.includes('Cannot delete') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete measure definition'
    });
  }
}

/**
 * GET /api/measures/category/:category
 * Get measures by category
 */
async function getByCategory(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measures = await measureDefinitionService.getByCategory(
      req.params.category,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measures,
      count: measures.length
    });
  } catch (error) {
    console.error('Error in getByCategory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch measures by category'
    });
  }
}

/**
 * GET /api/measures/categories
 * Get all categories with counts
 */
async function getCategories(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const categories = await measureDefinitionService.getCategories(
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch categories'
    });
  }
}

module.exports = {
  getAllDefinitions,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getByCategory,
  getCategories
};
