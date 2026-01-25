/**
 * AIPrompt Model
 * Stores customizable AI prompts for different usage types (followup, invitation, relance, etc.)
 */

module.exports = (sequelize, DataTypes) => {
  const AIPrompt = sequelize.define('AIPrompt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    usage: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Usage type: followup, invitation, relance, welcome, etc.'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Display name for the prompt'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of when/how this prompt is used'
    },
    language_code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: 'fr',
      comment: 'Language code (fr, en, es, nl, de)'
    },
    system_prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'System instructions for the AI'
    },
    user_prompt_template: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'User prompt template with {{variables}}'
    },
    available_variables: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'List of available variables for this prompt'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this prompt is active'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is the default prompt for its usage+language'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Version number for tracking changes'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'ai_prompts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['usage', 'language_code', 'is_active']
      },
      {
        fields: ['usage', 'language_code', 'is_default']
      }
    ]
  });

  /**
   * Get the active default prompt for a usage type and language
   * @param {string} usage - Usage type (followup, invitation, etc.)
   * @param {string} languageCode - Language code (fr, en, etc.)
   * @returns {Promise<AIPrompt|null>}
   */
  AIPrompt.getActivePrompt = async function(usage, languageCode = 'fr') {
    // First try to find a default prompt for the specific language
    let prompt = await this.findOne({
      where: {
        usage,
        language_code: languageCode,
        is_active: true,
        is_default: true
      }
    });

    // Fallback to any active prompt for that language
    if (!prompt) {
      prompt = await this.findOne({
        where: {
          usage,
          language_code: languageCode,
          is_active: true
        },
        order: [['created_at', 'DESC']]
      });
    }

    // Final fallback to French
    if (!prompt && languageCode !== 'fr') {
      prompt = await this.findOne({
        where: {
          usage,
          language_code: 'fr',
          is_active: true,
          is_default: true
        }
      });
    }

    return prompt;
  };

  /**
   * Set a prompt as the default for its usage+language combination
   * @param {string} promptId - The prompt ID to set as default
   */
  AIPrompt.setAsDefault = async function(promptId) {
    const prompt = await this.findByPk(promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Remove default from other prompts with same usage+language
    await this.update(
      { is_default: false },
      {
        where: {
          usage: prompt.usage,
          language_code: prompt.language_code,
          id: { [sequelize.Sequelize.Op.ne]: promptId }
        }
      }
    );

    // Set this prompt as default
    prompt.is_default = true;
    await prompt.save();

    return prompt;
  };

  return AIPrompt;
};
