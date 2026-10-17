/**
 * Cash date (date d'encaissement) helpers
 *
 * An invoice's effective cash date is its `cash_date` when set, otherwise its
 * `invoice_date`. All revenue figures (revenue list, cash flow, dashboard,
 * accounting export) are bucketed by this effective date.
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

/**
 * Format a date as YYYY-MM-DD (UTC calendar day)
 * @param {Date|string} value
 * @returns {string|null}
 */
function toISODate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Effective cash date of an invoice as YYYY-MM-DD
 * @param {Object} invoice - Billing record (or plain object)
 * @returns {string|null}
 */
function effectiveCashDate(invoice) {
  return toISODate(invoice.cash_date) || toISODate(invoice.invoice_date);
}

/**
 * The 2nd of the month following the given date
 * @param {Date|string} value
 * @returns {string} YYYY-MM-DD
 */
function secondOfNextMonth(value) {
  const [year, month] = toISODate(value).split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 2)); // month is 1-based here, so this is next month
  return next.toISOString().slice(0, 10);
}

/**
 * The day after a YYYY-MM-DD date (used for inclusive end bounds)
 * @param {string} value
 * @returns {string}
 */
function nextDay(value) {
  const date = new Date(`${toISODate(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * SQL expression COALESCE(cash_date, invoice_date)
 * @param {string} alias - Table alias used in the query (default: model name)
 */
function cashDateExpr(alias = 'Billing') {
  return db.sequelize.fn(
    'COALESCE',
    db.sequelize.col(`${alias}.cash_date`),
    db.sequelize.col(`${alias}.invoice_date`)
  );
}

/**
 * Where clause restricting invoices to an effective cash date range.
 * Both bounds are inclusive calendar days (YYYY-MM-DD or Date).
 * @param {string|Date|null} start
 * @param {string|Date|null} end
 * @param {string} alias
 * @returns {Object} Sequelize where fragment (empty when no bounds)
 */
function cashDateRangeWhere(start, end, alias = 'Billing') {
  const conditions = [];
  if (start) {
    conditions.push(db.sequelize.where(cashDateExpr(alias), Op.gte, toISODate(start)));
  }
  if (end) {
    conditions.push(db.sequelize.where(cashDateExpr(alias), Op.lt, nextDay(end)));
  }
  return conditions.length ? { [Op.and]: conditions } : {};
}

module.exports = {
  toISODate,
  effectiveCashDate,
  secondOfNextMonth,
  nextDay,
  cashDateExpr,
  cashDateRangeWhere
};
