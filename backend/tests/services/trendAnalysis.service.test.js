/**
 * Tests for Trend Analysis Service
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 */

const {
  calculateTrendMetrics,
  calculateMovingAverages,
  calculateTrendLine,
  calculateStatistics,
  normalizeMultipleMeasures,
  calculateCorrelation
} = require('../../src/services/trendAnalysis.service');

describe('Trend Analysis Service', () => {
  describe('calculateTrendMetrics', () => {
    test('should calculate metrics for increasing trend', () => {
      const values = [70, 72, 74, 76, 78];
      const dates = [
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05'
      ];

      const result = calculateTrendMetrics(values, dates);

      expect(result.direction).toBe('increasing');
      expect(result.percentageChange).toBeGreaterThan(0);
      expect(result.velocity).toBeGreaterThan(0);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    test('should calculate metrics for decreasing trend', () => {
      const values = [100, 95, 90, 85, 80];
      const dates = [
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05'
      ];

      const result = calculateTrendMetrics(values, dates);

      expect(result.direction).toBe('decreasing');
      expect(result.percentageChange).toBeLessThan(0);
      expect(result.velocity).toBeLessThan(0);
    });

    test('should detect stable trend', () => {
      const values = [75, 75.1, 74.9, 75.2, 74.8];
      const dates = [
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05'
      ];

      const result = calculateTrendMetrics(values, dates);

      expect(result.direction).toBe('stable');
      expect(Math.abs(result.percentageChange)).toBeLessThan(1);
    });

    test('should handle empty array', () => {
      const result = calculateTrendMetrics([], []);

      expect(result.direction).toBe('stable');
      expect(result.percentageChange).toBe(0);
      expect(result.velocity).toBe(0);
      expect(result.rSquared).toBe(0);
    });

    test('should handle single value', () => {
      const result = calculateTrendMetrics([75], ['2024-01-01']);

      expect(result.direction).toBe('stable');
      expect(result.percentageChange).toBe(0);
    });

    test('should handle mismatched arrays', () => {
      const result = calculateTrendMetrics([70, 75], ['2024-01-01']);

      expect(result.direction).toBe('stable');
      expect(result.percentageChange).toBe(0);
    });

    test('should calculate correct percentage change', () => {
      const values = [100, 110]; // 10% increase
      const dates = ['2024-01-01', '2024-01-02'];

      const result = calculateTrendMetrics(values, dates);

      expect(result.percentageChange).toBeCloseTo(10, 1);
    });
  });

  describe('calculateMovingAverages', () => {
    test('should calculate MA7 correctly', () => {
      const values = [70, 72, 74, 76, 78, 80, 82, 84, 86];
      const dates = [
        '2024-01-01', '2024-01-02', '2024-01-03',
        '2024-01-04', '2024-01-05', '2024-01-06',
        '2024-01-07', '2024-01-08', '2024-01-09'
      ];

      const result = calculateMovingAverages(values, dates, [7]);

      expect(result.ma7).toBeDefined();
      expect(result.ma7.length).toBe(3); // 9 values - 7 window + 1
      expect(result.ma7[0].value).toBeCloseTo(76, 1);
    });

    test('should calculate multiple MAs', () => {
      const values = Array.from({ length: 100 }, (_, i) => 70 + i * 0.5);
      const dates = Array.from({ length: 100 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);

      const result = calculateMovingAverages(values, dates, [7, 30, 90]);

      expect(result.ma7).toBeDefined();
      expect(result.ma30).toBeDefined();
      expect(result.ma90).toBeDefined();
      expect(result.ma7.length).toBeGreaterThan(0);
      expect(result.ma30.length).toBeGreaterThan(0);
      expect(result.ma90.length).toBeGreaterThan(0);
    });

    test('should handle insufficient data for window', () => {
      const values = [70, 72, 74];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];

      const result = calculateMovingAverages(values, dates, [7, 30]);

      expect(result.ma7).toEqual([]);
      expect(result.ma30).toEqual([]);
    });

    test('should handle empty array', () => {
      const result = calculateMovingAverages([], [], [7]);

      expect(result).toEqual({});
    });

    test('should use default windows if not provided', () => {
      const values = Array.from({ length: 100 }, (_, i) => 70 + i * 0.5);
      const dates = Array.from({ length: 100 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);

      const result = calculateMovingAverages(values, dates);

      expect(result.ma7).toBeDefined();
      expect(result.ma30).toBeDefined();
      expect(result.ma90).toBeDefined();
    });
  });

  describe('calculateTrendLine', () => {
    test('should calculate linear regression for upward trend', () => {
      const values = [70, 72, 74, 76, 78];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

      const result = calculateTrendLine(values, dates);

      expect(result.slope).toBeGreaterThan(0);
      expect(result.intercept).toBeGreaterThan(0);
      expect(result.predictions.length).toBe(5);
      expect(result.rSquared).toBeCloseTo(1, 0); // Perfect linear should be close to 1
    });

    test('should calculate linear regression for downward trend', () => {
      const values = [100, 95, 90, 85, 80];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

      const result = calculateTrendLine(values, dates);

      expect(result.slope).toBeLessThan(0);
      expect(result.rSquared).toBeCloseTo(1, 0);
    });

    test('should handle flat trend', () => {
      const values = [75, 75, 75, 75, 75];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

      const result = calculateTrendLine(values, dates);

      expect(result.slope).toBeCloseTo(0, 2);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty array', () => {
      const result = calculateTrendLine([], []);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.predictions).toEqual([]);
      expect(result.rSquared).toBe(0);
    });

    test('should handle single value', () => {
      const result = calculateTrendLine([75], ['2024-01-01']);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.predictions).toEqual([]);
    });

    test('should calculate R² correctly for perfect fit', () => {
      const values = [1, 2, 3, 4, 5];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

      const result = calculateTrendLine(values, dates);

      expect(result.rSquared).toBeCloseTo(1, 2);
    });
  });

  describe('calculateStatistics', () => {
    test('should calculate all statistics correctly', () => {
      const values = [70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90];

      const result = calculateStatistics(values);

      expect(result.mean).toBeCloseTo(80, 1);
      expect(result.median).toBe(80);
      expect(result.stdDev).toBeGreaterThan(0);
      expect(result.variance).toBeGreaterThan(0);
      expect(result.q1).toBeLessThan(result.median);
      expect(result.q3).toBeGreaterThan(result.median);
      expect(result.iqr).toBeGreaterThan(0);
      expect(Array.isArray(result.outliers)).toBe(true);
    });

    test('should detect outliers', () => {
      const values = [70, 72, 74, 76, 78, 80, 82, 200]; // 200 is an outlier

      const result = calculateStatistics(values);

      expect(result.outliers.length).toBeGreaterThan(0);
      expect(result.outliers[0].value).toBe(200);
      expect(result.outliers[0].index).toBe(7);
      expect(result.outliers[0].zScore).toBeGreaterThan(2);
    });

    test('should handle no outliers', () => {
      const values = [70, 72, 74, 76, 78];

      const result = calculateStatistics(values);

      expect(result.outliers).toEqual([]);
    });

    test('should handle empty array', () => {
      const result = calculateStatistics([]);

      expect(result.mean).toBe(0);
      expect(result.median).toBe(0);
      expect(result.stdDev).toBe(0);
      expect(result.outliers).toEqual([]);
    });

    test('should handle single value', () => {
      const result = calculateStatistics([75]);

      expect(result.mean).toBe(75);
      expect(result.median).toBe(75);
      expect(result.stdDev).toBe(0);
    });

    test('should calculate median correctly for even count', () => {
      const values = [1, 2, 3, 4];

      const result = calculateStatistics(values);

      expect(result.median).toBe(2.5);
    });

    test('should calculate median correctly for odd count', () => {
      const values = [1, 2, 3, 4, 5];

      const result = calculateStatistics(values);

      expect(result.median).toBe(3);
    });
  });

  describe('normalizeMultipleMeasures', () => {
    test('should normalize measures to 0-100 scale', () => {
      const measures = [
        {
          name: 'Weight',
          data: [
            { date: '2024-01-01', value: 70 },
            { date: '2024-01-02', value: 75 },
            { date: '2024-01-03', value: 80 }
          ]
        },
        {
          name: 'BMI',
          data: [
            { date: '2024-01-01', value: 22 },
            { date: '2024-01-02', value: 24 },
            { date: '2024-01-03', value: 26 }
          ]
        }
      ];

      const result = normalizeMultipleMeasures(measures);

      expect(result.length).toBe(2);
      expect(result[0].normalizedData[0].normalizedValue).toBe(0);
      expect(result[0].normalizedData[2].normalizedValue).toBe(100);
      expect(result[0].originalRange.min).toBe(70);
      expect(result[0].originalRange.max).toBe(80);
    });

    test('should handle all same values', () => {
      const measures = [
        {
          name: 'Weight',
          data: [
            { date: '2024-01-01', value: 75 },
            { date: '2024-01-02', value: 75 },
            { date: '2024-01-03', value: 75 }
          ]
        }
      ];

      const result = normalizeMultipleMeasures(measures);

      expect(result[0].normalizedData[0].normalizedValue).toBe(50);
      expect(result[0].normalizedData[1].normalizedValue).toBe(50);
    });

    test('should handle empty array', () => {
      const result = normalizeMultipleMeasures([]);

      expect(result).toEqual([]);
    });
  });

  describe('calculateCorrelation', () => {
    test('should calculate perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const result = calculateCorrelation(x, y);

      expect(result).toBeCloseTo(1, 2);
    });

    test('should calculate perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      const result = calculateCorrelation(x, y);

      expect(result).toBeCloseTo(-1, 2);
    });

    test('should calculate no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 3, 4, 2, 1];

      const result = calculateCorrelation(x, y);

      expect(Math.abs(result)).toBeLessThan(1);
    });

    test('should handle empty arrays', () => {
      const result = calculateCorrelation([], []);

      expect(result).toBe(0);
    });

    test('should handle mismatched arrays', () => {
      const result = calculateCorrelation([1, 2, 3], [1, 2]);

      expect(result).toBe(0);
    });

    test('should handle single value', () => {
      const result = calculateCorrelation([1], [2]);

      expect(result).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(calculateTrendMetrics(null, null).direction).toBe('stable');
      expect(calculateMovingAverages(null, null)).toEqual({});
      expect(calculateTrendLine(null, null).slope).toBe(0);
      expect(calculateStatistics(null).mean).toBe(0);
    });

    test('should handle very large numbers', () => {
      const values = [1000000, 1020000, 1040000]; // 2% and 4% increases
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];

      const trend = calculateTrendMetrics(values, dates);
      const stats = calculateStatistics(values);

      expect(trend.direction).toBe('increasing');
      expect(stats.mean).toBeCloseTo(1020000, 0);
    });

    test('should handle negative numbers', () => {
      const values = [-10, -5, 0, 5, 10];
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

      const trend = calculateTrendMetrics(values, dates);
      const stats = calculateStatistics(values);

      expect(trend.direction).toBe('increasing');
      expect(stats.mean).toBe(0);
    });

    test('should handle decimal precision', () => {
      const values = [70.123, 72.456, 74.789];

      const stats = calculateStatistics(values);

      expect(stats.mean).toBeCloseTo(72.46, 2);
      expect(stats.stdDev).toBeGreaterThan(0);
    });
  });
});
