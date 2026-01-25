/**
 * AI Configuration Controller
 * US-5.5.5: AI-Generated Follow-ups - Multi-Provider Support
 *
 * Admin endpoints for managing AI provider configuration
 */

const aiProviderService = require('../services/aiProvider.service');
const auditService = require('../services/audit.service');

/**
 * Get all AI providers with their configuration status
 * GET /api/ai-config/providers
 */
const getProviders = async (req, res) => {
  try {
    const providers = aiProviderService.getAvailableProviders();

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error getting AI providers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get AI providers'
    });
  }
};

/**
 * Get pricing information for all providers
 * GET /api/ai-config/pricing
 */
const getPricing = async (req, res) => {
  try {
    const pricing = aiProviderService.getPricingInfo();

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error getting pricing info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pricing information'
    });
  }
};

/**
 * Get current AI configuration
 * GET /api/ai-config/current
 */
const getCurrentConfig = async (req, res) => {
  try {
    const config = await aiProviderService.getAIConfiguration();
    const allProviders = aiProviderService.getAvailableProviders();

    // Get model info for current selection
    const currentProvider = allProviders.find(p => p.id === config.provider);
    const currentModel = currentProvider?.models.find(m => m.id === config.model);

    res.json({
      success: true,
      data: {
        provider: config.provider,
        model: config.model,
        providerName: currentProvider?.name || config.provider,
        modelName: currentModel?.name || config.model,
        modelInfo: currentModel || null,
        isConfigured: currentProvider?.configured || false
      }
    });
  } catch (error) {
    console.error('Error getting current config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get current configuration'
    });
  }
};

/**
 * Save AI configuration
 * PUT /api/ai-config
 */
const saveConfig = async (req, res) => {
  try {
    const { provider, model } = req.body;

    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Provider and model are required'
      });
    }

    const result = await aiProviderService.saveAIConfiguration(provider, model);

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'UPDATE_AI_CONFIG',
      resource_type: 'ai_configuration',
      resource_id: null,
      details: { provider, model },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: result,
      message: 'AI configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving AI config:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to save AI configuration'
    });
  }
};

/**
 * Test AI provider connection
 * POST /api/ai-config/test
 */
const testConnection = async (req, res) => {
  try {
    const { provider, model } = req.body;

    // Temporarily use the specified provider/model for a test
    const testPrompt = 'Reply with exactly: "Connection successful"';

    // Get current config to restore later if needed
    const currentConfig = await aiProviderService.getAIConfiguration();

    // Temporarily save new config
    await aiProviderService.saveAIConfiguration(provider, model);

    try {
      const response = await aiProviderService.generateContent(
        'You are a test assistant. Follow instructions exactly.',
        testPrompt,
        { maxTokens: 50 }
      );

      res.json({
        success: true,
        data: {
          provider,
          model,
          response: response.substring(0, 100),
          message: 'Connection test successful'
        }
      });
    } catch (testError) {
      // Restore previous config
      await aiProviderService.saveAIConfiguration(currentConfig.provider, currentConfig.model);

      throw testError;
    }
  } catch (error) {
    console.error('Error testing AI connection:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Connection test failed'
    });
  }
};

module.exports = {
  getProviders,
  getPricing,
  getCurrentConfig,
  saveConfig,
  testConnection
};
