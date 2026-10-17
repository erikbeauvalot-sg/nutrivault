module.exports = (sequelize, DataTypes) => {
  const PracticeLocation = sequelize.define('PracticeLocation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    // Stable value stored on billing records. Never changes once set;
    // the editable display is `label`.
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [1, 50] }
    },
    // Also written as-is in the accounting export "Structure" column, so it
    // must match the labels used by the TRÉSO formulas (e.g. "Suresnes").
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] }
    },
    // Location given to new invoices (at most one).
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Default bank account of the revenue at this location
    bank_account_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: true, min: 0 }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'practice_locations',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active', 'display_order'] },
      { fields: ['code'], unique: true }
    ]
  });

  /** Code of the default active location, or null. */
  PracticeLocation.defaultCode = async function defaultCode() {
    const location = await PracticeLocation.findOne({
      where: { is_default: true, is_active: true },
      attributes: ['code']
    });
    return location ? location.code : null;
  };

  /** True when `code` is null (no location) or an existing location code. */
  PracticeLocation.isValidCode = async function isValidCode(code) {
    if (code === null) return true;
    return (await PracticeLocation.count({ where: { code } })) > 0;
  };

  return PracticeLocation;
};
