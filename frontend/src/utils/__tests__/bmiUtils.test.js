/**
 * Unit tests for bmiUtils.js
 * Tests BMI calculation, category classification, and reference range helpers.
 */

import { describe, it, expect } from 'vitest';
import { calculateBMI, getBMICategory, getBMIRanges } from '../bmiUtils';

// ---------------------------------------------------------------------------
// Mock translation function — simply returns the fallback string so tests are
// not coupled to any specific i18n key name.
// ---------------------------------------------------------------------------
const t = (key, fallback) => fallback;

// ---------------------------------------------------------------------------
// calculateBMI
// ---------------------------------------------------------------------------
describe('calculateBMI', () => {
  describe('invalid inputs — returns null', () => {
    it('returns null for zero weight', () => {
      expect(calculateBMI(0, 175)).toBeNull();
    });

    it('returns null for zero height', () => {
      expect(calculateBMI(70, 0)).toBeNull();
    });

    it('returns null for negative weight', () => {
      expect(calculateBMI(-10, 175)).toBeNull();
    });

    it('returns null for negative height', () => {
      expect(calculateBMI(70, -175)).toBeNull();
    });

    it('returns null for null weight', () => {
      expect(calculateBMI(null, 175)).toBeNull();
    });

    it('returns null for null height', () => {
      expect(calculateBMI(70, null)).toBeNull();
    });

    it('returns null for undefined weight', () => {
      expect(calculateBMI(undefined, 175)).toBeNull();
    });

    it('returns null for undefined height', () => {
      expect(calculateBMI(70, undefined)).toBeNull();
    });

    it('returns null when both arguments are missing', () => {
      expect(calculateBMI()).toBeNull();
    });
  });

  describe('correct BMI calculations', () => {
    it('calculates 22.9 for 70 kg / 175 cm', () => {
      // 70 / (1.75)^2 = 70 / 3.0625 ≈ 22.857 → 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it('calculates 34.6 for 100 kg / 170 cm', () => {
      // 100 / (1.70)^2 = 100 / 2.89 ≈ 34.602 → 34.6
      expect(calculateBMI(100, 170)).toBe(34.6);
    });

    it('calculates 18.5 for a borderline underweight case', () => {
      // 50 / (1.645)^2 ≈ 18.49 → 18.5
      const bmi = calculateBMI(50, 164.5);
      // Allow ±0.1 tolerance for floating point
      expect(Math.abs(bmi - 18.5)).toBeLessThanOrEqual(0.1);
    });

    it('returns a number rounded to one decimal place', () => {
      const bmi = calculateBMI(70, 175);
      const decimals = (bmi.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(1);
    });

    it('returns a number (not null) for valid inputs', () => {
      expect(calculateBMI(60, 160)).toBeTypeOf('number');
    });
  });
});

// ---------------------------------------------------------------------------
// getBMICategory
// ---------------------------------------------------------------------------
describe('getBMICategory', () => {
  describe('invalid / missing BMI — secondary variant', () => {
    it('returns secondary for null', () => {
      const result = getBMICategory(null, t);
      expect(result.category).toBe('-');
      expect(result.variant).toBe('secondary');
      expect(result.textColor).toBe('text-muted');
    });

    it('returns secondary for undefined', () => {
      const result = getBMICategory(undefined, t);
      expect(result.category).toBe('-');
      expect(result.variant).toBe('secondary');
    });

    it('returns secondary for NaN', () => {
      const result = getBMICategory(NaN, t);
      expect(result.category).toBe('-');
      expect(result.variant).toBe('secondary');
    });

    it('returns secondary for 0 (falsy)', () => {
      const result = getBMICategory(0, t);
      expect(result.category).toBe('-');
      expect(result.variant).toBe('secondary');
    });
  });

  describe('underweight — BMI < 18.5', () => {
    it('classifies BMI 10 as underweight', () => {
      const result = getBMICategory(10, t);
      expect(result.category).toBe('Sous poids');
      expect(result.variant).toBe('info');
    });

    it('classifies BMI 17 as underweight', () => {
      const result = getBMICategory(17, t);
      expect(result.category).toBe('Sous poids');
      expect(result.variant).toBe('info');
    });

    it('classifies BMI 18.4 as underweight (just below boundary)', () => {
      const result = getBMICategory(18.4, t);
      expect(result.category).toBe('Sous poids');
      expect(result.variant).toBe('info');
    });
  });

  describe('ideal weight — 18.5 <= BMI < 25', () => {
    it('classifies BMI 18.5 as ideal (lower boundary)', () => {
      const result = getBMICategory(18.5, t);
      expect(result.category).toBe('Poids idéal');
      expect(result.variant).toBe('success');
    });

    it('classifies BMI 22 as ideal', () => {
      const result = getBMICategory(22, t);
      expect(result.category).toBe('Poids idéal');
      expect(result.variant).toBe('success');
    });

    it('classifies BMI 24.9 as ideal (just below upper boundary)', () => {
      const result = getBMICategory(24.9, t);
      expect(result.category).toBe('Poids idéal');
      expect(result.variant).toBe('success');
    });
  });

  describe('overweight — 25 <= BMI < 30', () => {
    it('classifies BMI 25.0 as overweight (lower boundary)', () => {
      const result = getBMICategory(25.0, t);
      expect(result.category).toBe('Surpoids');
      expect(result.variant).toBe('warning');
    });

    it('classifies BMI 27 as overweight', () => {
      const result = getBMICategory(27, t);
      expect(result.category).toBe('Surpoids');
      expect(result.variant).toBe('warning');
    });

    it('classifies BMI 29.9 as overweight (just below upper boundary)', () => {
      const result = getBMICategory(29.9, t);
      expect(result.category).toBe('Surpoids');
      expect(result.variant).toBe('warning');
    });
  });

  describe('moderate obesity — 30 <= BMI < 35', () => {
    it('classifies BMI 30.0 as moderate obesity (lower boundary)', () => {
      const result = getBMICategory(30.0, t);
      expect(result.category).toBe('Obésité modérée');
      expect(result.variant).toBe('orange');
    });

    it('classifies BMI 32 as moderate obesity', () => {
      const result = getBMICategory(32, t);
      expect(result.category).toBe('Obésité modérée');
      expect(result.variant).toBe('orange');
    });

    it('classifies BMI 34.9 as moderate obesity (just below upper boundary)', () => {
      const result = getBMICategory(34.9, t);
      expect(result.category).toBe('Obésité modérée');
      expect(result.variant).toBe('orange');
    });
  });

  describe('severe obesity — 35 <= BMI < 40', () => {
    it('classifies BMI 35.0 as severe obesity (lower boundary)', () => {
      const result = getBMICategory(35.0, t);
      expect(result.category).toBe('Obésité sévère');
      expect(result.variant).toBe('danger');
    });

    it('classifies BMI 37 as severe obesity', () => {
      const result = getBMICategory(37, t);
      expect(result.category).toBe('Obésité sévère');
      expect(result.variant).toBe('danger');
    });

    it('classifies BMI 39.9 as severe obesity (just below upper boundary)', () => {
      const result = getBMICategory(39.9, t);
      expect(result.category).toBe('Obésité sévère');
      expect(result.variant).toBe('danger');
    });
  });

  describe('morbid obesity — BMI >= 40', () => {
    it('classifies BMI 40.0 as morbid obesity (lower boundary)', () => {
      const result = getBMICategory(40.0, t);
      expect(result.category).toBe('Obésité morbide');
      expect(result.variant).toBe('dark');
    });

    it('classifies BMI 45 as morbid obesity', () => {
      const result = getBMICategory(45, t);
      expect(result.category).toBe('Obésité morbide');
      expect(result.variant).toBe('dark');
    });

    it('classifies BMI 60 as morbid obesity', () => {
      const result = getBMICategory(60, t);
      expect(result.category).toBe('Obésité morbide');
      expect(result.variant).toBe('dark');
    });
  });

  describe('returned object shape', () => {
    it('always includes a category, variant and textColor property', () => {
      const result = getBMICategory(22, t);
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('variant');
      expect(result).toHaveProperty('textColor');
    });

    it('uses the t() function to translate category labels', () => {
      // Provide a t that returns a known sentinel to verify it was called
      const customT = (key, _fallback) => `__${key}__`;
      const result = getBMICategory(22, customT);
      expect(result.category).toBe('__bmi.idealWeight__');
    });

    it('parses string BMI values correctly', () => {
      // getBMICategory converts via parseFloat, so string input should work
      const result = getBMICategory('22.5', t);
      expect(result.category).toBe('Poids idéal');
    });
  });
});

// ---------------------------------------------------------------------------
// getBMIRanges
// ---------------------------------------------------------------------------
describe('getBMIRanges', () => {
  it('returns an array of exactly 6 elements', () => {
    const ranges = getBMIRanges(t);
    expect(Array.isArray(ranges)).toBe(true);
    expect(ranges).toHaveLength(6);
  });

  it('each element has label, range and variant properties', () => {
    getBMIRanges(t).forEach((item) => {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('range');
      expect(item).toHaveProperty('variant');
    });
  });

  it('first element is underweight with variant "info"', () => {
    const [first] = getBMIRanges(t);
    expect(first.label).toBe('Sous poids');
    expect(first.variant).toBe('info');
  });

  it('second element is ideal weight with variant "success"', () => {
    const ranges = getBMIRanges(t);
    expect(ranges[1].label).toBe('Poids idéal');
    expect(ranges[1].variant).toBe('success');
  });

  it('third element is overweight with variant "warning"', () => {
    const ranges = getBMIRanges(t);
    expect(ranges[2].label).toBe('Surpoids');
    expect(ranges[2].variant).toBe('warning');
  });

  it('fourth element is moderate obesity with variant "orange"', () => {
    const ranges = getBMIRanges(t);
    expect(ranges[3].label).toBe('Obésité modérée');
    expect(ranges[3].variant).toBe('orange');
  });

  it('fifth element is severe obesity with variant "danger"', () => {
    const ranges = getBMIRanges(t);
    expect(ranges[4].label).toBe('Obésité sévère');
    expect(ranges[4].variant).toBe('danger');
  });

  it('sixth (last) element is morbid obesity with variant "dark"', () => {
    const ranges = getBMIRanges(t);
    const last = ranges[ranges.length - 1];
    expect(last.label).toBe('Obésité morbide');
    expect(last.variant).toBe('dark');
  });

  it('uses the t() function for labels', () => {
    const customT = (key, _fallback) => `translated:${key}`;
    const ranges = getBMIRanges(customT);
    expect(ranges[0].label).toBe('translated:bmi.underweight');
    expect(ranges[1].label).toBe('translated:bmi.idealWeight');
  });

  it('moderate and morbid obesity entries include customBg color', () => {
    const ranges = getBMIRanges(t);
    // Moderate obesity (orange)
    expect(ranges[3]).toHaveProperty('customBg');
    // Morbid obesity (dark)
    expect(ranges[5]).toHaveProperty('customBg');
  });
});
