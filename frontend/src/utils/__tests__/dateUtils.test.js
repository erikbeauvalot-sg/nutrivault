/**
 * Unit tests for dateUtils.js
 * Tests date/time formatting utilities used across the application.
 *
 * Important: These tests run in a jsdom environment where import.meta.env.VITE_TZ
 * is undefined, so getTimezone() will always return 'Europe/Paris'. All expected
 * output is expressed using timezone-agnostic assertions (checking that specific
 * sub-strings are present) to avoid brittleness across Node.js / ICU builds.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTimezone,
  getLocale,
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  formatTime,
  formatDateLong,
  formatDateTimeLong,
  parseLocalDateTime,
  toLocalDateTimeInput,
  toLocalDateInput,
} from '../dateUtils';

// ---------------------------------------------------------------------------
// A midday UTC ISO string used throughout the suite.
// 2024-03-15T12:00:00Z → in Europe/Paris (CET+1 / CEST+2 depending on DST).
// March 15 is after the DST switch in 2024, so local time is 14:00 CEST.
// The *date* part (15/03/2024) is unambiguous regardless of DST.
// ---------------------------------------------------------------------------
const MIDDAY_UTC = '2024-03-15T12:00:00Z';

// ---------------------------------------------------------------------------
// getTimezone
// ---------------------------------------------------------------------------
describe('getTimezone', () => {
  it('returns Europe/Paris when VITE_TZ env variable is not set', () => {
    // In the test environment import.meta.env.VITE_TZ is undefined.
    expect(getTimezone()).toBe('Europe/Paris');
  });
});

// ---------------------------------------------------------------------------
// getLocale
// ---------------------------------------------------------------------------
describe('getLocale', () => {
  it('maps "fr" to "fr-FR"', () => {
    expect(getLocale('fr')).toBe('fr-FR');
  });

  it('maps "en" to "en-GB"', () => {
    expect(getLocale('en')).toBe('en-GB');
  });

  it('maps "de" to "de-DE"', () => {
    expect(getLocale('de')).toBe('de-DE');
  });

  it('maps "es" to "es-ES"', () => {
    expect(getLocale('es')).toBe('es-ES');
  });

  it('maps "it" to "it-IT"', () => {
    expect(getLocale('it')).toBe('it-IT');
  });

  it('defaults to "fr-FR" for an unknown language code', () => {
    expect(getLocale('ja')).toBe('fr-FR');
    expect(getLocale('zh')).toBe('fr-FR');
    expect(getLocale('')).toBe('fr-FR');
  });

  it('defaults to "fr-FR" when no argument is supplied', () => {
    expect(getLocale()).toBe('fr-FR');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatDate('')).toBe('-');
    });

    it('returns "-" for an unparseable date string', () => {
      expect(formatDate('not-a-date')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('contains the day "15" for 2024-03-15', () => {
      const result = formatDate(MIDDAY_UTC, 'fr');
      expect(result).toContain('15');
    });

    it('contains the month "03" for March', () => {
      const result = formatDate(MIDDAY_UTC, 'fr');
      expect(result).toContain('03');
    });

    it('contains the year "2024"', () => {
      const result = formatDate(MIDDAY_UTC, 'fr');
      expect(result).toContain('2024');
    });

    it('produces different output for different dates', () => {
      const jan = formatDate('2024-01-10T12:00:00Z', 'fr');
      const dec = formatDate('2024-12-10T12:00:00Z', 'fr');
      expect(jan).not.toBe(dec);
    });

    it('accepts a Date object as input', () => {
      const date = new Date(MIDDAY_UTC);
      const result = formatDate(date, 'fr');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('works with "en" language', () => {
      const result = formatDate(MIDDAY_UTC, 'en');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('defaults to French locale when no language is supplied', () => {
      const withDefault = formatDate(MIDDAY_UTC);
      const withFr = formatDate(MIDDAY_UTC, 'fr');
      expect(withDefault).toBe(withFr);
    });
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe('formatDateTime', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatDateTime(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDateTime(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatDateTime('')).toBe('-');
    });

    it('returns "-" for an invalid date string', () => {
      expect(formatDateTime('invalid')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('contains the year "2024"', () => {
      expect(formatDateTime(MIDDAY_UTC, 'fr')).toContain('2024');
    });

    it('contains seconds (three colon-separated time components)', () => {
      const result = formatDateTime(MIDDAY_UTC, 'fr');
      // e.g. "14:00:00" — at least two colons present in the output
      const colonCount = (result.match(/:/g) || []).length;
      expect(colonCount).toBeGreaterThanOrEqual(2);
    });

    it('produces a longer string than formatDate for the same input', () => {
      const date = formatDate(MIDDAY_UTC, 'fr');
      const dateTime = formatDateTime(MIDDAY_UTC, 'fr');
      expect(dateTime.length).toBeGreaterThan(date.length);
    });

    it('defaults to French locale when no language is supplied', () => {
      expect(formatDateTime(MIDDAY_UTC)).toBe(formatDateTime(MIDDAY_UTC, 'fr'));
    });
  });
});

// ---------------------------------------------------------------------------
// formatDateTimeShort
// ---------------------------------------------------------------------------
describe('formatDateTimeShort', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatDateTimeShort(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDateTimeShort(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatDateTimeShort('')).toBe('-');
    });

    it('returns "-" for an invalid date string', () => {
      expect(formatDateTimeShort('bad-date')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('contains the year "2024"', () => {
      expect(formatDateTimeShort(MIDDAY_UTC, 'fr')).toContain('2024');
    });

    it('has fewer or equal colons than formatDateTime (no seconds)', () => {
      const short = formatDateTimeShort(MIDDAY_UTC, 'fr');
      const full = formatDateTime(MIDDAY_UTC, 'fr');
      const shortColons = (short.match(/:/g) || []).length;
      const fullColons = (full.match(/:/g) || []).length;
      expect(shortColons).toBeLessThan(fullColons);
    });

    it('defaults to French locale when no language is supplied', () => {
      expect(formatDateTimeShort(MIDDAY_UTC)).toBe(
        formatDateTimeShort(MIDDAY_UTC, 'fr')
      );
    });
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------
describe('formatTime', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatTime(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatTime(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatTime('')).toBe('-');
    });

    it('returns "-" for an invalid date string', () => {
      expect(formatTime('garbage')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('does NOT contain the year', () => {
      const result = formatTime(MIDDAY_UTC, 'fr');
      expect(result).not.toContain('2024');
    });

    it('contains a colon separating hours and minutes', () => {
      const result = formatTime(MIDDAY_UTC, 'fr');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('is shorter than formatDate output', () => {
      const time = formatTime(MIDDAY_UTC, 'fr');
      const date = formatDate(MIDDAY_UTC, 'fr');
      expect(time.length).toBeLessThan(date.length);
    });

    it('returns HH:mm with exactly one colon', () => {
      const result = formatTime(MIDDAY_UTC, 'fr');
      const colonCount = (result.match(/:/g) || []).length;
      expect(colonCount).toBe(1);
    });

    it('defaults to French locale when no language is supplied', () => {
      expect(formatTime(MIDDAY_UTC)).toBe(formatTime(MIDDAY_UTC, 'fr'));
    });
  });
});

// ---------------------------------------------------------------------------
// formatDateLong
// ---------------------------------------------------------------------------
describe('formatDateLong', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatDateLong(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDateLong(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatDateLong('')).toBe('-');
    });

    it('returns "-" for an invalid date string', () => {
      expect(formatDateLong('xyz')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('contains the year "2024"', () => {
      expect(formatDateLong(MIDDAY_UTC, 'fr')).toContain('2024');
    });

    it('contains the day number "15"', () => {
      expect(formatDateLong(MIDDAY_UTC, 'fr')).toContain('15');
    });

    it('contains the long month name for French locale', () => {
      // March in French is "mars"
      const result = formatDateLong(MIDDAY_UTC, 'fr');
      expect(result.toLowerCase()).toContain('mars');
    });

    it('is longer than the short formatDate output', () => {
      const long = formatDateLong(MIDDAY_UTC, 'fr');
      const short = formatDate(MIDDAY_UTC, 'fr');
      expect(long.length).toBeGreaterThan(short.length);
    });

    it('defaults to French locale when no language is supplied', () => {
      expect(formatDateLong(MIDDAY_UTC)).toBe(formatDateLong(MIDDAY_UTC, 'fr'));
    });

    it('works with English locale', () => {
      const result = formatDateLong(MIDDAY_UTC, 'en');
      expect(result).toContain('2024');
      expect(result).toContain('15');
      // March in English
      expect(result.toLowerCase()).toContain('march');
    });
  });
});

// ---------------------------------------------------------------------------
// formatDateTimeLong
// ---------------------------------------------------------------------------
describe('formatDateTimeLong', () => {
  describe('invalid / falsy input', () => {
    it('returns "-" for null', () => {
      expect(formatDateTimeLong(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatDateTimeLong(undefined)).toBe('-');
    });

    it('returns "-" for an empty string', () => {
      expect(formatDateTimeLong('')).toBe('-');
    });

    it('returns "-" for an invalid date string', () => {
      expect(formatDateTimeLong('bad')).toBe('-');
    });
  });

  describe('valid input', () => {
    it('contains the year "2024"', () => {
      expect(formatDateTimeLong(MIDDAY_UTC, 'fr')).toContain('2024');
    });

    it('contains a colon (time part)', () => {
      const result = formatDateTimeLong(MIDDAY_UTC, 'fr');
      expect(result).toContain(':');
    });

    it('is longer than formatDateLong for the same input', () => {
      const dateLong = formatDateLong(MIDDAY_UTC, 'fr');
      const dateTimeLong = formatDateTimeLong(MIDDAY_UTC, 'fr');
      expect(dateTimeLong.length).toBeGreaterThan(dateLong.length);
    });

    it('defaults to French locale when no language is supplied', () => {
      expect(formatDateTimeLong(MIDDAY_UTC)).toBe(
        formatDateTimeLong(MIDDAY_UTC, 'fr')
      );
    });
  });
});

// ---------------------------------------------------------------------------
// parseLocalDateTime
// ---------------------------------------------------------------------------
describe('parseLocalDateTime', () => {
  describe('invalid / falsy input', () => {
    it('returns null for null', () => {
      expect(parseLocalDateTime(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(parseLocalDateTime(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(parseLocalDateTime('')).toBeNull();
    });

    it('returns null for an unparseable string', () => {
      expect(parseLocalDateTime('not-a-date')).toBeNull();
    });
  });

  describe('valid input', () => {
    it('returns a Date object for a valid datetime-local string', () => {
      const result = parseLocalDateTime('2024-03-15T14:30');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('returns a Date object for a full ISO string', () => {
      const result = parseLocalDateTime('2024-03-15T14:30:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('preserves the correct date value', () => {
      const result = parseLocalDateTime('2024-03-15T14:30');
      // The parsed date should round-trip correctly
      expect(result.getFullYear()).toBe(2024);
    });
  });
});

// ---------------------------------------------------------------------------
// toLocalDateTimeInput
// ---------------------------------------------------------------------------
describe('toLocalDateTimeInput', () => {
  describe('invalid / falsy input', () => {
    it('returns "" for null', () => {
      expect(toLocalDateTimeInput(null)).toBe('');
    });

    it('returns "" for undefined', () => {
      expect(toLocalDateTimeInput(undefined)).toBe('');
    });

    it('returns "" for an empty string', () => {
      expect(toLocalDateTimeInput('')).toBe('');
    });

    it('returns "" for an invalid date string', () => {
      expect(toLocalDateTimeInput('not-a-date')).toBe('');
    });
  });

  describe('valid input', () => {
    it('returns a string in YYYY-MM-DDTHH:mm format', () => {
      const result = toLocalDateTimeInput(new Date(MIDDAY_UTC));
      // Pattern: 2024-03-15T14:00
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('contains the correct year', () => {
      const result = toLocalDateTimeInput(new Date(MIDDAY_UTC));
      expect(result).toContain('2024');
    });

    it('contains the correct date segment', () => {
      const result = toLocalDateTimeInput(new Date(MIDDAY_UTC));
      expect(result).toContain('2024-03-15');
    });

    it('accepts an ISO string as input', () => {
      const result = toLocalDateTimeInput(MIDDAY_UTC);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('produces different results for different dates', () => {
      const a = toLocalDateTimeInput('2024-01-01T12:00:00Z');
      const b = toLocalDateTimeInput('2024-06-01T12:00:00Z');
      expect(a).not.toBe(b);
    });
  });
});

// ---------------------------------------------------------------------------
// toLocalDateInput
// ---------------------------------------------------------------------------
describe('toLocalDateInput', () => {
  describe('invalid / falsy input', () => {
    it('returns "" for null', () => {
      expect(toLocalDateInput(null)).toBe('');
    });

    it('returns "" for undefined', () => {
      expect(toLocalDateInput(undefined)).toBe('');
    });

    it('returns "" for an empty string', () => {
      expect(toLocalDateInput('')).toBe('');
    });

    it('returns "" for an invalid date string', () => {
      expect(toLocalDateInput('bad')).toBe('');
    });
  });

  describe('valid input', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const result = toLocalDateInput(new Date(MIDDAY_UTC));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('contains the correct year', () => {
      const result = toLocalDateInput(new Date(MIDDAY_UTC));
      expect(result).toContain('2024');
    });

    it('contains the correct month and day for a midday UTC date', () => {
      // 2024-03-15T12:00:00Z is 14:00 in Europe/Paris — still March 15.
      const result = toLocalDateInput(new Date(MIDDAY_UTC));
      expect(result).toBe('2024-03-15');
    });

    it('accepts an ISO string as input', () => {
      const result = toLocalDateInput(MIDDAY_UTC);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('produces different results for different dates', () => {
      const a = toLocalDateInput('2024-01-10T12:00:00Z');
      const b = toLocalDateInput('2024-07-10T12:00:00Z');
      expect(a).not.toBe(b);
    });

    it('is 10 characters long (YYYY-MM-DD)', () => {
      const result = toLocalDateInput(new Date(MIDDAY_UTC));
      expect(result).toHaveLength(10);
    });
  });
});
