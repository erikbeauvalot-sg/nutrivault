'use strict';

/**
 * Migration: Create Measure Alerts Table
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 *
 * Table: measure_alerts
 * Stores alerts generated when patient measure values fall outside normal/critical ranges
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create measure_alerts table
    await queryInterface.createTable('measure_alerts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Patient this alert is for'
      },
      patient_measure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patient_measures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'The specific measure that triggered this alert'
      },
      measure_definition_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'measure_definitions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'The measure type'
      },
      severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical'),
        allowNull: false,
        defaultValue: 'warning',
        comment: 'Alert severity level'
      },
      alert_type: {
        type: Sequelize.ENUM('below_critical', 'above_critical', 'below_normal', 'above_normal'),
        allowNull: false,
        comment: 'Type of range violation'
      },
      value: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false,
        comment: 'The actual measured value that triggered the alert'
      },
      threshold_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'The threshold that was crossed'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Human-readable alert message'
      },
      acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this alert was acknowledged'
      },
      acknowledged_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who acknowledged the alert'
      },
      email_sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether email notification was sent'
      },
      email_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When email notification was sent'
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

    // Create indexes for efficient queries
    await queryInterface.addIndex('measure_alerts', ['patient_id', 'acknowledged_at'], {
      name: 'measure_alerts_patient_ack',
      comment: 'Get unacknowledged alerts for a patient'
    });

    await queryInterface.addIndex('measure_alerts', ['measure_definition_id', 'created_at'], {
      name: 'measure_alerts_definition_date',
      comment: 'Get alerts by measure type over time'
    });

    await queryInterface.addIndex('measure_alerts', ['severity', 'acknowledged_at'], {
      name: 'measure_alerts_severity',
      comment: 'Get unacknowledged alerts by severity'
    });

    await queryInterface.addIndex('measure_alerts', ['patient_id', 'measure_definition_id', 'created_at'], {
      name: 'measure_alerts_deduplication',
      comment: 'For checking recent alerts (deduplication)'
    });

    await queryInterface.addIndex('measure_alerts', ['acknowledged_at'], {
      name: 'measure_alerts_acknowledged',
      comment: 'Filter acknowledged vs unacknowledged'
    });

    console.log('✅ Measure alerts table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('measure_alerts');
    console.log('✅ Measure alerts table dropped successfully');
  }
};
