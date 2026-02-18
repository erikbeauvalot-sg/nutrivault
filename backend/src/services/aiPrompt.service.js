/**
 * AI Prompt Service
 * Manages CRUD operations for AI prompts
 */

const { AIPrompt, User } = require('../../../models');
const { Op } = require('sequelize');
const { formatDate } = require('../utils/timezone');

/**
 * Get all AI prompts with optional filtering
 * @param {Object} filters - Optional filters (usage, language_code, is_active)
 * @returns {Promise<AIPrompt[]>}
 */
async function getAllPrompts(filters = {}) {
  const where = {};

  if (filters.usage) {
    where.usage = filters.usage;
  }

  if (filters.language_code) {
    where.language_code = filters.language_code;
  }

  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }

  const prompts = await AIPrompt.findAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      },
      {
        model: User,
        as: 'updater',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [
      ['usage', 'ASC'],
      ['language_code', 'ASC'],
      ['is_default', 'DESC'],
      ['name', 'ASC']
    ]
  });

  return prompts;
}

/**
 * Get a prompt by ID
 * @param {string} id - Prompt ID
 * @returns {Promise<AIPrompt|null>}
 */
async function getPromptById(id) {
  const prompt = await AIPrompt.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'first_name', 'last_name']
      },
      {
        model: User,
        as: 'updater',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ]
  });

  return prompt;
}

/**
 * Get the active prompt for a usage type and language
 * @param {string} usage - Usage type (followup, invitation, etc.)
 * @param {string} languageCode - Language code (fr, en, etc.)
 * @returns {Promise<AIPrompt|null>}
 */
async function getActivePrompt(usage, languageCode = 'fr') {
  return await AIPrompt.getActivePrompt(usage, languageCode);
}

/**
 * Create a new AI prompt
 * @param {Object} data - Prompt data
 * @param {string} userId - ID of the user creating the prompt
 * @returns {Promise<AIPrompt>}
 */
async function createPrompt(data, userId) {
  // If this is marked as default, unset other defaults for same usage+language
  if (data.is_default) {
    await AIPrompt.update(
      { is_default: false },
      {
        where: {
          usage: data.usage,
          language_code: data.language_code || 'fr'
        }
      }
    );
  }

  const prompt = await AIPrompt.create({
    ...data,
    created_by: userId,
    updated_by: userId
  });

  return await getPromptById(prompt.id);
}

/**
 * Update an existing AI prompt
 * @param {string} id - Prompt ID
 * @param {Object} data - Update data
 * @param {string} userId - ID of the user updating the prompt
 * @returns {Promise<AIPrompt>}
 */
async function updatePrompt(id, data, userId) {
  const prompt = await AIPrompt.findByPk(id);

  if (!prompt) {
    const error = new Error('Prompt not found');
    error.statusCode = 404;
    throw error;
  }

  // If setting as default, unset other defaults for same usage+language
  if (data.is_default && !prompt.is_default) {
    await AIPrompt.update(
      { is_default: false },
      {
        where: {
          usage: data.usage || prompt.usage,
          language_code: data.language_code || prompt.language_code,
          id: { [Op.ne]: id }
        }
      }
    );
  }

  // Increment version if content changed
  const contentChanged =
    (data.system_prompt && data.system_prompt !== prompt.system_prompt) ||
    (data.user_prompt_template && data.user_prompt_template !== prompt.user_prompt_template);

  if (contentChanged) {
    data.version = prompt.version + 1;
  }

  await prompt.update({
    ...data,
    updated_by: userId
  });

  return await getPromptById(id);
}

/**
 * Delete an AI prompt
 * @param {string} id - Prompt ID
 * @returns {Promise<boolean>}
 */
async function deletePrompt(id) {
  const prompt = await AIPrompt.findByPk(id);

  if (!prompt) {
    const error = new Error('Prompt not found');
    error.statusCode = 404;
    throw error;
  }

  await prompt.destroy();
  return true;
}

/**
 * Set a prompt as the default for its usage+language
 * @param {string} id - Prompt ID
 * @returns {Promise<AIPrompt>}
 */
