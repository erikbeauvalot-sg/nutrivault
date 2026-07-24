module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        len: [1, 30] // configurable via /api/expense-categories — no fixed enum
      }
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    vendor: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    receipt_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      // Configurable via /api/payment-methods — no fixed enum.
      validate: {
        len: [0, 50]
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recurring_period: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['MONTHLY', 'QUARTERLY', 'YEARLY']]
      }
    },
    recurring_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    tax_deductible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'expenses',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['created_by'] },
      { fields: ['category'] },
      { fields: ['expense_date'] },
      { fields: ['is_active'] }
    ]
  });

  return Expense;
};
