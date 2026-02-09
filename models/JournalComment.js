module.exports = (sequelize, DataTypes) => {
  const JournalComment = sequelize.define('JournalComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    journal_entry_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'journal_entries',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'journal_comments',
    timestamps: true,
    paranoid: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { name: 'idx_journal_comments_entry', fields: ['journal_entry_id'] },
      { name: 'idx_journal_comments_user', fields: ['user_id'] }
    ]
  });

  JournalComment.associate = (models) => {
    JournalComment.belongsTo(models.JournalEntry, {
      foreignKey: 'journal_entry_id',
      as: 'journalEntry'
    });
    JournalComment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author'
    });
  };

  return JournalComment;
};
