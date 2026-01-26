/**
 * AI Provider Service
 * US-5.5.5: AI-Generated Follow-ups - Multi-Provider Support
 *
 * Unified interface for multiple AI providers:
 * - Anthropic Claude
 * - OpenAI (ChatGPT)
 * - Mistral AI
 * - Ollama (Local)
 */

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { Mistral } = require('@mistralai/mistralai');
const db = require('../../../models');
const SystemSetting = db.SystemSetting;

// Available AI Providers and their models with pricing
const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    models: [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fastest, most affordable',
        inputPrice: 0.25,  // per 1M tokens
        outputPrice: 1.25,
        recommended: true
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        description: 'Best balance of speed and intelligence',
        inputPrice: 3.00,
        outputPrice: 15.00,
        recommended: false
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        description: 'Most capable, highest quality',
        inputPrice: 15.00,
        outputPrice: 75.00,
        recommended: false
      }
    ],
    envKey: 'ANTHROPIC_API_KEY'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable',
        inputPrice: 0.15,
        outputPrice: 0.60,
        recommended: true
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable GPT-4 model',
        inputPrice: 2.50,
        outputPrice: 10.00,
        recommended: false
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High capability, good for complex tasks',
        inputPrice: 10.00,
        outputPrice: 30.00,
        recommended: false
      }
    ],
    envKey: 'OPENAI_API_KEY'
  },
  mistral: {
    name: 'Mistral AI',
    models: [
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        description: 'Cost-efficient for simple tasks',
        inputPrice: 0.10,
        outputPrice: 0.30,
        recommended: true
      },
      {
        id: 'mistral-medium-latest',
        name: 'Mistral Medium',
        description: 'Balanced performance',
        inputPrice: 2.70,
        outputPrice: 8.10,
        recommended: false
      },
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        description: 'Flagship model, best quality',
        inputPrice: 4.00,
        outputPrice: 12.00,
        recommended: false
      },
      {
        id: 'open-mistral-7b',
        name: 'Mistral 7B (Open)',
        description: 'Free tier available',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: false
      }
    ],
    envKey: 'MISTRAL_API_KEY'
  },
  ollama: {
    name: 'Ollama (Local)',
    models: [
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        description: 'Fast and lightweight (2GB)',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: true
      },
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B',
        description: 'Good balance of speed and quality (5GB)',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: false
      },
      {
        id: 'mistral',
        name: 'Mistral 7B',
        description: 'Excellent for French language (4GB)',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: false
      },
      {
        id: 'gemma2',
        name: 'Gemma 2',
        description: 'Google lightweight model (5GB)',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: false
      },
      {
        id: 'qwen2.5',
        name: 'Qwen 2.5',
        description: 'Alibaba multilingual model (4GB)',
        inputPrice: 0.00,
        outputPrice: 0.00,
        recommended: false
      }
    ],
    envKey: 'OLLAMA_BASE_URL'
  }
};

// Cached clients
let anthropicClient = null;
let openaiClient = null;
let mistralClient = null;

/**
 * Get Anthropic client
 */
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Get OpenAI client
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Get Mistral client
 */
function getMistralClient() {
  if (!process.env.MISTRAL_API_KEY) return null;
  if (!mistralClient) {
    mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  }
  return mistralClient;
}

/**
 * Get available providers (those with API keys configured)
 */
function getAvailableProviders() {
  const available = [];

  for (const [key, provider] of Object.entries(AI_PROVIDERS)) {
    const isConfigured = !!process.env[provider.envKey];
    available.push({
      id: key,
      name: provider.name,
      configured: isConfigured,
      models: provider.models,
      envKey: provider.envKey
    });
  }

  return available;
}

/**
 * Get all providers with their configuration status
 */
function getAllProviders() {
  return AI_PROVIDERS;
}

/**
 * Get current AI configuration from database
 */
async function getAIConfiguration() {
  try {
    const providerSetting = await SystemSetting.findOne({
      where: { setting_key: 'ai_provider' }
    });
    const modelSetting = await SystemSetting.findOne({
      where: { setting_key: 'ai_model' }
    });

    const provider = providerSetting?.setting_value || 'anthropic';
    const model = modelSetting?.setting_value || getDefaultModel(provider);

    return {
      provider,
      model,
      providerInfo: AI_PROVIDERS[provider] || null
    };
  } catch (error) {
    console.error('Error getting AI configuration:', error);
    return {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      providerInfo: AI_PROVIDERS.anthropic
    };
  }
}

