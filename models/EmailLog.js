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
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
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

  return EmailLog;
};
