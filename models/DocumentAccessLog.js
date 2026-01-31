module.exports = (sequelize, DataTypes) => {
  const DocumentAccessLog = sequelize.define('DocumentAccessLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    document_share_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the document share'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the accessor (supports IPv6)'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/client user agent string'
    },
    action: {
      type: DataTypes.ENUM('view', 'download', 'password_attempt'),
      allowNull: false,
      comment: 'Type of access action'
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the action was successful'
    }
  }, {
    tableName: 'document_access_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at for logs
    underscored: true,
    indexes: [
      {
        fields: ['document_share_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['ip_address']
      }
    ]
  });

  DocumentAccessLog.associate = (models) => {
    DocumentAccessLog.belongsTo(models.DocumentShare, {
      foreignKey: 'document_share_id',
      as: 'documentShare'
    });
  };

  return DocumentAccessLog;
};
