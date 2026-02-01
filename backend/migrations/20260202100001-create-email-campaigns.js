'use strict';

/**
 * Migration: Create Email Campaign Tables
 * Newsletter & Marketing Module
 *
 * Tables:
 * - email_campaigns: Campaign definitions with content and scheduling
 * - email_campaign_recipients: Individual recipient tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create email_campaigns table
    await queryInterface.createTable('email_campaigns', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Campaign name for internal reference'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Email subject line'
      },
      body_html: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'HTML email content'
      },
      body_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Plain text email content (fallback)'
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Campaign status'
      },
      campaign_type: {
        type: Sequelize.ENUM('newsletter', 'promotional', 'educational', 'reminder'),
        allowNull: false,
        defaultValue: 'newsletter',
        comment: 'Type of campaign'
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Scheduled send time'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Actual send time'
      },
      target_audience: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '{}',
        comment: 'Audience segmentation criteria'
      },
      recipient_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of recipients'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who created the campaign'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for email_campaigns
    await queryInterface.addIndex('email_campaigns', ['status'], {
      name: 'email_campaigns_status'
    });

    await queryInterface.addIndex('email_campaigns', ['campaign_type'], {
      name: 'email_campaigns_type'
    });

    await queryInterface.addIndex('email_campaigns', ['scheduled_at'], {
      name: 'email_campaigns_scheduled_at'
    });

    await queryInterface.addIndex('email_campaigns', ['sent_at'], {
      name: 'email_campaigns_sent_at'
    });

    await queryInterface.addIndex('email_campaigns', ['created_by'], {
      name: 'email_campaigns_created_by'
    });

    await queryInterface.addIndex('email_campaigns', ['is_active'], {
      name: 'email_campaigns_is_active'
    });

    await queryInterface.addIndex('email_campaigns', ['status', 'is_active'], {
      name: 'email_campaigns_status_active'
    });

    // 2. Create email_campaign_recipients table
    await queryInterface.createTable('email_campaign_recipients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'email_campaigns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Parent campaign'
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Recipient patient'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Recipient email address'
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed', 'bounced'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Delivery status'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When email was sent'
      },
      opened_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When email was first opened'
      },
      clicked_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When a link was first clicked'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if failed'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for email_campaign_recipients
    await queryInterface.addIndex('email_campaign_recipients', ['campaign_id'], {
      name: 'email_campaign_recipients_campaign_id'
    });

    await queryInterface.addIndex('email_campaign_recipients', ['patient_id'], {
      name: 'email_campaign_recipients_patient_id'
    });

    await queryInterface.addIndex('email_campaign_recipients', ['status'], {
      name: 'email_campaign_recipients_status'
    });

    await queryInterface.addIndex('email_campaign_recipients', ['sent_at'], {
      name: 'email_campaign_recipients_sent_at'
    });

    await queryInterface.addIndex('email_campaign_recipients', ['campaign_id', 'status'], {
      name: 'email_campaign_recipients_campaign_status'
    });

    await queryInterface.addIndex('email_campaign_recipients', ['campaign_id', 'patient_id'], {
      name: 'email_campaign_recipients_campaign_patient',
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('email_campaign_recipients');
    await queryInterface.dropTable('email_campaigns');
  }
};
