/**
 * Payment Model
 * Represents individual payment transactions for invoices
 */

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    billing_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the invoice'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Payment amount'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'CASH, CREDIT_CARD, BANK_TRANSFER, CHECK, INSURANCE, OTHER'
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Date of payment'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payment notes'
    },
    recorded_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who recorded this payment'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PAID',
      comment: 'Payment status: PAID, CANCELLED'
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  return Payment;
};
