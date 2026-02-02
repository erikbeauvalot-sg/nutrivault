/**
 * Ingredient Model
 * Ingredient definitions with nutritional data
 */

module.exports = (sequelize, DataTypes) => {
  const Ingredient = sequelize.define('Ingredient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    name_normalized: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Legacy string category - use category_id instead'
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'ingredient_categories',
        key: 'id'
      },
      comment: 'Foreign key to ingredient_categories table'
    },
    default_unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'g'
    },
    nutrition_per_100g: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get() {
        const value = this.getDataValue('nutrition_per_100g');
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
    allergens: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const value = this.getDataValue('allergens');
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
    is_system: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'ingredients',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: (ingredient) => {
        // Normalize name for searching
        if (ingredient.name) {
          ingredient.name_normalized = ingredient.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
        }
      }
    },
    indexes: [
      {
        fields: ['name_normalized']
      },
      {
        fields: ['category']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_system']
      }
    ]
  });

  Ingredient.associate = function(models) {
    // Ingredient used in many recipes
    Ingredient.hasMany(models.RecipeIngredient, {
      foreignKey: 'ingredient_id',
      as: 'recipe_usages'
    });

    // Ingredient created by a user
    Ingredient.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Ingredient belongs to a category
    Ingredient.belongsTo(models.IngredientCategory, {
      foreignKey: 'category_id',
      as: 'ingredientCategory'
    });
  };

  return Ingredient;
};
