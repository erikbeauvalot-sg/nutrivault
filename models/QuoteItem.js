module.exports = (sequelize, DataTypes) => {
  const QuoteItem = sequelize.define('QuoteItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    quote_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    item_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00,
      validate: {
        min: 0.01
      }
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'quote_items',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['quote_id'] },
      { fields: ['sort_order'] }
    ]
  });

  QuoteItem.prototype.getLineTotal = function() {
    return parseFloat(this.quantity) * parseFloat(this.unit_price);
  };

  return QuoteItem;
};
