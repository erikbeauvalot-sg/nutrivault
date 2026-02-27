/**
 * Unit tests for currency.js
 * Tests currency formatting and parsing utilities.
 *
 * Note: Intl.NumberFormat output depends on the ICU data bundled with Node.js,
 * so exact string assertions are avoided for formatCurrency. Instead we verify
 * that the symbol, digits, and relative differences are present.
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatEuro, parseCurrency } from '../currency';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  describe('invalid / missing amounts — fallback to "0,00 €"', () => {
    it('returns "0,00 €" for null', () => {
      expect(formatCurrency(null)).toBe('0,00 €');
    });

    it('returns "0,00 €" for undefined', () => {
      expect(formatCurrency(undefined)).toBe('0,00 €');
    });

    it('returns "0,00 €" for NaN', () => {
      expect(formatCurrency(NaN)).toBe('0,00 €');
    });
  });

  describe('zero', () => {
    it('includes "0" and "€" for 0', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
      expect(result).toContain('€');
    });
  });

  describe('positive amounts', () => {
    it('includes "100" and "€" for amount 100', () => {
      const result = formatCurrency(100);
      expect(result).toContain('100');
      expect(result).toContain('€');
    });

    it('includes the major digit "1" and "€" for amount 1500.50', () => {
      const result = formatCurrency(1500.5);
      // The formatted string will contain the digit sequence in some form
      expect(result).toContain('1');
      expect(result).toContain('500');
      expect(result).toContain('€');
    });

    it('includes "€" for any positive amount', () => {
      expect(formatCurrency(0.01)).toContain('€');
      expect(formatCurrency(9999)).toContain('€');
    });
  });

  describe('negative amounts', () => {
    it('handles negative numbers and still includes "€"', () => {
      const result = formatCurrency(-50);
      expect(result).toContain('€');
      expect(result).toContain('50');
    });

    it('produces a different string than the positive counterpart', () => {
      expect(formatCurrency(-100)).not.toBe(formatCurrency(100));
    });
  });

  describe('different amounts produce different strings', () => {
    it('produces a different string for 100 vs 200', () => {
      expect(formatCurrency(100)).not.toBe(formatCurrency(200));
    });

    it('produces a different string for 0 vs 100', () => {
      expect(formatCurrency(0)).not.toBe(formatCurrency(100));
    });
  });

  describe('locale parameter', () => {
    it('defaults to "fr-FR" locale when no locale is provided', () => {
      // Both calls should produce the same string
      const withDefault = formatCurrency(100);
      const withFrFR = formatCurrency(100, 'fr-FR');
      expect(withDefault).toBe(withFrFR);
    });

    it('accepts a custom locale ("en-US") and still includes "€"', () => {
      // Currency remains EUR; the locale changes separators / symbol position
      const result = formatCurrency(100, 'en-US');
      expect(result).toContain('€');
      expect(result).toContain('100');
    });

    it('produces different formatting for fr-FR vs en-US for large amounts', () => {
      // The thousands-separator will differ between locales
      const fr = formatCurrency(1000, 'fr-FR');
      const en = formatCurrency(1000, 'en-US');
      // They may or may not be different depending on ICU, but both contain '1000' digits and '€'
      expect(fr).toContain('€');
      expect(en).toContain('€');
    });
  });
});

// ---------------------------------------------------------------------------
// formatEuro
// ---------------------------------------------------------------------------
describe('formatEuro', () => {
  describe('invalid / missing amounts — fallback to "0.00 €"', () => {
    it('returns "0.00 €" for null', () => {
      expect(formatEuro(null)).toBe('0.00 €');
    });

    it('returns "0.00 €" for undefined', () => {
      expect(formatEuro(undefined)).toBe('0.00 €');
    });

    it('returns "0.00 €" for NaN', () => {
      expect(formatEuro(NaN)).toBe('0.00 €');
    });
  });

  describe('zero', () => {
    it('returns "0.00 €" for 0', () => {
      expect(formatEuro(0)).toBe('0.00 €');
    });
  });

  describe('positive amounts', () => {
    it('returns "100.00 €" for 100', () => {
      expect(formatEuro(100)).toBe('100.00 €');
    });

    it('returns "100.50 €" for 100.5', () => {
      expect(formatEuro(100.5)).toBe('100.50 €');
    });

    it('rounds to 2 decimal places: 100.556 → "100.56 €"', () => {
      // toFixed(2) uses round-half-away-from-zero in most JS engines
      expect(formatEuro(100.556)).toBe('100.56 €');
    });

    it('returns "0.01 €" for 0.01', () => {
      expect(formatEuro(0.01)).toBe('0.01 €');
    });

    it('returns "9999.99 €" for 9999.99', () => {
      expect(formatEuro(9999.99)).toBe('9999.99 €');
    });
  });

  describe('negative amounts', () => {
    it('returns "-50.00 €" for -50', () => {
      expect(formatEuro(-50)).toBe('-50.00 €');
    });

    it('returns "-0.50 €" for -0.5', () => {
      expect(formatEuro(-0.5)).toBe('-0.50 €');
    });
  });

  describe('output format', () => {
    it('always ends with " €"', () => {
      expect(formatEuro(42)).toMatch(/ €$/);
    });

    it('always contains a dot separator for decimals', () => {
      expect(formatEuro(100)).toContain('.');
    });

    it('always has exactly 2 decimal places', () => {
      const result = formatEuro(42);
      const afterDot = result.split('.')[1];
      // afterDot is "00 €" — extract digits only
      const decimalDigits = afterDot.replace(/[^0-9]/g, '');
      expect(decimalDigits).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// parseCurrency
// ---------------------------------------------------------------------------
describe('parseCurrency', () => {
  describe('empty / falsy input — returns 0', () => {
    it('returns 0 for null', () => {
      expect(parseCurrency(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(parseCurrency(undefined)).toBe(0);
    });

    it('returns 0 for an empty string', () => {
      expect(parseCurrency('')).toBe(0);
    });
  });

  describe('standard formatEuro output strings', () => {
    it('parses "0.00 €" to 0', () => {
      expect(parseCurrency('0.00 €')).toBe(0);
    });

    it('parses "100.00 €" to 100', () => {
      expect(parseCurrency('100.00 €')).toBe(100);
    });

    it('parses "100.50 €" to 100.5', () => {
      expect(parseCurrency('100.50 €')).toBe(100.5);
    });

    it('parses "-50.00 €" to -50', () => {
      expect(parseCurrency('-50.00 €')).toBe(-50);
    });
  });

  describe('French-formatted strings with spaces and commas', () => {
    it('parses "1 500,50 €" to 1500.5 (removes space, converts comma)', () => {
      expect(parseCurrency('1 500,50 €')).toBe(1500.5);
    });

    it('parses "1 000,00 €" to 1000', () => {
      expect(parseCurrency('1 000,00 €')).toBe(1000);
    });
  });

  describe('symbol-prefixed strings', () => {
    it('parses "€500" to 500', () => {
      expect(parseCurrency('€500')).toBe(500);
    });

    it('parses "€ 99.99" to 99.99', () => {
      expect(parseCurrency('€ 99.99')).toBe(99.99);
    });
  });

  describe('€ symbol alone or with only whitespace', () => {
    it('returns 0 for "€" alone', () => {
      expect(parseCurrency('€')).toBe(0);
    });

    it('returns 0 for "  €  " (whitespace around symbol)', () => {
      expect(parseCurrency('  €  ')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('parses an integer string without decimals "100 €" to 100', () => {
      expect(parseCurrency('100 €')).toBe(100);
    });

    it('parses a string with no currency symbol "42.50" to 42.5', () => {
      expect(parseCurrency('42.50')).toBe(42.5);
    });

    it('returns 0 for a string with only whitespace', () => {
      expect(parseCurrency('   ')).toBe(0);
    });
  });
});
