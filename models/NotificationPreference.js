module.exports = (sequelize, DataTypes) => {
  const NotificationPreference = sequelize.define('NotificationPreference', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    appointment_reminders: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    new_documents: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    measure_alerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    journal_comments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    new_messages: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    reminder_times_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      get() {
        const raw = this.getDataValue('reminder_times_hours');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      },
      set(val) {
        this.setDataValue('reminder_times_hours', val ? JSON.stringify(val) : null);
      },
    },
  }, {
    tableName: 'notification_preferences',
    timestamps: true,
    underscored: true,
  });

  return NotificationPreference;
};
