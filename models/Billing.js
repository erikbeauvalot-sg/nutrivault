'use strict';

module.exports = (sequelize, DataTypes) => {
  const Billing = sequelize.define('Billing', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'visits',
        key: 'id'
      }
    },
    invoice_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'PENDING'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'billing',
    timestamps: true,
    underscored: true
  });

  Billing.associate = (models) => {
    Billing.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    Billing.belongsTo(models.Visit, {
      foreignKey: 'visit_id',
      as: 'visit'
    });
    Billing.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    Billing.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
  };

  return Billing;
};
