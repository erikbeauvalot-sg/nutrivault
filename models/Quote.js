module.exports = (sequelize, DataTypes) => {
  const Quote = sequelize.define('Quote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quote_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    quote_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    validity_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount_subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    amount_tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    amount_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: [['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']]
      }
    },
    accepted_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    declined_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    declined_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billing_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'quotes',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['client_id'] },
      { fields: ['quote_number'] },
      { fields: ['status'] },
      { fields: ['created_by'] },
      { fields: ['billing_id'] },
      { fields: ['validity_date'] },
      { fields: ['is_active'] }
    ]
  });

  return Quote;
};
