module.exports = (sequelize, DataTypes) => {
  const SidebarCategory = sequelize.define('SidebarCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '📁'
    },
    section: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'main'
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_default_open: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'sidebar_categories',
    timestamps: true,
    underscored: true
  });

  return SidebarCategory;
};
