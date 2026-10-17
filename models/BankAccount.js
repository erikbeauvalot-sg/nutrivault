module.exports = (sequelize, DataTypes) => {
  const BankAccount = sequelize.define('BankAccount', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    // Stable value stored on financial records. Never changes once set;
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
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    iban: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // Account given to new expenses and entries (at most one). Revenue follows
    // the account of the invoice location.
    is_default: {
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
    tableName: 'bank_accounts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active', 'display_order'] },
      { fields: ['code'], unique: true }
    ]
  });

  /** Code of the default active account, or null. */
  BankAccount.defaultCode = async function defaultCode() {
    const account = await BankAccount.findOne({
      where: { is_default: true, is_active: true },
      attributes: ['code']
    });
    return account ? account.code : null;
  };

  /** True when `code` is null (no account) or an existing account code. */
  BankAccount.isValidCode = async function isValidCode(code) {
    if (code === null) return true;
    return (await BankAccount.count({ where: { code } })) > 0;
  };

  return BankAccount;
};
