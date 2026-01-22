/**
 * InvoiceEmail Model
 * Tracks each email send for invoices
 */

module.exports = (sequelize, DataTypes) => {
  const InvoiceEmail = sequelize.define('InvoiceEmail', {
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
    sent_to: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Email address of recipient'
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when email was sent'
    },
    sent_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who sent the email'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'SUCCESS',
      comment: 'Email send status: SUCCESS, FAILED'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if failed'
    }
  }, {
    tableName: 'invoice_emails',
    timestamps: true,
    underscored: true
  });

  return InvoiceEmail;
};
