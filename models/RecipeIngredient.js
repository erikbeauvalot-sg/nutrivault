/**
 * RecipeIngredient Model
 * Junction table linking recipes to ingredients with quantities
 */

module.exports = (sequelize, DataTypes) => {
  const RecipeIngredient = sequelize.define('RecipeIngredient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    recipe_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recipes',
        key: 'id'
      }
    },
    ingredient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ingredients',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      get() {
        const value = this.getDataValue('quantity');
        return value !== null ? parseFloat(value) : null;
      }
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    notes: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    is_optional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'recipe_ingredients',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['recipe_id']
      },
      {
        fields: ['ingredient_id']
      },
      {
        fields: ['recipe_id', 'ingredient_id'],
        unique: true
      },
      {
        fields: ['recipe_id', 'display_order']
      }
    ]
  });

  RecipeIngredient.associate = function(models) {
    // Belongs to a recipe
    RecipeIngredient.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    // Belongs to an ingredient
    RecipeIngredient.belongsTo(models.Ingredient, {
      foreignKey: 'ingredient_id',
      as: 'ingredient'
    });
  };

  return RecipeIngredient;
};
