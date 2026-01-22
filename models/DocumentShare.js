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
      comment: 'Delivery method: email, portal, etc.'
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
  };

  return DocumentShare;
};
