/**
 * comptaExpenses helper — recurring expense expansion (no DB).
 */

const { expandRecurringExpenses } = require('../../src/helpers/comptaExpenses');

const monthsOf = (occurrences, sourceId) =>
  occurrences.filter(o => o._sourceId === sourceId).map(o => o.expense_date.getUTCMonth());

describe('expandRecurringExpenses', () => {
  test('one-off expense inside the year passes through once', () => {
    const out = expandRecurringExpenses([
      { id: 'a', expense_date: '2026-02-01', amount: 7.9, category: 'OTHER', is_recurring: false }
    ], 2026);
    expect(out).toHaveLength(1);
    expect(out[0].expense_date.getUTCMonth()).toBe(1);
  });

  test('one-off expense outside the year is dropped', () => {
    const out = expandRecurringExpenses([
      { id: 'a', expense_date: '2025-12-01', amount: 10, category: 'OTHER', is_recurring: false }
    ], 2026);
    expect(out).toHaveLength(0);
  });

  test('MONTHLY recurring with no end fills all 12 months', () => {
    const out = expandRecurringExpenses([
      { id: 'rent', expense_date: '2026-01-01', amount: 450, category: 'RENT', is_recurring: true, recurring_period: 'MONTHLY', recurring_end_date: null }
    ], 2026);
    expect(monthsOf(out, 'rent')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test('YEARLY recurring appears once in the year', () => {
    const out = expandRecurringExpenses([
      { id: 'adl', expense_date: '2026-01-01', amount: 45, category: 'OTHER', is_recurring: true, recurring_period: 'YEARLY', recurring_end_date: null }
    ], 2026);
    expect(monthsOf(out, 'adl')).toEqual([0]);
  });

  test('QUARTERLY recurring yields 4 occurrences', () => {
    const out = expandRecurringExpenses([
      { id: 'q', expense_date: '2026-01-01', amount: 100, category: 'OTHER', is_recurring: true, recurring_period: 'QUARTERLY', recurring_end_date: null }
    ], 2026);
    expect(monthsOf(out, 'q')).toEqual([0, 3, 6, 9]);
  });

  test('recurring stops at recurring_end_date', () => {
    const out = expandRecurringExpenses([
      { id: 'x', expense_date: '2026-01-01', amount: 20, category: 'OTHER', is_recurring: true, recurring_period: 'MONTHLY', recurring_end_date: '2026-03-31' }
    ], 2026);
    expect(monthsOf(out, 'x')).toEqual([0, 1, 2]);
  });

  test('recurring that started before the year still fills the year', () => {
    const out = expandRecurringExpenses([
      { id: 'old', expense_date: '2025-06-01', amount: 30, category: 'OTHER', is_recurring: true, recurring_period: 'MONTHLY', recurring_end_date: null }
    ], 2026);
    expect(monthsOf(out, 'old')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});
