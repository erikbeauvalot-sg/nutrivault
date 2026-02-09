/**
 * Recipe Model
 * Recipe definitions with ingredients and nutrition
 */

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prep_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    cook_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 4,
      validate: {
        min: 1
      }
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'draft'
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('tags');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            return [];
          }
        }
        return value || [];
      }
    },
    nutrition_per_serving: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get() {
        const value = this.getDataValue('nutrition_per_serving');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            return {};
          }
        }
        return value || {};
      }
    },
    source_url: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'recipe_categories',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    visibility: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'private',
      validate: {
        isIn: [['private', 'public']]
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'recipes',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: async (recipe) => {
        // Generate slug from title if not provided
        if (recipe.title && !recipe.slug) {
          recipe.slug = Recipe.generateSlug(recipe.title);
        }
      },
      beforeCreate: async (recipe) => {
        // Ensure unique slug
        if (recipe.slug) {
          const existingRecipe = await Recipe.findOne({
            where: { slug: recipe.slug }
          });
          if (existingRecipe) {
            recipe.slug = `${recipe.slug}-${Date.now()}`;
          }
        }
      }
    },
    indexes: [
      {
        fields: ['slug'],
        unique: true
      },
      {
        fields: ['status']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['difficulty']
      },
      {
        fields: ['status', 'is_active']
      },
      {
        fields: ['visibility']
      }
    ]
  });

  // Static method to generate slug from title
  Recipe.generateSlug = function(title) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')          // Remove leading/trailing hyphens
      .substring(0, 200);               // Limit length
  };

  // Instance method to get total time
  Recipe.prototype.getTotalTime = function() {
    return (this.prep_time_minutes || 0) + (this.cook_time_minutes || 0);
  };

  Recipe.associate = function(models) {
    // Recipe belongs to a category
    Recipe.belongsTo(models.RecipeCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // Recipe created by a user
    Recipe.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Recipe has many ingredients
    Recipe.hasMany(models.RecipeIngredient, {
      foreignKey: 'recipe_id',
      as: 'ingredients'
    });

    // Recipe shared with patients
    Recipe.hasMany(models.RecipePatientAccess, {
      foreignKey: 'recipe_id',
      as: 'patientAccess'
    });
  };

  return Recipe;
};
