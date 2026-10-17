/**
 * Bank Account Controller
 * CRUD for the configurable list of bank accounts (treasury per account).
 */

const db = require('../../../models');
const { BankAccount } = db;

/** Build a stable uppercase code from a label (fallback when none supplied). */
function slugifyCode(label) {
  const stripped = String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accent marks
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return stripped || 'ACCOUNT';
}

async function uniqueCode(base) {
  let code = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await BankAccount.findOne({ where: { code } })) {
    n += 1;
    code = `${base}_${n}`.slice(0, 50);
  }
  return code;
}

/** Keep at most one default account. */
async function clearOtherDefaults(id, transaction) {
  await BankAccount.update(
    { is_default: false },
    { where: { is_default: true, id: { [db.Sequelize.Op.ne]: id } }, transaction }
  );
}

const optionalText = (value) => (value === undefined ? undefined : (String(value || '').trim() || null));

const getAllBankAccounts = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === '1';

    const accounts = await BankAccount.findAll({
      where,
      order: [['display_order', 'ASC'], ['label', 'ASC']]
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('[BankAccountController] getAll error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get bank accounts' });
  }
};

const createBankAccount = async (req, res) => {
  try {
    const { code, label, bank_name, iban, is_default, display_order, is_active } = req.body;
    if (!label || !String(label).trim()) {
      return res.status(400).json({ success: false, error: 'Label is required' });
    }
    const finalCode = await uniqueCode(code ? slugifyCode(code) : slugifyCode(label));

    const account = await db.sequelize.transaction(async (transaction) => {
      const created = await BankAccount.create({
        code: finalCode,
        label: String(label).trim(),
        bank_name: optionalText(bank_name) ?? null,
        iban: optionalText(iban) ?? null,
        is_default: is_default === true,
        display_order: display_order || 0,
        is_active: is_active !== false
      }, { transaction });
      if (created.is_default) await clearOtherDefaults(created.id, transaction);
      return created;
    });
    res.status(201).json({ success: true, message: 'Bank account created', data: account });
  } catch (error) {
    console.error('[BankAccountController] create error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create bank account' });
  }
};

const updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, bank_name, iban, is_default, display_order, is_active } = req.body;

    const account = await BankAccount.findByPk(id);
    if (!account) return res.status(404).json({ success: false, error: 'Bank account not found' });

    // `code` is intentionally immutable to keep historical records consistent.
    await db.sequelize.transaction(async (transaction) => {
      await account.update({
        label: label !== undefined ? String(label).trim() : account.label,
        bank_name: bank_name !== undefined ? optionalText(bank_name) : account.bank_name,
        iban: iban !== undefined ? optionalText(iban) : account.iban,
        is_default: is_default !== undefined ? is_default === true : account.is_default,
        display_order: display_order !== undefined ? display_order : account.display_order,
        is_active: is_active !== undefined ? is_active : account.is_active
      }, { transaction });
      if (account.is_default) await clearOtherDefaults(account.id, transaction);
    });
    res.json({ success: true, message: 'Bank account updated', data: account });
  } catch (error) {
    console.error('[BankAccountController] update error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update bank account' });
  }
};

const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await BankAccount.findByPk(id);
    if (!account) return res.status(404).json({ success: false, error: 'Bank account not found' });

    const where = { bank_account_code: account.code };
    const used = (await db.Billing.count({ where }))
      + (await db.Expense.count({ where }))
      + (await db.AccountingEntry.count({ where }))
      + (await db.PracticeLocation.count({ where }));
    if (used > 0) {
      return res.status(409).json({
        success: false,
        error: `Bank account is used by ${used} record(s): deactivate it instead`
      });
    }
    await account.destroy();
    res.json({ success: true, message: 'Bank account deleted' });
  } catch (error) {
    console.error('[BankAccountController] delete error:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to delete bank account' });
  }
};

module.exports = {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount
};
