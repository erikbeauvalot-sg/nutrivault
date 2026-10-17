/**
 * Bank account helpers
 *
 * Default account of a record when none is given:
 * - revenue (invoices): the account of the invoice location
 * - expenses and accounting entries: the default account
 */

const db = require('../../../models');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/** Throw a 400 unless `code` is undefined, null or an existing account. */
async function assertValidBankAccount(code) {
  if (code !== undefined && !(await db.BankAccount.isValidCode(code))) {
    throw httpError(400, 'Bank account not found');
  }
}

/** Default account of a location, or null. */
async function locationBankAccount(locationCode) {
  if (!locationCode) return null;
  const location = await db.PracticeLocation.findOne({
    where: { code: locationCode },
    attributes: ['bank_account_code']
  });
  return location?.bank_account_code || null;
}

/**
 * Account of an invoice after its location changes: it follows the new
 * location unless it was set by hand (different from the old location account).
 */
async function bankAccountAfterLocationChange(invoice, newLocationCode) {
  const current = invoice.bank_account_code || null;
  const oldDefault = await locationBankAccount(invoice.location_code);
  if (current && current !== oldDefault) return current;
  return (await locationBankAccount(newLocationCode)) || current;
}

/** Explicit account, or the default account when none is given. */
async function expenseBankAccount(code) {
  if (code !== undefined) {
    await assertValidBankAccount(code);
    return code;
  }
  return db.BankAccount.defaultCode();
}

module.exports = {
  assertValidBankAccount,
  locationBankAccount,
  bankAccountAfterLocationChange,
  expenseBankAccount
};
