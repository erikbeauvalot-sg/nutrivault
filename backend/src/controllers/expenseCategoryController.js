/**
 * Expense Category Controller
 * CRUD for the admin/dietitian-configurable list of expense categories.
 */

const db = require('../../../models');
const { ExpenseCategory } = db;

/** Build a stable uppercase code from a label (fallback when none supplied). */
function slugifyCode(label) {
  const stripped = String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accent marks
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return stripped || 'CATEGORY';
}

async function uniqueCode(base) {
  let code = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await ExpenseCategory.findOne({ where: { code } })) {
    n += 1;
    code = `${base}_${n}`.slice(0, 30);
  }
  return code;
}

const getAllExpenseCategories = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === '1';
    if (search) where.label = { [db.Sequelize.Op.like]: `%${search}%` };

    const categories = await ExpenseCategory.findAll({
      where,
      order: [['display_order', 'ASC'], ['label', 'ASC']]
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[ExpenseCategoryController] getAll error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get expense categories' });
  }
};

const createExpenseCategory = async (req, res) => {
  try {
    const { code, label, treso_line, display_order, is_active } = req.body;
    if (!label) {
      return res.status(400).json({ success: false, error: 'Label is required' });
    }
    const finalCode = await uniqueCode(code ? slugifyCode(code) : slugifyCode(label));

    const category = await ExpenseCategory.create({
      code: finalCode,
      label,
      treso_line: treso_line || 'autres',
      display_order: display_order || 0,
      is_active: is_active !== false
    });
    res.status(201).json({ success: true, message: 'Expense category created', data: category });
  } catch (error) {
    console.error('[ExpenseCategoryController] create error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create expense category' });
  }
};

const updateExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, treso_line, display_order, is_active } = req.body;

    const category = await ExpenseCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, error: 'Expense category not found' });

    // `code` is intentionally immutable to keep historical records consistent.
    await category.update({
      label: label !== undefined ? label : category.label,
      treso_line: treso_line !== undefined ? treso_line : category.treso_line,
      display_order: display_order !== undefined ? display_order : category.display_order,
      is_active: is_active !== undefined ? is_active : category.is_active
    });
    res.json({ success: true, message: 'Expense category updated', data: category });
  } catch (error) {
    console.error('[ExpenseCategoryController] update error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update expense category' });
  }
};

const deleteExpenseCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ExpenseCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, error: 'Expense category not found' });
    await category.destroy();
    res.json({ success: true, message: 'Expense category deleted' });
  } catch (error) {
    console.error('[ExpenseCategoryController] delete error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to delete expense category' });
  }
};

const reorderExpenseCategories = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Order must be an array of { id, display_order }' });
    }
    await db.sequelize.transaction(async (t) => {
      for (const item of order) {
        await ExpenseCategory.update({ display_order: item.display_order }, { where: { id: item.id }, transaction: t });
      }
    });
    const categories = await ExpenseCategory.findAll({ order: [['display_order', 'ASC'], ['label', 'ASC']] });
    res.json({ success: true, message: 'Expense categories reordered', data: categories });
  } catch (error) {
    console.error('[ExpenseCategoryController] reorder error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to reorder expense categories' });
  }
};

module.exports = {
  getAllExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  reorderExpenseCategories
};
