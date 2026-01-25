'use strict';

/**
 * Migration: Create Email Templates System
 * Sprint 5: US-5.5.2 - Email Templates
 *
 * Tables:
 * - email_templates: Dynamic email template definitions
 * - email_logs: Audit trail for all template-based email sends
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create email_templates table
    await queryInterface.createTable('email_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Human-readable template name'
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique identifier for template (e.g., invoice_notification)'
      },
      category: {
        type: Sequelize.ENUM(
          'invoice',
          'document_share',
          'payment_reminder',
          'appointment_reminder',
          'follow_up',
          'general'
        ),
        allowNull: false,
        comment: 'Template category determines available variables'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of what this template is used for'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Email subject line (supports {{variables}})'
      },
      body_html: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'HTML email body (supports {{variables}})'
      },
      body_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Plain text email body (auto-generated if null)'
      },
      available_variables: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
        comment: 'Array of variable names available for this template'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Version counter (increments on content update)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this template is active'
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System templates cannot be deleted (only deactivated)'
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
        comment: 'User who created this template'
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who last updated this template'
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Add indexes for email_templates
    await queryInterface.addIndex('email_templates', ['slug'], {
      name: 'email_templates_slug',
      unique: true
    });

    await queryInterface.addIndex('email_templates', ['category', 'is_active'], {
      name: 'email_templates_category_active'
    });

    await queryInterface.addIndex('email_templates', ['is_active'], {
      name: 'email_templates_is_active'
    });

    await queryInterface.addIndex('email_templates', ['is_system'], {
      name: 'email_templates_is_system'
    });

    // 2. Create email_logs table
    await queryInterface.createTable('email_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'email_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Template used (null if template was deleted)'
      },
      template_slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Template slug at time of send (preserved even if template deleted)'
      },
      sent_to: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address recipient'
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
        comment: 'Patient this email relates to (if applicable)'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Rendered subject line'
      },
      variables_used: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Variables passed to template at send time'
      },
      status: {
        type: Sequelize.ENUM('sent', 'failed', 'queued'),
        allowNull: false,
        defaultValue: 'sent',
        comment: 'Email delivery status'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if status is failed'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the email was sent'
      },
      sent_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who triggered the email'
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

    // Add indexes for email_logs
    await queryInterface.addIndex('email_logs', ['template_id'], {
      name: 'email_logs_template_id'
    });

    await queryInterface.addIndex('email_logs', ['patient_id'], {
      name: 'email_logs_patient_id'
    });

    await queryInterface.addIndex('email_logs', ['status'], {
      name: 'email_logs_status'
    });

    await queryInterface.addIndex('email_logs', ['sent_at'], {
      name: 'email_logs_sent_at'
    });

    await queryInterface.addIndex('email_logs', ['template_slug', 'sent_at'], {
      name: 'email_logs_slug_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (child first, then parent)
    await queryInterface.dropTable('email_logs');
    await queryInterface.dropTable('email_templates');
  }
};
