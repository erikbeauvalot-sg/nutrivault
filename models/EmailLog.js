module.exports = (sequelize, DataTypes) => {
  const EmailLog = sequelize.define('EmailLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    template_slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'other',
      comment: 'Type of email: followup, invoice, reminder, welcome, etc.'
    },
    sent_to: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        isEmail: true
      }
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    visit_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Related visit if applicable'
    },
    billing_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Related billing/invoice if applicable'
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML body of the sent email'
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Plain text body of the sent email'
    },
    variables_used: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('sent', 'failed', 'queued'),
      allowNull: false,
      defaultValue: 'sent'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    sent_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    language_code: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: 'Language code used for this email (e.g., "en", "fr")'
    }
  }, {
    tableName: 'email_logs',
    timestamps: true,
    underscored: true
  });

  EmailLog.associate = function(models) {
    EmailLog.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

    EmailLog.belongsTo(models.User, {
      foreignKey: 'sent_by',
      as: 'sender'
    });

    EmailLog.belongsTo(models.Visit, {
      foreignKey: 'visit_id',
      as: 'visit'
    });

    EmailLog.belongsTo(models.Billing, {
      foreignKey: 'billing_id',
      as: 'billing'
    });

    EmailLog.belongsTo(models.EmailTemplate, {
      foreignKey: 'template_id',
      as: 'template'
    });
  };

  return EmailLog;
};
