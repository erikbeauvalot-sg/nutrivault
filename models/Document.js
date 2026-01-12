module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'patient, visit, user - polymorphic association (optional for general uploads)'
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of associated resource - polymorphic association (optional for general uploads)'
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Relative path from uploads directory'
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['resource_type']
      },
      {
        fields: ['resource_id']
      },
      {
        fields: ['uploaded_by']
      },
      {
        fields: ['resource_type', 'resource_id']
      }
    ]
  });

  return Document;
};
