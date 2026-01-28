module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      set(value) {
        // Normalize email: trim and lowercase
        if (value) {
          this.setDataValue('email', value.trim().toLowerCase());
        } else {
          this.setDataValue('email', value);
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    language_preference: {
      type: DataTypes.ENUM('fr', 'en'),
      allowNull: false,
      defaultValue: 'fr',
      comment: 'User preferred language (fr=french, en=english)'
    },
    // Google Calendar integration fields
    google_access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Google OAuth2 access token for Calendar API'
    },
    google_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Google OAuth2 refresh token for Calendar API'
    },
    google_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Google access token expiry date'
    },
    google_calendar_sync_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether Google Calendar sync is enabled for this user'
    },
    google_calendar_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'primary',
      comment: 'Google Calendar ID to sync with (default: primary)'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['username']
      },
      {
        fields: ['email']
      },
      {
        fields: ['role_id']
      }
    ]
  });

  return User;
};
