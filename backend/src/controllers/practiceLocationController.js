/**
 * Practice Location Controller
 * CRUD for the configurable list of consultation locations (cabinets).
 */

const db = require('../../../models');
const { PracticeLocation } = db;
const { assertValidBankAccount } = require('../helpers/bankAccounts');

/** Build a stable uppercase code from a label (fallback when none supplied). */
function slugifyCode(label) {
  const stripped = String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accent marks
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return stripped || 'LOCATION';
}

async function uniqueCode(base) {
  let code = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await PracticeLocation.findOne({ where: { code } })) {
    n += 1;
    code = `${base}_${n}`.slice(0, 50);
  }
  return code;
}

/** Keep at most one default location. */
async function clearOtherDefaults(id, transaction) {
  await PracticeLocation.update(
    { is_default: false },
    { where: { is_default: true, id: { [db.Sequelize.Op.ne]: id } }, transaction }
  );
}

const getAllPracticeLocations = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === '1';

    const locations = await PracticeLocation.findAll({
      where,
      order: [['display_order', 'ASC'], ['label', 'ASC']]
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('[PracticeLocationController] getAll error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get locations' });
  }
};

const createPracticeLocation = async (req, res) => {
  try {
    const { code, label, is_default, display_order, is_active, bank_account_code } = req.body;
    if (!label || !String(label).trim()) {
      return res.status(400).json({ success: false, error: 'Label is required' });
    }
    await assertValidBankAccount(bank_account_code || null);
    const finalCode = await uniqueCode(code ? slugifyCode(code) : slugifyCode(label));

    const location = await db.sequelize.transaction(async (transaction) => {
      const created = await PracticeLocation.create({
        code: finalCode,
        label: String(label).trim(),
        is_default: is_default === true,
        bank_account_code: bank_account_code || null,
        display_order: display_order || 0,
        is_active: is_active !== false
      }, { transaction });
      if (created.is_default) await clearOtherDefaults(created.id, transaction);
      return created;
    });
    res.status(201).json({ success: true, message: 'Location created', data: location });
  } catch (error) {
    console.error('[PracticeLocationController] create error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create location' });
  }
};

const updatePracticeLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, is_default, display_order, is_active, bank_account_code } = req.body;

    const location = await PracticeLocation.findByPk(id);
    if (!location) return res.status(404).json({ success: false, error: 'Location not found' });
    if (bank_account_code !== undefined) await assertValidBankAccount(bank_account_code || null);

    // `code` is intentionally immutable to keep historical invoices consistent.
    await db.sequelize.transaction(async (transaction) => {
      await location.update({
        label: label !== undefined ? String(label).trim() : location.label,
        is_default: is_default !== undefined ? is_default === true : location.is_default,
        bank_account_code: bank_account_code !== undefined ? (bank_account_code || null) : location.bank_account_code,
        display_order: display_order !== undefined ? display_order : location.display_order,
        is_active: is_active !== undefined ? is_active : location.is_active
      }, { transaction });
      if (location.is_default) await clearOtherDefaults(location.id, transaction);
    });
    res.json({ success: true, message: 'Location updated', data: location });
  } catch (error) {
    console.error('[PracticeLocationController] update error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update location' });
  }
};

const deletePracticeLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await PracticeLocation.findByPk(id);
    if (!location) return res.status(404).json({ success: false, error: 'Location not found' });

    const where = { location_code: location.code };
    const used = (await db.Billing.count({ where })) + (await db.Expense.count({ where }));
    if (used > 0) {
      return res.status(409).json({
        success: false,
        error: `Location is used by ${used} invoice(s) or expense(s): deactivate it instead`
      });
    }
    await location.destroy();
    res.json({ success: true, message: 'Location deleted' });
  } catch (error) {
    console.error('[PracticeLocationController] delete error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to delete location' });
  }
};

const reorderPracticeLocations = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Order must be an array of { id, display_order }' });
    }
    await db.sequelize.transaction(async (t) => {
      for (const item of order) {
        await PracticeLocation.update({ display_order: item.display_order }, { where: { id: item.id }, transaction: t });
      }
    });
    const locations = await PracticeLocation.findAll({ order: [['display_order', 'ASC'], ['label', 'ASC']] });
    res.json({ success: true, message: 'Locations reordered', data: locations });
  } catch (error) {
    console.error('[PracticeLocationController] reorder error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to reorder locations' });
  }
};

module.exports = {
  getAllPracticeLocations,
  createPracticeLocation,
  updatePracticeLocation,
  deletePracticeLocation,
  reorderPracticeLocations
};
