/**
 * Tests for Formula Engine Service
 */

const {
  evaluateFormula,
  validateFormula,
  extractDependencies,
  detectCircularDependencies,
  getAvailableOperators
} = require('../src/services/formulaEngine.service');

describe('Formula Engine Service', () => {
  describe('evaluateFormula', () => {
    test('should evaluate simple addition', () => {
      const result = evaluateFormula('{a} + {b}', { a: 5, b: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
      expect(result.error).toBeNull();
    });

    test('should evaluate simple subtraction', () => {
      const result = evaluateFormula('{a} - {b}', { a: 10, b: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(7);
    });

    test('should evaluate simple multiplication', () => {
      const result = evaluateFormula('{a} * {b}', { a: 4, b: 5 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    test('should evaluate simple division', () => {
      const result = evaluateFormula('{a} / {b}', { a: 20, b: 4 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    test('should evaluate power operation', () => {
      const result = evaluateFormula('{a} ^ {b}', { a: 2, b: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
    });

    test('should evaluate BMI formula', () => {
      const result = evaluateFormula('{weight} / ({height} * {height})', { weight: 70, height: 1.75 });
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(22.86, 2);
    });

    test('should handle operator precedence', () => {
      const result = evaluateFormula('{a} + {b} * {c}', { a: 2, b: 3, c: 4 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(14); // 2 + (3 * 4) = 14, not (2 + 3) * 4 = 20
    });

    test('should handle parentheses', () => {
      const result = evaluateFormula('({a} + {b}) * {c}', { a: 2, b: 3, c: 4 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(20); // (2 + 3) * 4 = 20
    });

    test('should handle nested parentheses', () => {
      const result = evaluateFormula('(({a} + {b}) * {c}) / {d}', { a: 2, b: 3, c: 4, d: 2 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(10); // ((2 + 3) * 4) / 2 = 10
    });

    test('should round to specified decimal places', () => {
      const result = evaluateFormula('{a} / {b}', { a: 10, b: 3 }, 2);
      expect(result.success).toBe(true);
      expect(result.result).toBe(3.33);
    });

    test('should round to 0 decimal places', () => {
      const result = evaluateFormula('{a} / {b}', { a: 10, b: 3 }, 0);
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    test('should handle sqrt function', () => {
      const result = evaluateFormula('sqrt({a})', { a: 16 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    test('should handle abs function', () => {
      const result = evaluateFormula('abs({a})', { a: -5 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    test('should handle round function', () => {
      const result = evaluateFormula('round({a}, 1)', { a: 3.14159 });
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(3.1, 1);
    });

    test('should handle floor function', () => {
      const result = evaluateFormula('floor({a})', { a: 3.9 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    test('should handle ceil function', () => {
      const result = evaluateFormula('ceil({a})', { a: 3.1 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    test('should handle min function', () => {
      const result = evaluateFormula('min({a}, {b})', { a: 5, b: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    test('should handle max function', () => {
      const result = evaluateFormula('max({a}, {b})', { a: 5, b: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    test('should handle complex formula with functions', () => {
      const result = evaluateFormula('sqrt({a} ^ 2 + {b} ^ 2)', { a: 3, b: 4 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(5); // Pythagorean theorem
    });

    test('should fail on division by zero', () => {
      const result = evaluateFormula('{a} / {b}', { a: 10, b: 0 });
      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.error).toContain('Division by zero');
    });

    test('should fail on negative square root', () => {
      const result = evaluateFormula('sqrt({a})', { a: -4 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('square root of negative number');
    });

    test('should fail on missing variable value', () => {
      const result = evaluateFormula('{a} + {b}', { a: 5 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing value for variable: b');
    });

    test('should fail on null formula', () => {
      const result = evaluateFormula(null, { a: 5 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Formula is required');
    });

    test('should fail on invalid values object', () => {
      const result = evaluateFormula('{a} + {b}', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Values must be an object');
    });

    test('should handle variable names with underscores', () => {
      const result = evaluateFormula('{var_one} + {var_two}', { var_one: 5, var_two: 3 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
    });

    test('should handle literal numbers in formula', () => {
      const result = evaluateFormula('{a} * 100', { a: 0.5 });
      expect(result.success).toBe(true);
      expect(result.result).toBe(50);
    });
  });

  describe('validateFormula', () => {
    test('should validate simple formula', () => {
      const result = validateFormula('{a} + {b}');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.dependencies).toEqual(['a', 'b']);
    });

    test('should validate BMI formula', () => {
      const result = validateFormula('{weight} / ({height} * {height})');
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['weight', 'height']);
    });

    test('should validate formula with functions', () => {
      const result = validateFormula('sqrt({a} ^ 2 + {b} ^ 2)');
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['a', 'b']);
    });

    test('should reject formula with unbalanced braces', () => {
      const result = validateFormula('{a + {b}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unbalanced braces');
    });

    test('should reject formula with invalid variable name', () => {
      const result = validateFormula('{123abc} + {b}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid variable name');
    });

    test('should reject formula with special characters in variable name', () => {
      const result = validateFormula('{var-name} + {b}');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid variable name');
    });

    test('should reject formula with mismatched parentheses', () => {
      const result = validateFormula('({a} + {b})');
      expect(result.valid).toBe(true);

      const result2 = validateFormula('({a} + {b}');
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('parentheses');
    });

    test('should reject null formula', () => {
      const result = validateFormula(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formula is required');
    });

    test('should accept variable names starting with underscore', () => {
      const result = validateFormula('{_private} + {b}');
      expect(result.valid).toBe(true);
      expect(result.dependencies).toEqual(['_private', 'b']);
    });
  });

  describe('extractDependencies', () => {
    test('should extract single dependency', () => {
      const deps = extractDependencies('{weight}');
      expect(deps).toEqual(['weight']);
    });

    test('should extract multiple dependencies', () => {
      const deps = extractDependencies('{weight} / ({height} * {height})');
      expect(deps).toEqual(['weight', 'height']);
    });

    test('should extract unique dependencies', () => {
      const deps = extractDependencies('{a} + {b} - {a}');
      expect(deps).toEqual(['a', 'b']);
    });

    test('should handle formula with no dependencies', () => {
      const deps = extractDependencies('5 + 3');
      expect(deps).toEqual([]);
    });

    test('should handle null formula', () => {
      const deps = extractDependencies(null);
      expect(deps).toEqual([]);
    });

    test('should trim whitespace in variable names', () => {
      const deps = extractDependencies('{ weight } / { height }');
      expect(deps).toEqual(['weight', 'height']);
    });
  });

  describe('detectCircularDependencies', () => {
    test('should detect no circular dependencies in simple case', () => {
      const allFields = {
        height: { dependencies: [] },
        weight: { dependencies: [] }
      };
      const result = detectCircularDependencies('bmi', ['weight', 'height'], allFields);
      expect(result.hasCircular).toBe(false);
      expect(result.cycle).toBeNull();
    });

    test('should detect direct circular dependency', () => {
      const allFields = {
        a: { dependencies: ['b'] },
        b: { dependencies: ['a'] }
      };
      const result = detectCircularDependencies('a', ['b'], allFields);
      expect(result.hasCircular).toBe(true);
      expect(result.cycle).toBeDefined();
    });

    test('should detect indirect circular dependency', () => {
      const allFields = {
        a: { dependencies: ['b'] },
        b: { dependencies: ['c'] },
        c: { dependencies: ['a'] }
      };
      const result = detectCircularDependencies('a', ['b'], allFields);
      expect(result.hasCircular).toBe(true);
      expect(result.cycle).toContain('a');
    });

    test('should allow diamond dependencies (not circular)', () => {
      const allFields = {
        a: { dependencies: [] },
        b: { dependencies: ['a'] },
        c: { dependencies: ['a'] },
        d: { dependencies: ['b', 'c'] }
      };
      const result = detectCircularDependencies('d', ['b', 'c'], allFields);
      expect(result.hasCircular).toBe(false);
    });

    test('should handle self-reference', () => {
      const allFields = {};
      const result = detectCircularDependencies('a', ['a'], allFields);
      expect(result.hasCircular).toBe(true);
    });

    test('should handle empty dependencies', () => {
      const allFields = {};
      const result = detectCircularDependencies('a', [], allFields);
      expect(result.hasCircular).toBe(false);
    });
  });

  describe('getAvailableOperators', () => {
    test('should return available operators', () => {
      const result = getAvailableOperators();
      expect(result.operators).toContain('+');
      expect(result.operators).toContain('-');
      expect(result.operators).toContain('*');
      expect(result.operators).toContain('/');
      expect(result.operators).toContain('^');
    });

    test('should return available functions', () => {
      const result = getAvailableOperators();
      expect(result.functions).toBeDefined();
      expect(result.functions.length).toBeGreaterThan(0);

      const functionNames = result.functions.map(f => f.name);
      expect(functionNames).toContain('sqrt');
      expect(functionNames).toContain('abs');
      expect(functionNames).toContain('round');
    });

    test('should return function metadata', () => {
      const result = getAvailableOperators();
      const sqrtFunc = result.functions.find(f => f.name === 'sqrt');

      expect(sqrtFunc).toBeDefined();
      expect(sqrtFunc.description).toBeDefined();
      expect(sqrtFunc.example).toBeDefined();
    });
  });
});
