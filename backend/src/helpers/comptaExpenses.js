/**
 * Comptabilité expense helpers.
 *
 * Recurring expenses are stored as a SINGLE row carrying `is_recurring`,
 * `recurring_period` (MONTHLY|QUARTERLY|YEARLY) and an optional
 * `recurring_end_date`. For accounting we must materialise one occurrence per
 * period within the exported year (up to the end date, or the end of the year
 * when none is set).
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

const PERIOD_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

/**
 * Sequelize `where` clause selecting every expense that can have an occurrence
 * within [year-01-01, year+1-01-01): one-off expenses dated inside the year,
 * plus recurring expenses that start before year end and haven't ended before
 * year start.
 */
function yearExpenseWhere(year, baseWhere = {}) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return {
    ...baseWhere,
    [Op.or]: [
      { is_recurring: { [Op.not]: true }, expense_date: { [Op.gte]: start, [Op.lt]: end } },
      {
        is_recurring: true,
        expense_date: { [Op.lt]: end },
        [Op.or]: [
          { recurring_end_date: null },
          { recurring_end_date: { [Op.gte]: start } }
        ]
      }
    ]
  };
}

function occurrenceOf(exp, date) {
  return {
    expense_date: new Date(date),
    amount: exp.amount,
    category: exp.category,
    vendor: exp.vendor,
    description: exp.description,
    is_recurring: exp.is_recurring,
    recurring_period: exp.recurring_period,
    _sourceId: exp.id
  };
}

/**
 * Expand a list of expense rows into concrete occurrences that fall inside the
 * exported year. Non-recurring rows pass through unchanged; recurring rows are
 * stepped by their period from `expense_date` up to `recurring_end_date` (or the
 * end of the year).
 */
function expandRecurringExpenses(expenses, year) {
  const yStart = Date.UTC(year, 0, 1);
  const yEnd = Date.UTC(year + 1, 0, 1);
  const out = [];

  for (const exp of expenses) {
    const startTime = new Date(exp.expense_date).getTime();

    if (!exp.is_recurring) {
      if (startTime >= yStart && startTime < yEnd) out.push(occurrenceOf(exp, exp.expense_date));
      continue;
    }

    const step = PERIOD_MONTHS[exp.recurring_period] || 1;
    const hardEnd = exp.recurring_end_date ? new Date(exp.recurring_end_date).getTime() : null;

    const cursor = new Date(exp.expense_date);
    let guard = 0;
    while (cursor.getTime() < yEnd && guard < 600) {
      guard += 1;
      const t = cursor.getTime();
      if (hardEnd !== null && t > hardEnd) break;
      if (t >= yStart) out.push(occurrenceOf(exp, cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + step);
    }
  }

  return out;
}

module.exports = { yearExpenseWhere, expandRecurringExpenses, occurrenceOf };
