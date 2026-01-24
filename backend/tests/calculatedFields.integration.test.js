/**
 * Integration Tests for Calculated Custom Fields
 * Tests cascading updates, circular dependency handling, and end-to-end scenarios
 */

const {
  evaluateFormula,
  validateFormula,
  extractDependencies,
  detectCircularDependencies
} = require('../src/services/formulaEngine.service');

describe('Calculated Fields Integration Tests', () => {
  describe('Cascading Updates', () => {
    test('should cascade through 2 levels of dependencies', () => {
      // Setup:
      // field_a = 10 (regular field)
      // field_b = field_a * 2 (calculated)
      // field_c = field_b + 5 (calculated, depends on calculated field)

      const fieldA = 10;

      // Step 1: field_a changes to 10
      const fieldBResult = evaluateFormula('{field_a} * 2', { field_a: fieldA });
      expect(fieldBResult.success).toBe(true);
      expect(fieldBResult.result).toBe(20);

      // Step 2: field_b changes, triggering field_c recalculation
      const fieldCResult = evaluateFormula('{field_b} + 5', { field_b: fieldBResult.result });
      expect(fieldCResult.success).toBe(true);
      expect(fieldCResult.result).toBe(25);

      // Now simulate field_a changing to 15
      const newFieldBResult = evaluateFormula('{field_a} * 2', { field_a: 15 });
      expect(newFieldBResult.result).toBe(30);

      const newFieldCResult = evaluateFormula('{field_b} + 5', { field_b: newFieldBResult.result });
      expect(newFieldCResult.result).toBe(35);
    });

    test('should cascade through 3 levels of dependencies', () => {
      // Setup:
      // field_a = 10
      // field_b = field_a * 2
      // field_c = field_b + 5
      // field_d = field_c / 2

      let values = { field_a: 10 };

      // Calculate field_b
      const bResult = evaluateFormula('{field_a} * 2', values);
      values.field_b = bResult.result;

      // Calculate field_c
      const cResult = evaluateFormula('{field_b} + 5', values);
      values.field_c = cResult.result;

      // Calculate field_d
      const dResult = evaluateFormula('{field_c} / 2', values);
      values.field_d = dResult.result;

      expect(values.field_b).toBe(20);
      expect(values.field_c).toBe(25);
      expect(values.field_d).toBe(12.5);
    });

    test('should handle branching dependencies (one field affects multiple calculated fields)', () => {
      // Setup:
      // field_a = 10
      // field_b = field_a * 2
      // field_c = field_a + 5
      // field_d = field_a ^ 2
      // All three calculated fields depend on field_a

      const values = { field_a: 10 };

      const bResult = evaluateFormula('{field_a} * 2', values);
      const cResult = evaluateFormula('{field_a} + 5', values);
      const dResult = evaluateFormula('{field_a} ^ 2', values);

      expect(bResult.result).toBe(20);
      expect(cResult.result).toBe(15);
      expect(dResult.result).toBe(100);

      // Now change field_a and recalculate all
      values.field_a = 5;

      const newBResult = evaluateFormula('{field_a} * 2', values);
      const newCResult = evaluateFormula('{field_a} + 5', values);
      const newDResult = evaluateFormula('{field_a} ^ 2', values);

      expect(newBResult.result).toBe(10);
      expect(newCResult.result).toBe(10);
      expect(newDResult.result).toBe(25);
    });

    test('should handle merging dependencies (multiple fields affect one calculated field)', () => {
      // Setup:
      // field_a = 10
      // field_b = 20
      // field_c = field_a + field_b

      const values = { field_a: 10, field_b: 20 };

      const cResult = evaluateFormula('{field_a} + {field_b}', values);
      expect(cResult.result).toBe(30);

      // Change field_a only
      values.field_a = 15;
      const newCResult = evaluateFormula('{field_a} + {field_b}', values);
      expect(newCResult.result).toBe(35);

      // Change field_b only
      values.field_b = 25;
      const finalCResult = evaluateFormula('{field_a} + {field_b}', values);
      expect(finalCResult.result).toBe(40);
    });

    test('should handle complex dependency graph', () => {
      // Setup:
      //   field_a (10)     field_b (5)
      //      |    \       /      |
      //      |     field_c      /
      //       \      |         /
      //        \     |        /
      //         \    |       /
      //          field_d

      const values = { field_a: 10, field_b: 5 };

      // field_c = field_a + field_b
      const cResult = evaluateFormula('{field_a} + {field_b}', values);
      values.field_c = cResult.result; // 15

      // field_d = field_a + field_b + field_c
      const dResult = evaluateFormula('{field_a} + {field_b} + {field_c}', values);
      expect(dResult.result).toBe(30); // 10 + 5 + 15
    });
  });

  describe('Circular Dependency Detection', () => {
    test('should detect direct circular dependency', () => {
      // field_a depends on field_b, field_b depends on field_a
      const allFields = {
        field_a: { dependencies: ['field_b'] },
        field_b: { dependencies: ['field_a'] }
      };

      const result = detectCircularDependencies('field_a', ['field_b'], allFields);

      expect(result.hasCircular).toBe(true);
      expect(result.cycle).toContain('field_a');
      expect(result.cycle).toContain('field_b');
    });

    test('should detect indirect circular dependency', () => {
      // field_a -> field_b -> field_c -> field_a
      const allFields = {
        field_a: { dependencies: ['field_b'] },
        field_b: { dependencies: ['field_c'] },
        field_c: { dependencies: ['field_a'] }
      };

      const result = detectCircularDependencies('field_a', ['field_b'], allFields);

      expect(result.hasCircular).toBe(true);
      expect(result.cycle.length).toBeGreaterThan(0);
    });

    test('should detect complex circular dependency', () => {
      // field_a -> field_b -> field_d -> field_e -> field_b (cycle)
      //         -> field_c (no cycle)
      const allFields = {
        field_a: { dependencies: ['field_b', 'field_c'] },
        field_b: { dependencies: ['field_d'] },
        field_c: { dependencies: [] },
        field_d: { dependencies: ['field_e'] },
        field_e: { dependencies: ['field_b'] }
      };

      const result = detectCircularDependencies('field_a', ['field_b', 'field_c'], allFields);

      expect(result.hasCircular).toBe(true);
    });

    test('should not detect false positive for valid dependency chain', () => {
      // field_a -> field_b -> field_c -> field_d (no cycle)
      const allFields = {
        field_a: { dependencies: ['field_b'] },
        field_b: { dependencies: ['field_c'] },
        field_c: { dependencies: ['field_d'] },
        field_d: { dependencies: [] }
      };

      const result = detectCircularDependencies('field_a', ['field_b'], allFields);

      expect(result.hasCircular).toBe(false);
      expect(result.cycle).toBeNull();
    });

    test('should not detect circular dependency in branching graph', () => {
      //        field_a
      //       /   |   \
      //      b    c    d
      //     / \   |   / \
      //    e   f  g  h   i
      const allFields = {
        field_a: { dependencies: ['field_b', 'field_c', 'field_d'] },
        field_b: { dependencies: ['field_e', 'field_f'] },
        field_c: { dependencies: ['field_g'] },
        field_d: { dependencies: ['field_h', 'field_i'] },
        field_e: { dependencies: [] },
        field_f: { dependencies: [] },
        field_g: { dependencies: [] },
        field_h: { dependencies: [] },
        field_i: { dependencies: [] }
      };

      const result = detectCircularDependencies('field_a', ['field_b', 'field_c', 'field_d'], allFields);

      expect(result.hasCircular).toBe(false);
    });
  });

  describe('Volatile Functions (today())', () => {
    test('should recalculate age when using today() function', () => {
      // Simulate birth date as days since epoch
      const birthDate = 9000; // Roughly 1994-08-20

      // Calculate age
      const result = evaluateFormula(
        '(today() - {birth_date}) / 365.25',
        { birth_date: birthDate }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeGreaterThan(25); // Should be around 30 years old

      // Age should change if we call today() again (in a real scenario after a day)
      const result2 = evaluateFormula(
        '(today() - {birth_date}) / 365.25',
        { birth_date: birthDate }
      );

      expect(result2.success).toBe(true);
      // Results should be the same since we're in the same day
      expect(result2.result).toBe(result.result);
    });

    test('should handle formulas with today() and no other dependencies', () => {
      // Formula that only uses today()
      const result = evaluateFormula('today() / 365.25', {});

      expect(result.success).toBe(true);
      expect(result.result).toBeGreaterThan(50); // Days since 1970 divided by 365.25 should be > 50 years
    });

    test('should combine today() with other fields', () => {
      const result = evaluateFormula(
        '(today() - {birth_date}) / 365.25',
        { birth_date: 9000 } // Days since epoch
      );

      expect(result.success).toBe(true);
      // Age should be positive
      expect(result.result).toBeGreaterThan(0);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should calculate BMI and weight status', () => {
      const patient = {
        weight: 70, // kg
        height: 1.75 // meters
      };

      // Calculate BMI
      const bmiResult = evaluateFormula(
        '{weight} / ({height} * {height})',
        patient
      );

      expect(bmiResult.success).toBe(true);
      expect(bmiResult.result).toBeCloseTo(22.86, 2);

      // Calculate ideal weight range (BMI 18.5-24.9)
      const idealMinResult = evaluateFormula(
        '18.5 * ({height} * {height})',
        patient
      );

      const idealMaxResult = evaluateFormula(
        '24.9 * ({height} * {height})',
        patient
      );

      expect(idealMinResult.result).toBeCloseTo(56.66, 1);
      expect(idealMaxResult.result).toBeCloseTo(76.26, 1);
    });

    test('should calculate nutritional metrics', () => {
      const patient = {
        weight: 70,
        height: 1.75,
        age: 30,
        activity_level: 1.55 // Moderate activity
      };

      // Calculate BMR (Basal Metabolic Rate) using simplified formula
      // BMR = 10 * weight(kg) + 6 * height(cm) - 5 * age(years) + 5 (for males)
      // = 10 * 70 + 6 * 175 - 5 * 30 + 5 = 700 + 1050 - 150 + 5 = 1605
      const bmrResult = evaluateFormula(
        '10 * {weight} + 6 * ({height} * 100) - 5 * {age} + 5',
        patient
      );

      expect(bmrResult.success).toBe(true);
      expect(bmrResult.result).toBeCloseTo(1605, 1);

      // Calculate TDEE (Total Daily Energy Expenditure)
      // TDEE = BMR * activity_level
      patient.bmr = bmrResult.result;
      const tdeeResult = evaluateFormula(
        '{bmr} * {activity_level}',
        patient
      );

      expect(tdeeResult.result).toBeCloseTo(2487.75, 1);
    });

    test('should handle missing dependencies gracefully', () => {
      // Try to calculate with missing dependency
      const result = evaluateFormula(
        '{weight} / ({height} * {height})',
        { weight: 70 } // height is missing
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing value for variable');
    });

    test('should handle invalid values gracefully', () => {
      // Division by zero
      const result = evaluateFormula(
        '{weight} / {height}',
        { weight: 70, height: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Division by zero');
    });

    test('should validate formula before evaluation', () => {
      const formula = '{weight} / ({height} * {height})';

      // Validate first
      const validation = validateFormula(formula);
      expect(validation.valid).toBe(true);
      expect(validation.dependencies).toEqual(['weight', 'height']);

      // Then evaluate
      const result = evaluateFormula(formula, { weight: 70, height: 1.75 });
      expect(result.success).toBe(true);
    });

    test('should extract all dependencies from complex formula', () => {
      const formula = '({weight} - {ideal_weight}) / ({height} * {height}) + {age} * 0.1';

      const deps = extractDependencies(formula);

      expect(deps).toContain('weight');
      expect(deps).toContain('ideal_weight');
      expect(deps).toContain('height');
      expect(deps).toContain('age');
      expect(deps.length).toBe(4);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty formula', () => {
      const result = evaluateFormula('', { a: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should handle formula with only whitespace', () => {
      const result = evaluateFormula('   ', { a: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should handle formula with unmatched braces', () => {
      const validation = validateFormula('{weight / {height}');

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('brace');
    });

    test('should handle very large numbers', () => {
      const result = evaluateFormula(
        '{a} * {b}',
        { a: 999999999, b: 999999999 }
      );

      expect(result.success).toBe(true);
      expect(isFinite(result.result)).toBe(true);
    });

    test('should handle very small numbers', () => {
      const result = evaluateFormula(
        '{a} / {b}',
        { a: 0.001, b: 1000 },
        10 // Use 10 decimal places
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(0.000001, 6);
    });

    test('should handle negative numbers', () => {
      const result = evaluateFormula(
        '{a} + {b}',
        { a: -10, b: 5 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe(-5);
    });

    test('should handle square root of negative number gracefully', () => {
      const result = evaluateFormula(
        'sqrt({a})',
        { a: -5 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('square root of negative');
    });
  });
});
