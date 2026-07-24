module.exports = (sequelize, DataTypes) => {
  const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    // Stable value stored on expense records; the editable display is `label`.
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [1, 50] }
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] }
    },
    // Which TRÉSO CHARGES line this category feeds in the accounting export.
    treso_line: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'autres',
      validate: {
        isIn: [['loyer', 'doctolib', 'rcpro', 'assurance', 'autres']]
      }
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
    tableName: 'expense_categories',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active', 'display_order'] },
      { fields: ['code'], unique: true }
    ]
  });

  // Defaults matching the values historically hard-coded in the UI/model.
  // treso_line pre-maps the two categories that had dedicated TRÉSO lines; all
  // others default to 'autres' (Autres dépenses). Doctolib/RC pro stay detected
  // by vendor/description keyword in the export regardless of category.
  ExpenseCategory.DEFAULTS = [
    { code: 'RENT', label: 'Loyer', treso_line: 'loyer', display_order: 1 },
    { code: 'EQUIPMENT', label: 'Équipement', treso_line: 'autres', display_order: 2 },
    { code: 'SOFTWARE', label: 'Logiciels', treso_line: 'autres', display_order: 3 },
    { code: 'INSURANCE', label: 'Assurance', treso_line: 'assurance', display_order: 4 },
    { code: 'TRAINING', label: 'Formation', treso_line: 'autres', display_order: 5 },
    { code: 'MARKETING', label: 'Marketing', treso_line: 'autres', display_order: 6 },
    { code: 'UTILITIES', label: 'Charges', treso_line: 'autres', display_order: 7 },
    { code: 'STAFF', label: 'Personnel', treso_line: 'autres', display_order: 8 },
    { code: 'PROFESSIONAL_FEES', label: 'Honoraires', treso_line: 'autres', display_order: 9 },
    { code: 'SUPPLIES', label: 'Fournitures', treso_line: 'autres', display_order: 10 },
    { code: 'TRAVEL', label: 'Déplacements', treso_line: 'autres', display_order: 11 },
    { code: 'OTHER', label: 'Autre', treso_line: 'autres', display_order: 12 }
  ];

  ExpenseCategory.ensureDefaults = async function ensureDefaults() {
    for (const def of ExpenseCategory.DEFAULTS) {
      await ExpenseCategory.findOrCreate({ where: { code: def.code }, defaults: def });
    }
  };

  return ExpenseCategory;
};
