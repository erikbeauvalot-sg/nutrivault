/**
 * EmailCampaign Model
 * Campaign definitions for newsletter and marketing emails
 */

module.exports = (sequelize, DataTypes) => {
  const EmailCampaign = sequelize.define('EmailCampaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500]
      }
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    campaign_type: {
      type: DataTypes.ENUM('newsletter', 'promotional', 'educational', 'reminder'),
      allowNull: false,
      defaultValue: 'newsletter'
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    target_audience: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      get() {
        const value = this.getDataValue('target_audience');
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            return {};
          }
        }
        return value || {};
      }
    },
    recipient_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'The dietitian who appears as the sender of the email'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'email_campaigns',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['campaign_type'] },
      { fields: ['scheduled_at'] },
      { fields: ['sent_at'] },
      { fields: ['created_by'] },
      { fields: ['is_active'] },
      { fields: ['status', 'is_active'] }
    ]
  });

  // Check if campaign can be edited
  EmailCampaign.prototype.canEdit = function() {
    return ['draft', 'scheduled'].includes(this.status);
  };

  // Check if campaign can be sent
  EmailCampaign.prototype.canSend = function() {
    return this.status === 'draft' && this.body_html && this.subject;
  };

  // Check if campaign can be cancelled
  EmailCampaign.prototype.canCancel = function() {
    return ['scheduled', 'sending'].includes(this.status);
  };

  EmailCampaign.associate = function(models) {
    // Campaign created by a user
    EmailCampaign.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Campaign sender (dietitian who appears in the email)
    EmailCampaign.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    });

    // Campaign has many recipients
    EmailCampaign.hasMany(models.EmailCampaignRecipient, {
      foreignKey: 'campaign_id',
      as: 'recipients'
    });
  };

  return EmailCampaign;
};
