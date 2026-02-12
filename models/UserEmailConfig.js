/**
 * UserEmailConfig Model
 * Stores user-specific SMTP configuration for sending emails
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const UserEmailConfig = sequelize.define('UserEmailConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    smtp_host: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    smtp_port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 587
    },
    smtp_secure: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    smtp_user: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    smtp_password: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    from_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    from_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reply_to: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'user_email_configs',
    timestamps: true,
    underscored: true
  });

  return UserEmailConfig;
};
