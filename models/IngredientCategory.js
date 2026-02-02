/**
 * IngredientCategory Model
 * Categories for organizing ingredients
 */

module.exports = (sequelize, DataTypes) => {
  const IngredientCategory = sequelize.define('IngredientCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-Fa-f]{6}$|^$/
      }
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    tableName: 'ingredient_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['is_active']
      },
      {
        fields: ['display_order']
      },
      {
        fields: ['name'],
        unique: true
      }
    ]
  });

  IngredientCategory.associate = function(models) {
    // Category has many ingredients
    IngredientCategory.hasMany(models.Ingredient, {
      foreignKey: 'category_id',
      as: 'ingredients'
    });

    // Category created by a user
    IngredientCategory.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return IngredientCategory;
};
