/**
 * BillingTemplateItem Model
 * Individual line items within a billing template
 */

module.exports = (sequelize, DataTypes) => {
  const BillingTemplateItem = sequelize.define('BillingTemplateItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    billing_template_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Parent template'
    },
    item_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Service or item name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed item description'
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00,
      validate: {
        min: 0.01
      },
      comment: 'Quantity of this item'
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Price per unit in euros'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Display order of items in template'
    }
  }, {
    tableName: 'billing_template_items',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['billing_template_id']
      },
      {
        fields: ['billing_template_id', 'sort_order']
      }
    ]
  });

  /**
   * Virtual field: Calculate line total
   */
  BillingTemplateItem.prototype.getLineTotal = function() {
    return parseFloat(this.quantity) * parseFloat(this.unit_price);
  };

  return BillingTemplateItem;
};
