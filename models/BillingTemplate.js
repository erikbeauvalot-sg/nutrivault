/**
 * BillingTemplate Model
 * Reusable templates for common billing services
 */

module.exports = (sequelize, DataTypes) => {
  const BillingTemplate = sequelize.define('BillingTemplate', {
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
        notEmpty: true
      },
      comment: 'Template name (e.g., "Consultation Initiale")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Template description and usage notes'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is the default template (only one can be default)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether template is active and available for use'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who created this template'
    }
  }, {
    tableName: 'billing_templates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['is_active']
      },
      {
        fields: ['is_default']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['name']
      }
    ],
    hooks: {
      beforeCreate: async (template) => {
        // If setting as default, clear other defaults
        if (template.is_default) {
          await BillingTemplate.update(
            { is_default: false },
            { where: { is_default: true } }
          );
        }
      },
      beforeUpdate: async (template) => {
        // If setting as default, clear other defaults
        if (template.is_default && template.changed('is_default')) {
          await BillingTemplate.update(
            { is_default: false },
            { where: { is_default: true, id: { [sequelize.Sequelize.Op.ne]: template.id } } }
          );
        }
      }
    }
  });

  /**
   * Virtual field: Calculate total amount from items
   */
  BillingTemplate.prototype.getTotalAmount = async function() {
    const items = await this.getItems();
    return items.reduce((total, item) => {
      return total + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);
  };

  return BillingTemplate;
};
