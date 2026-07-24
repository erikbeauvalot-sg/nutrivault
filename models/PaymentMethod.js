module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    // Stable value stored on billing/expense records. Never changes once set;
    // the editable display is `label`.
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [1, 50] }
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] }
    },
    // Marks card payments so the accounting export can deduct the bank commission.
    is_card: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: true, min: 0 }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'payment_methods',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active', 'display_order'] },
      { fields: ['code'], unique: true }
    ]
  });

  // Default methods matching the values historically hard-coded in the UI.
  PaymentMethod.DEFAULTS = [
    { code: 'CASH', label: 'Espèces', is_card: false, display_order: 1 },
    { code: 'CHECK', label: 'Chèque', is_card: false, display_order: 2 },
    { code: 'BANK_TRANSFER', label: 'Virement bancaire', is_card: false, display_order: 3 },
    { code: 'CREDIT_CARD', label: 'Carte bancaire', is_card: true, display_order: 4 },
    { code: 'INSURANCE', label: 'Assurance', is_card: false, display_order: 5 },
    { code: 'OTHER', label: 'Autre', is_card: false, display_order: 6 }
  ];

  // Idempotently create the default methods (used on startup after sync).
  PaymentMethod.ensureDefaults = async function ensureDefaults() {
    for (const def of PaymentMethod.DEFAULTS) {
      await PaymentMethod.findOrCreate({ where: { code: def.code }, defaults: def });
    }
  };

  return PaymentMethod;
};
