module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'No FK constraint - audit logs must persist even if user deleted'
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Denormalized for audit trail'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.'
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'patient, visit, billing, user, document, etc.'
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of affected resource'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IPv4 or IPv6 address'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'GET, POST, PUT, DELETE'
    },
    request_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of before/after values'
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['resource_type']
      },
      {
        fields: ['resource_id']
      },
      {
        fields: ['action']
      }
    ]
  });

  return AuditLog;
};
