module.exports = (sequelize, DataTypes) => {
  const AccountingEntry = sequelize.define('AccountingEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    entry_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    entry_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['CREDIT', 'DEBIT']]
      }
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reference: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'accounting_entries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['created_by'] },
      { fields: ['entry_date'] },
      { fields: ['entry_type'] },
      { fields: ['is_active'] }
    ]
  });

  return AccountingEntry;
};
