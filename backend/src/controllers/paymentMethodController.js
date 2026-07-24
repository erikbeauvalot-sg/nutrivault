/**
 * Payment Method Controller
 * CRUD for the admin/dietitian-configurable list of billing payment methods.
 */

const db = require('../../../models');
const { PaymentMethod } = db;

/** Build a stable uppercase code from a label (fallback when none supplied). */
function slugifyCode(label) {
  const stripped = String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accent marks
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return stripped || 'METHOD';
}

async function uniqueCode(base) {
  let code = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await PaymentMethod.findOne({ where: { code } })) {
    n += 1;
    code = `${base}_${n}`.slice(0, 50);
  }
  return code;
}

const getAllPaymentMethods = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === '1';
    if (search) where.label = { [db.Sequelize.Op.like]: `%${search}%` };

    const methods = await PaymentMethod.findAll({
      where,
      order: [['display_order', 'ASC'], ['label', 'ASC']]
    });
    res.json({ success: true, data: methods });
  } catch (error) {
    console.error('[PaymentMethodController] getAll error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get payment methods' });
  }
};

const createPaymentMethod = async (req, res) => {
  try {
    const { code, label, is_card, display_order, is_active } = req.body;
    if (!label) {
      return res.status(400).json({ success: false, error: 'Label is required' });
    }
    const finalCode = await uniqueCode(code ? slugifyCode(code) : slugifyCode(label));

    const method = await PaymentMethod.create({
      code: finalCode,
      label,
      is_card: is_card === true,
      display_order: display_order || 0,
      is_active: is_active !== false
    });
    res.status(201).json({ success: true, message: 'Payment method created', data: method });
  } catch (error) {
    console.error('[PaymentMethodController] create error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create payment method' });
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, is_card, display_order, is_active } = req.body;

    const method = await PaymentMethod.findByPk(id);
    if (!method) return res.status(404).json({ success: false, error: 'Payment method not found' });

    // `code` is intentionally immutable to keep historical records consistent.
    await method.update({
      label: label !== undefined ? label : method.label,
      is_card: is_card !== undefined ? is_card : method.is_card,
      display_order: display_order !== undefined ? display_order : method.display_order,
      is_active: is_active !== undefined ? is_active : method.is_active
    });
    res.json({ success: true, message: 'Payment method updated', data: method });
  } catch (error) {
    console.error('[PaymentMethodController] update error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update payment method' });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findByPk(id);
    if (!method) return res.status(404).json({ success: false, error: 'Payment method not found' });
    await method.destroy();
    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error('[PaymentMethodController] delete error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to delete payment method' });
  }
};

const reorderPaymentMethods = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Order must be an array of { id, display_order }' });
    }
    await db.sequelize.transaction(async (t) => {
      for (const item of order) {
        await PaymentMethod.update({ display_order: item.display_order }, { where: { id: item.id }, transaction: t });
      }
    });
    const methods = await PaymentMethod.findAll({ order: [['display_order', 'ASC'], ['label', 'ASC']] });
    res.json({ success: true, message: 'Payment methods reordered', data: methods });
  } catch (error) {
    console.error('[PaymentMethodController] reorder error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to reorder payment methods' });
  }
};

module.exports = {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods
};
