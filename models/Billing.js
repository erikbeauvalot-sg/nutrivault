module.exports = (sequelize, DataTypes) => {
  const Billing = sequelize.define('Billing', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    invoice_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    service_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    amount_due: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
      validate: {
        isIn: [['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']]
      }
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Cash, Credit Card, Insurance, etc.'
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'billing',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['patient_id']
      },
      {
        fields: ['visit_id']
      },
      {
        fields: ['invoice_number']
      },
      {
        fields: ['status']
      },
      {
        fields: ['due_date']
      }
    ]
  });

  return Billing;
};
