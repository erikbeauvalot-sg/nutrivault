/**
 * Performance Tests for Calculated Custom Fields
 * Tests recalculation performance with large datasets
 * Acceptance criteria: <500ms for 100+ fields
 */

const {
  evaluateFormula,
  validateFormula,
  extractDependencies,
  detectCircularDependencies
} = require('../src/services/formulaEngine.service');

describe('Calculated Fields Performance Tests', () => {
  describe('Formula Evaluation Performance', () => {
    test('should evaluate 100 simple formulas in <100ms', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = evaluateFormula(
          '{weight} / ({height} * {height})',
          { weight: 70 + i, height: 1.75 }
        );
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 formula evaluations: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    test('should evaluate 100 complex formulas (with functions) in <200ms', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = evaluateFormula(
          'sqrt({weight}) + abs({height} - {target}) * 10',
          { weight: 70 + i, height: 1.75, target: 1.80 }
        );
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 complex formula evaluations: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    test('should evaluate 1000 formulas in <500ms', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = evaluateFormula(
          '{a} + {b} + {c}',
          { a: i, b: i * 2, c: i * 3 }
        );
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 1000 formula evaluations: ${duration}ms`);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Dependency Extraction Performance', () => {
    test('should extract dependencies from 100 formulas in <50ms', () => {
      const formulas = [];
      for (let i = 0; i < 100; i++) {
        formulas.push(`{field_${i}} + {field_${i + 1}} + {field_${i + 2}}`);
      }

      const startTime = Date.now();

      formulas.forEach(formula => {
        const deps = extractDependencies(formula);
        expect(deps.length).toBeGreaterThan(0);
      });

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 dependency extractions: ${duration}ms`);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Formula Validation Performance', () => {
    test('should validate 100 formulas in <200ms', () => {
      const formulas = [];
      for (let i = 0; i < 100; i++) {
        formulas.push(`{field_${i}} * 2 + sqrt({field_${i + 1}})`);
      }

      const startTime = Date.now();

      formulas.forEach(formula => {
        const validation = validateFormula(formula);
        expect(validation.valid).toBe(true);
      });

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 formula validations: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Circular Dependency Detection Performance', () => {
    test('should detect circular deps in large field graph in <100ms', () => {
      // Create a large field graph with 50 fields
      const allFields = {};

      // Create a chain: field_0 -> field_1 -> field_2 -> ... -> field_49
      for (let i = 0; i < 49; i++) {
        allFields[`field_${i}`] = {
          dependencies: [`field_${i + 1}`]
        };
      }
      allFields['field_49'] = { dependencies: [] };

      const startTime = Date.now();

      // Check for circular dependency (should be none)
      const result = detectCircularDependencies('field_0', ['field_1'], allFields);

      const duration = Date.now() - startTime;
      console.log(`[PERF] Circular dependency check (50 fields): ${duration}ms`);

      expect(result.hasCircular).toBe(false);
      expect(duration).toBeLessThan(100);
    });

    test('should detect circular dependency in complex graph in <100ms', () => {
      // Create a graph with a cycle
      const allFields = {
        field_a: { dependencies: ['field_b', 'field_c'] },
        field_b: { dependencies: ['field_d'] },
        field_c: { dependencies: ['field_d'] },
        field_d: { dependencies: ['field_e'] },
        field_e: { dependencies: ['field_a'] } // Creates cycle
      };

      const startTime = Date.now();

      const result = detectCircularDependencies('field_a', ['field_b', 'field_c'], allFields);

      const duration = Date.now() - startTime;
      console.log(`[PERF] Circular dependency detection (with cycle): ${duration}ms`);

      expect(result.hasCircular).toBe(true);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cascading Calculation Performance', () => {
    test('should handle cascading calculations (field depends on calculated field) in <100ms', () => {
      // Simulate cascading: field_c depends on field_b, which depends on field_a
      const startTime = Date.now();

      // Step 1: Calculate field_b
      const resultB = evaluateFormula('{field_a} * 2', { field_a: 10 });
      expect(resultB.success).toBe(true);

      // Step 2: Calculate field_c using field_b's result
      const resultC = evaluateFormula('{field_b} + 5', { field_b: resultB.result });
      expect(resultC.success).toBe(true);
      expect(resultC.result).toBe(25); // (10 * 2) + 5

      const duration = Date.now() - startTime;
      console.log(`[PERF] Cascading calculation (2 levels): ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    test('should handle deep cascading (5 levels) in <100ms', () => {
      const startTime = Date.now();

      let value = 10;
      for (let i = 0; i < 5; i++) {
        const result = evaluateFormula('{value} * 2', { value });
        expect(result.success).toBe(true);
        value = result.result;
      }

      expect(value).toBe(320); // 10 * 2^5

      const duration = Date.now() - startTime;
      console.log(`[PERF] Deep cascading (5 levels): ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Date Function Performance', () => {
    test('should evaluate 100 date-based formulas in <100ms', () => {
      const startTime = Date.now();

      const birthDate = 9000; // Days since epoch (roughly 1994)

      for (let i = 0; i < 100; i++) {
        const result = evaluateFormula(
          '(today() - {birth_date}) / 365.25',
          { birth_date: birthDate + i }
        );
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 age calculations: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });

    test('should evaluate complex date formulas in <50ms', () => {
      const startTime = Date.now();

      const birthDate = 7305; // Days since epoch (1990-01-01)

      for (let i = 0; i < 50; i++) {
        const result = evaluateFormula(
          'year({birth_date}) + month({birth_date}) + day({birth_date})',
          { birth_date: birthDate }
        );
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 50 complex date formulas: ${duration}ms`);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Edge Cases Performance', () => {
    test('should handle formulas with many dependencies in <50ms', () => {
      // Formula with 10 dependencies
      const formula = '{a} + {b} + {c} + {d} + {e} + {f} + {g} + {h} + {i} + {j}';
      const values = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 };

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = evaluateFormula(formula, values);
        expect(result.success).toBe(true);
        expect(result.result).toBe(55);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 formulas with 10 dependencies: ${duration}ms`);
      expect(duration).toBeLessThan(50);
    });

    test('should handle deeply nested parentheses in <100ms', () => {
      const formula = '((((({a} + {b}) * {c}) - {d}) / {e}) ^ 2)';
      const values = { a: 1, b: 2, c: 3, d: 4, e: 5 };

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = evaluateFormula(formula, values);
        expect(result.success).toBe(true);
      }

      const duration = Date.now() - startTime;
      console.log(`[PERF] 100 deeply nested formulas: ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory and Scalability', () => {
    test('should not leak memory when evaluating many formulas', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Evaluate 10000 formulas
      for (let i = 0; i < 10000; i++) {
        evaluateFormula('{a} + {b}', { a: i, b: i * 2 });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`[PERF] Memory increase after 10000 evaluations: ${memoryIncrease.toFixed(2)}MB`);

      // Should not increase memory by more than 15MB (allowing for normal variance)
      expect(memoryIncrease).toBeLessThan(15);
    });
  });
});

describe('Integration: Batch Recalculation Performance', () => {
  test('should simulate recalculating 100 patient fields in <500ms', () => {
    // Simulate 100 patients, each with 10 calculated fields
    const startTime = Date.now();

    const formulas = [
      '{weight} / ({height} * {height})', // BMI
      '(today() - {birth_date}) / 365.25', // Age
      '{weight} * 0.453592', // Weight in kg
      '{height} * 2.54', // Height in cm
      'sqrt({weight} * {height})', // Complex calc
      '{weight} - {ideal_weight}', // Weight difference
      '({weight} / {ideal_weight}) * 100', // Weight percentage
      'max({weight}, {ideal_weight})', // Max weight
      'min({weight}, {ideal_weight})', // Min weight
      'abs({weight} - {ideal_weight})' // Absolute difference
    ];

    let totalEvaluations = 0;

    // Simulate 100 patients
    for (let patient = 0; patient < 100; patient++) {
      const values = {
        weight: 70 + patient,
        height: 1.75,
        birth_date: 9000 + patient,
        ideal_weight: 75
      };

      // Evaluate all formulas for this patient
      formulas.forEach(formula => {
        const result = evaluateFormula(formula, values);
        expect(result.success).toBe(true);
        totalEvaluations++;
      });
    }

    const duration = Date.now() - startTime;
    const avgPerEvaluation = duration / totalEvaluations;

    console.log(`[PERF] Simulated batch recalculation:`);
    console.log(`  - Total time: ${duration}ms`);
    console.log(`  - Patients: 100`);
    console.log(`  - Fields per patient: 10`);
    console.log(`  - Total evaluations: ${totalEvaluations}`);
    console.log(`  - Avg per evaluation: ${avgPerEvaluation.toFixed(2)}ms`);

    // Should complete in less than 500ms (requirement from US-5.2.3)
    expect(duration).toBeLessThan(500);
  });
});
