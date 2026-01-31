module.exports = (sequelize, DataTypes) => {
  const DocumentShare = sequelize.define('DocumentShare', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    shared_by: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User who shared the document'
    },
    sent_via: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'email',
      comment: 'Delivery method: email, portal, link, etc.'
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the document was sent'
    },
    viewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the patient viewed the document (if tracked)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional notes about why this was shared'
    },
    // New fields for public share links
    share_token: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'Secure random token for public share links'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration timestamp for the share link'
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Bcrypt hash of password for protected shares'
    },
    download_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times the document has been downloaded via this share'
    },
    max_downloads: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of allowed downloads (null = unlimited)'
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the share was last accessed'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the share link is active (can be revoked)'
    }
  }, {
    tableName: 'document_shares',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['document_id']
      },
      {
        fields: ['patient_id']
      },
      {
        fields: ['shared_by']
      },
      {
        fields: ['sent_at']
      },
      {
        fields: ['share_token'],
        unique: true
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  DocumentShare.associate = (models) => {
    DocumentShare.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'document'
    });
    DocumentShare.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    DocumentShare.belongsTo(models.User, {
      foreignKey: 'shared_by',
      as: 'sharedByUser'
    });
    DocumentShare.hasMany(models.DocumentAccessLog, {
      foreignKey: 'document_share_id',
      as: 'accessLogs'
    });
  };

  // Instance methods
  DocumentShare.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  };

  DocumentShare.prototype.hasReachedDownloadLimit = function() {
    if (!this.max_downloads) return false;
    return this.download_count >= this.max_downloads;
  };

  DocumentShare.prototype.isAccessible = function() {
    return this.is_active && !this.isExpired() && !this.hasReachedDownloadLimit();
  };

  return DocumentShare;
};
