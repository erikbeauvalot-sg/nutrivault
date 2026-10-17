// Built-in roles: their behaviour is hard-wired by name, so they cannot be renamed or deleted
const SYSTEM_ROLES = ['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER', 'PATIENT'];
const DATA_SCOPES = ['all', 'own'];

/**
 * Normalize a role name: trim, uppercase, strip accents, spaces/hyphens -> underscore.
 * "Comptabilité générale" -> "COMPTABILITE_GENERALE"
 */
function normalizeRoleName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('name', normalizeRoleName(value));
      },
      validate: {
        is: /^[A-Z][A-Z0-9_]{1,49}$/
      }
    },
    data_scope: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'own',
      validate: {
        isIn: [DATA_SCOPES]
      }
    },
    home_page: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Sidebar item_key opened after login'
    },
    is_system: {
      type: DataTypes.VIRTUAL,
      get() {
        return SYSTEM_ROLES.includes(this.getDataValue('name'));
      }
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
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name']
      }
    ]
  });

  Role.SYSTEM_ROLES = SYSTEM_ROLES;
  Role.DATA_SCOPES = DATA_SCOPES;
  Role.normalizeName = normalizeRoleName;

  return Role;
};
