/**
 * AI Prompt Controller
 * Handles HTTP requests for AI prompt management
 */

const aiPromptService = require('../services/aiPrompt.service');

/**
 * Get all AI prompts
 * GET /api/ai-prompts
 */
async function getAllPrompts(req, res) {
  try {
    const filters = {
      usage: req.query.usage,
      language_code: req.query.language_code,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const prompts = await aiPromptService.getAllPrompts(filters);
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch AI prompts'
    });
  }
}

/**
 * Get a prompt by ID
 * GET /api/ai-prompts/:id
 */
async function getPromptById(req, res) {
  try {
    const prompt = await aiPromptService.getPromptById(req.params.id);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error fetching AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch AI prompt'
    });
  }
}

/**
 * Get active prompt for a usage type
 * GET /api/ai-prompts/usage/:usage
 */
async function getActivePrompt(req, res) {
  try {
    const languageCode = req.query.language_code || 'fr';
    const prompt = await aiPromptService.getActivePrompt(req.params.usage, languageCode);

    if (!prompt) {
      return res.status(404).json({
        error: 'No active prompt found for this usage type'
      });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error fetching active AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch active AI prompt'
    });
  }
}

/**
 * Create a new AI prompt
 * POST /api/ai-prompts
 */
async function createPrompt(req, res) {
  try {
    const {
      usage,
      name,
      description,
      language_code,
      system_prompt,
      user_prompt_template,
      available_variables,
      is_active,
      is_default
    } = req.body;

    // Validation
    if (!usage || !name || !system_prompt || !user_prompt_template) {
      return res.status(400).json({
        error: 'Missing required fields: usage, name, system_prompt, user_prompt_template'
      });
    }

    const prompt = await aiPromptService.createPrompt({
      usage,
      name,
      description,
      language_code: language_code || 'fr',
      system_prompt,
      user_prompt_template,
      available_variables: available_variables || [],
      is_active: is_active !== false,
      is_default: is_default || false
    }, req.user.id);

    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error creating AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create AI prompt'
    });
  }
}

/**
 * Update an AI prompt
 * PUT /api/ai-prompts/:id
 */
async function updatePrompt(req, res) {
  try {
    const {
      usage,
      name,
      description,
      language_code,
      system_prompt,
      user_prompt_template,
      available_variables,
      is_active,
      is_default
    } = req.body;

    const prompt = await aiPromptService.updatePrompt(
      req.params.id,
      {
        usage,
        name,
        description,
        language_code,
        system_prompt,
        user_prompt_template,
        available_variables,
        is_active,
        is_default
      },
      req.user.id
    );

    res.json(prompt);
  } catch (error) {
    console.error('Error updating AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update AI prompt'
    });
  }
}

/**
 * Delete an AI prompt
 * DELETE /api/ai-prompts/:id
 */
async function deletePrompt(req, res) {
  try {
    await aiPromptService.deletePrompt(req.params.id);
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete AI prompt'
    });
  }
}

/**
 * Set a prompt as default
 * POST /api/ai-prompts/:id/set-default
 */
async function setAsDefault(req, res) {
  try {
    const prompt = await aiPromptService.setAsDefault(req.params.id);
    res.json(prompt);
  } catch (error) {
    console.error('Error setting AI prompt as default:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to set AI prompt as default'
    });
  }
}

/**
 * Get list of usage types
 * GET /api/ai-prompts/usage-types
 */
async function getUsageTypes(req, res) {
  try {
    const usageTypes = await aiPromptService.getUsageTypes();
    res.json(usageTypes);
  } catch (error) {
    console.error('Error fetching usage types:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch usage types'
    });
  }
}

/**
 * Duplicate a prompt
 * POST /api/ai-prompts/:id/duplicate
 */
async function duplicatePrompt(req, res) {
  try {
    const prompt = await aiPromptService.duplicatePrompt(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(201).json(prompt);
  } catch (error) {
    console.error('Error duplicating AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to duplicate AI prompt'
    });
  }
}

/**
 * Test a prompt with sample data
 * POST /api/ai-prompts/:id/test
 */
async function testPrompt(req, res) {
  try {
    const result = await aiPromptService.testPrompt(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error testing AI prompt:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to test AI prompt'
    });
  }
}

module.exports = {
  getAllPrompts,
  getPromptById,
  getActivePrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  setAsDefault,
  getUsageTypes,
  duplicatePrompt,
  testPrompt
};
