module.exports = (sequelize, DataTypes) => {
  const SidebarMenuConfig = sequelize.define('SidebarMenuConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    item_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'main'
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allowed_roles: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '["ADMIN","DIETITIAN"]',
      get() {
        const raw = this.getDataValue('allowed_roles');
        if (!raw) return ['ADMIN', 'DIETITIAN'];
        try {
          const parsed = JSON.parse(raw);
          // Handle SQLite double-encoding
          if (typeof parsed === 'string') return JSON.parse(parsed);
          return parsed;
        } catch {
          return ['ADMIN', 'DIETITIAN'];
        }
      },
      set(val) {
        this.setDataValue('allowed_roles', JSON.stringify(val));
      }
    },
    category_key: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'sidebar_menu_configs',
    timestamps: true,
    underscored: true
  });

  return SidebarMenuConfig;
};
