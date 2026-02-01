/**
 * EmailCampaignRecipient Model
 * Individual recipient tracking for email campaigns
 */

module.exports = (sequelize, DataTypes) => {
  const EmailCampaignRecipient = sequelize.define('EmailCampaignRecipient', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    campaign_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'email_campaigns',
        key: 'id'
      }
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'bounced'),
      allowNull: false,
      defaultValue: 'pending'
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    opened_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    clicked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'email_campaign_recipients',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['campaign_id'] },
      { fields: ['patient_id'] },
      { fields: ['status'] },
      { fields: ['sent_at'] },
      { fields: ['campaign_id', 'status'] },
      {
        fields: ['campaign_id', 'patient_id'],
        unique: true
      }
    ]
  });

  // Check if recipient email was opened
  EmailCampaignRecipient.prototype.wasOpened = function() {
    return this.opened_at !== null;
  };

  // Check if recipient clicked a link
  EmailCampaignRecipient.prototype.wasClicked = function() {
    return this.clicked_at !== null;
  };

  EmailCampaignRecipient.associate = function(models) {
    // Recipient belongs to a campaign
    EmailCampaignRecipient.belongsTo(models.EmailCampaign, {
      foreignKey: 'campaign_id',
      as: 'campaign'
    });

    // Recipient is a patient
    EmailCampaignRecipient.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
  };

  return EmailCampaignRecipient;
};