async function setAsDefault(id) {
  const prompt = await AIPrompt.findByPk(id);

  if (!prompt) {
    const error = new Error('Prompt not found');
    error.statusCode = 404;
    throw error;
  }

  // Unset other defaults for same usage+language
  await AIPrompt.update(
    { is_default: false },
    {
      where: {
        usage: prompt.usage,
        language_code: prompt.language_code,
        id: { [Op.ne]: id }
      }
    }
  );

  // Set this prompt as default
  await prompt.update({ is_default: true });

  return await getPromptById(id);
}

/**
 * Get list of distinct usage types
 * @returns {Promise<string[]>}
 */
async function getUsageTypes() {
  const results = await AIPrompt.findAll({
    attributes: [[AIPrompt.sequelize.fn('DISTINCT', AIPrompt.sequelize.col('usage')), 'usage']],
    raw: true
  });

  return results.map(r => r.usage);
}

/**
 * Duplicate a prompt
 * @param {string} id - Source prompt ID
 * @param {Object} overrides - Optional overrides for the new prompt
 * @param {string} userId - ID of the user creating the duplicate
 * @returns {Promise<AIPrompt>}
 */
async function duplicatePrompt(id, overrides = {}, userId) {
  const sourcePrompt = await AIPrompt.findByPk(id);

  if (!sourcePrompt) {
    const error = new Error('Prompt not found');
    error.statusCode = 404;
    throw error;
  }

  const newPromptData = {
    usage: overrides.usage || sourcePrompt.usage,
    name: overrides.name || `${sourcePrompt.name} (copie)`,
    description: overrides.description || sourcePrompt.description,
    language_code: overrides.language_code || sourcePrompt.language_code,
    system_prompt: overrides.system_prompt || sourcePrompt.system_prompt,
    user_prompt_template: overrides.user_prompt_template || sourcePrompt.user_prompt_template,
    available_variables: overrides.available_variables || sourcePrompt.available_variables,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    is_default: false, // Never duplicate as default
    version: 1
  };

  return await createPrompt(newPromptData, userId);
}

/**
 * Test a prompt with sample data
 * @param {string} id - Prompt ID
 * @param {Object} sampleData - Sample data for variable substitution
 * @returns {Promise<Object>} - Object with substituted prompts
 */
async function testPrompt(id, sampleData = {}) {
  const prompt = await AIPrompt.findByPk(id);

  if (!prompt) {
    const error = new Error('Prompt not found');
    error.statusCode = 404;
    throw error;
  }

  // Simple variable substitution for testing
  const substituteVariables = (template, data) => {
    if (!template) return '';
    if (typeof template !== 'string') template = String(template);
    let result = template;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }

    // Handle conditional blocks {{#if variable}}...{{/if}}
    const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(conditionalRegex, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    return result;
  };

  const defaultSampleData = {
    patient_name: 'Le patient',  // Anonymized for GDPR
    dietitian_name: 'Dr. Martin',
    visit_date: formatDate(new Date(), 'fr'),
    visit_type: 'Consultation de suivi',
    // Visit-specific data
    visit_custom_fields: '- Motif de consultation: Perte de poids\n- Objectifs: Améliorer l\'alimentation\n- Évaluation: Patient motivé, bonne progression',
    visit_measurements: '- Poids: 75 kg\n- Taille: 170 cm\n- IMC: 26.0',
    // Patient-level data (separate from visit data)
    patient_custom_fields: '- Allergies: Aucune\n- Régime alimentaire: Omnivore\n- Activité physique: Modérée',
    patient_measures: '- Poids (évolution): 78 kg → 75 kg sur 3 mois\n- Tour de taille: 92 cm → 88 cm',
    next_visit_date: formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'fr'),
    tone: 'professionnel',
    ...sampleData
  };

  return {
    system_prompt: substituteVariables(prompt.system_prompt, defaultSampleData),
    user_prompt: substituteVariables(prompt.user_prompt_template, defaultSampleData),
    available_variables: prompt.available_variables
  };
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
