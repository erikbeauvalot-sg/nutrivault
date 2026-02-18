module.exports = (sequelize, DataTypes) => {
  const DashboardPreference = sequelize.define('DashboardPreference', {
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
    widgets: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}',
      get() {
        const raw = this.getDataValue('widgets');
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
      },
      set(val) {
        this.setDataValue('widgets', val ? JSON.stringify(val) : '{}');
      },
    },
  }, {
    tableName: 'dashboard_preferences',
    timestamps: true,
    underscored: true,
  });

  return DashboardPreference;
};
