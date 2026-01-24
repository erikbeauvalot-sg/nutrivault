/**
 * MeasureAlert Model
 *
 * Stores alerts generated when patient measure values fall outside normal/critical ranges
 *
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

module.exports = (sequelize, DataTypes) => {
  const MeasureAlert = sequelize.define('MeasureAlert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Patient this alert is for'
    },
    patient_measure_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'The specific measure that triggered this alert'
    },
    measure_definition_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'The measure type'
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      allowNull: false,
      defaultValue: 'warning',
      validate: {
        isIn: [['info', 'warning', 'critical']]
      },
      comment: 'Alert severity level'
    },
    alert_type: {
      type: DataTypes.ENUM('below_critical', 'above_critical', 'below_normal', 'above_normal'),
      allowNull: false,
      validate: {
        isIn: [['below_critical', 'above_critical', 'below_normal', 'above_normal']]
      },
      comment: 'Type of range violation'
    },
    value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      validate: {
        isDecimal: true
      },
      comment: 'The actual measured value that triggered the alert'
    },
    threshold_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: true
      },
      comment: 'The threshold that was crossed'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Human-readable alert message'
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this alert was acknowledged'
    },
    acknowledged_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who acknowledged the alert'
    },
    email_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether email notification was sent'
    },
    email_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When email notification was sent'
    }
  }, {
    tableName: 'measure_alerts',
    timestamps: true,
    underscored: true,
    paranoid: false // No soft delete for alerts
  });

  /**
   * Check if alert is acknowledged
   * @returns {boolean}
   */
  MeasureAlert.prototype.isAcknowledged = function() {
    return this.acknowledged_at !== null;
  };

  /**
   * Acknowledge this alert
   * @param {string} userId - User ID who is acknowledging
   * @returns {Promise<MeasureAlert>}
   */
  MeasureAlert.prototype.acknowledge = async function(userId) {
    this.acknowledged_at = new Date();
    this.acknowledged_by = userId;
    return await this.save();
  };

  /**
   * Get severity color for UI
   * @returns {string}
   */
  MeasureAlert.prototype.getSeverityColor = function() {
    switch (this.severity) {
      case 'critical':
        return 'danger'; // Bootstrap red
      case 'warning':
        return 'warning'; // Bootstrap yellow
      case 'info':
        return 'info'; // Bootstrap blue
      default:
        return 'secondary';
    }
  };

  /**
   * Get severity icon for UI
   * @returns {string}
   */
  MeasureAlert.prototype.getSeverityIcon = function() {
    switch (this.severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📊';
    }
  };

  return MeasureAlert;
};
