/**
 * Cash date (date d'encaissement) helper tests
 */

const { toISODate, effectiveCashDate, secondOfNextMonth, nextDay } = require('../../src/helpers/cashDate');

describe('cashDate helpers', () => {
  describe('toISODate', () => {
    it('keeps YYYY-MM-DD strings as is', () => {
      expect(toISODate('2026-03-18')).toBe('2026-03-18');
    });

    it('uses the UTC calendar day of dates', () => {
      expect(toISODate(new Date('2026-01-30T23:43:18Z'))).toBe('2026-01-30');
    });

    it('returns null for empty or invalid values', () => {
      expect(toISODate(null)).toBeNull();
      expect(toISODate('not a date')).toBeNull();
    });
  });

  describe('effectiveCashDate', () => {
    it('falls back to the invoice date', () => {
      expect(effectiveCashDate({ cash_date: null, invoice_date: new Date('2026-03-18T10:00:00Z') })).toBe('2026-03-18');
    });

    it('prefers the cash date when set', () => {
      expect(effectiveCashDate({ cash_date: '2026-04-02', invoice_date: new Date('2026-03-18T10:00:00Z') })).toBe('2026-04-02');
    });
  });

  describe('secondOfNextMonth', () => {
    it.each([
      ['2026-03-18', '2026-04-02'],
      ['2026-01-31', '2026-02-02'],
      ['2026-04-02', '2026-05-02'],
      ['2026-12-30', '2027-01-02']
    ])('%s → %s', (input, expected) => {
      expect(secondOfNextMonth(input)).toBe(expected);
    });
  });

  describe('nextDay', () => {
    it('handles month and year ends', () => {
      expect(nextDay('2026-02-28')).toBe('2026-03-01');
      expect(nextDay('2026-12-31')).toBe('2027-01-01');
    });
  });
});