/**
 * Save AI configuration to database
 */
async function saveAIConfiguration(provider, model) {
  // Validate provider
  if (!AI_PROVIDERS[provider]) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  // Validate model belongs to provider
  const validModels = AI_PROVIDERS[provider].models.map(m => m.id);
  if (!validModels.includes(model)) {
    throw new Error(`Invalid model ${model} for provider ${provider}`);
  }

  // Check if provider is configured
  const envKey = AI_PROVIDERS[provider].envKey;
  if (!process.env[envKey]) {
    throw new Error(`Provider ${provider} is not configured. Set ${envKey} in environment variables.`);
  }

  // Save to database
  await SystemSetting.upsert({
    id: 'ai_provider',
    setting_key: 'ai_provider',
    setting_value: provider,
    description: 'Selected AI provider for follow-up generation',
    data_type: 'string'
  });

  await SystemSetting.upsert({
    id: 'ai_model',
    setting_key: 'ai_model',
    setting_value: model,
    description: 'Selected AI model for follow-up generation',
    data_type: 'string'
  });

  return { provider, model };
}

/**
 * Get default model for a provider
 */
function getDefaultModel(provider) {
  const providerConfig = AI_PROVIDERS[provider];
  if (!providerConfig) return null;

  const recommended = providerConfig.models.find(m => m.recommended);
  return recommended ? recommended.id : providerConfig.models[0]?.id;
}

/**
 * Generate content using the configured AI provider
 *
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User message
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated text content
 */
async function generateContent(systemPrompt, userPrompt, options = {}) {
  const config = await getAIConfiguration();
  const { provider, model } = config;

  console.log(`[AI Provider] Using ${provider} with model ${model}`);

  switch (provider) {
    case 'anthropic':
      return generateWithAnthropic(systemPrompt, userPrompt, model, options);
    case 'openai':
      return generateWithOpenAI(systemPrompt, userPrompt, model, options);
    case 'mistral':
      return generateWithMistral(systemPrompt, userPrompt, model, options);
    case 'ollama':
      return generateWithOllama(systemPrompt, userPrompt, model, options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Generate with Anthropic Claude
 */
async function generateWithAnthropic(systemPrompt, userPrompt, model, options = {}) {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await client.messages.create({
    model: model,
    max_tokens: options.maxTokens || 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent) {
    throw new Error('No text content in Anthropic response');
  }

  return textContent.text;
}

/**
 * Generate with OpenAI
 */
async function generateWithOpenAI(systemPrompt, userPrompt, model, options = {}) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: options.maxTokens || 2000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return content;
}

/**
 * Generate with Mistral
 */
async function generateWithMistral(systemPrompt, userPrompt, model, options = {}) {
  const client = getMistralClient();
  if (!client) {
    throw new Error('Mistral API key not configured');
  }

  const response = await client.chat.complete({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Mistral response');
  }

  return content;
}

/**
 * Generate with Ollama (Local)
 */
async function generateWithOllama(systemPrompt, userPrompt, model, options = {}) {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) {
    throw new Error('Ollama base URL not configured. Set OLLAMA_BASE_URL environment variable.');
  }

  // Use custom model from env if not specified or if using default
  const ollamaModel = process.env.OLLAMA_MODEL || model || 'llama3.2';

  const url = `${baseUrl}/api/chat`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          num_predict: options.maxTokens || 2000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.message?.content;

    if (!content) {
      throw new Error('No content in Ollama response');
    }

    return content;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Ollama at ${baseUrl}. Make sure Ollama is running.`);
    }
    throw error;
  }
}

/**
 * Check if any AI provider is available
 */
function isAnyProviderAvailable() {
  return !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.MISTRAL_API_KEY ||
    process.env.OLLAMA_BASE_URL
  );
}

/**
 * Get pricing info for display
 */
function getPricingInfo() {
  return Object.entries(AI_PROVIDERS).map(([id, provider]) => ({
    id,
    name: provider.name,
    configured: !!process.env[provider.envKey],
    models: provider.models.map(m => ({
      ...m,
      priceDisplay: m.inputPrice === 0 && m.outputPrice === 0
        ? 'Free'
        : `$${m.inputPrice}/$${m.outputPrice} per 1M tokens`
    }))
  }));
}

module.exports = {
  AI_PROVIDERS,
  getAvailableProviders,
  getAllProviders,
  getAIConfiguration,
  saveAIConfiguration,
  generateContent,
  isAnyProviderAvailable,
  getPricingInfo,
  getDefaultModel
};
