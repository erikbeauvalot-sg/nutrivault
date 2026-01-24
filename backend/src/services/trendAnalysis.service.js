/**
 * Trend Analysis Service
 *
 * Provides statistical analysis and trend calculation functions for patient measures.
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 */

/**
 * Calculate trend metrics for a dataset
 * @param {Array<number>} values - Numeric values array
 * @param {Array<Date|string>} dates - Corresponding dates array
 * @returns {Object} Trend metrics
 */
function calculateTrendMetrics(values, dates) {
  if (!values || !dates || values.length === 0 || values.length !== dates.length) {
    return {
      direction: 'stable',
      percentageChange: 0,
      velocity: 0,
      rSquared: 0
    };
  }

  if (values.length < 2) {
    return {
      direction: 'stable',
      percentageChange: 0,
      velocity: 0,
      rSquared: 0
    };
  }

  // Calculate percentage change (first to last)
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const percentageChange = firstValue !== 0
    ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
    : 0;

  // Calculate velocity (change per day)
  const firstDate = new Date(dates[0]);
  const lastDate = new Date(dates[dates.length - 1]);
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  const velocity = daysDiff > 0 ? (lastValue - firstValue) / daysDiff : 0;

  // Determine direction
  let direction = 'stable';
  if (Math.abs(percentageChange) > 1) { // More than 1% change
    direction = percentageChange > 0 ? 'increasing' : 'decreasing';
  }

  // Calculate R² for trend line quality
  const trendLine = calculateTrendLine(values, dates);
  const rSquared = trendLine.rSquared;

  return {
    direction,
    percentageChange: parseFloat(percentageChange.toFixed(2)),
    velocity: parseFloat(velocity.toFixed(4)),
    rSquared: parseFloat(rSquared.toFixed(4))
  };
}

/**
 * Calculate moving averages with multiple windows
 * @param {Array<number>} values - Numeric values array
 * @param {Array<Date|string>} dates - Corresponding dates array
 * @param {Array<number>} windows - Window sizes (default: [7, 30, 90])
 * @returns {Object} Moving averages for each window
 */
function calculateMovingAverages(values, dates, windows = [7, 30, 90]) {
  if (!values || !dates || values.length === 0) {
    return {};
  }

  const result = {};

  windows.forEach(window => {
    if (values.length < window) {
      result[`ma${window}`] = []; // Not enough data for this window
      return;
    }

    const ma = [];
    for (let i = window - 1; i < values.length; i++) {
      const windowSlice = values.slice(i - window + 1, i + 1);
      const avg = windowSlice.reduce((sum, val) => sum + val, 0) / window;
      ma.push({
        date: dates[i],
        value: parseFloat(avg.toFixed(2))
      });
    }

    result[`ma${window}`] = ma;
  });

  return result;
}

/**
 * Calculate linear regression trend line
 * @param {Array<number>} values - Numeric values array
 * @param {Array<Date|string>} dates - Corresponding dates array
 * @returns {Object} Trend line data (slope, intercept, predictions, rSquared)
 */
function calculateTrendLine(values, dates) {
  if (!values || !dates || values.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      predictions: [],
      rSquared: 0
    };
  }

  // Convert dates to numeric x values (days since first date)
  const firstDate = new Date(dates[0]).getTime();
  const x = dates.map(date => {
    const days = (new Date(date).getTime() - firstDate) / (1000 * 60 * 60 * 24);
    return days;
  });

  const y = values;
  const n = x.length;

  // Calculate sums
  const sumX = x.reduce((sum, xi) => sum + xi, 0);
  const sumY = y.reduce((sum, yi) => sum + yi, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  // Calculate slope and intercept using least squares
  const denominator = (n * sumX2 - sumX * sumX);
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Generate predictions
  const predictions = x.map((xi, i) => ({
    date: dates[i],
    value: parseFloat((slope * xi + intercept).toFixed(2))
  }));

  // Calculate R² (coefficient of determination)
  const meanY = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);

  const rSquared = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0;

  return {
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(4)),
    predictions,
    rSquared: parseFloat(Math.max(0, rSquared).toFixed(4)) // Ensure non-negative
  };
}

/**
 * Calculate comprehensive statistics
 * @param {Array<number>} values - Numeric values array
 * @returns {Object} Statistical measures
 */
function calculateStatistics(values) {
  if (!values || values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      variance: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      outliers: []
    };
  }

  const n = values.length;

  // Mean
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // Median and quartiles
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Quartiles
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // Variance and standard deviation (Welford's algorithm for numerical stability)
  let M2 = 0;
  let runningMean = 0;
  for (let i = 0; i < n; i++) {
    const delta = values[i] - runningMean;
    runningMean += delta / (i + 1);
    const delta2 = values[i] - runningMean;
    M2 += delta * delta2;
  }
  const variance = n > 1 ? M2 / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Identify outliers using IQR method
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value < lowerBound || value > upperBound)
    .map(({ value, index }) => {
      // Calculate z-score for outlier
      const zScore = stdDev !== 0 ? (value - mean) / stdDev : 0;
      return {
        index,
        value: parseFloat(value.toFixed(2)),
        zScore: parseFloat(zScore.toFixed(2))
      };
    });

  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    variance: parseFloat(variance.toFixed(2)),
    q1: parseFloat(q1.toFixed(2)),
    q3: parseFloat(q3.toFixed(2)),
    iqr: parseFloat(iqr.toFixed(2)),
    outliers
  };
}

/**
 * Normalize multiple measures to 0-100 scale for comparison
 * @param {Array<Object>} measures - Array of measure datasets
 * @returns {Array<Object>} Normalized datasets
 */
function normalizeMultipleMeasures(measures) {
  if (!measures || measures.length === 0) {
    return [];
  }

  return measures.map(measure => {
    const values = measure.data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    const normalizedData = measure.data.map(d => ({
      ...d,
      normalizedValue: range !== 0
        ? parseFloat((((d.value - min) / range) * 100).toFixed(2))
        : 50 // If all values are the same, normalize to midpoint
    }));

    return {
      ...measure,
      normalizedData,
      originalRange: { min, max }
    };
  });
}

/**
 * Calculate correlation coefficient between two datasets
 * @param {Array<number>} x - First dataset
 * @param {Array<number>} y - Second dataset
 * @returns {number} Pearson correlation coefficient (-1 to 1)
 */
function calculateCorrelation(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    numerator += deltaX * deltaY;
    denomX += deltaX * deltaX;
    denomY += deltaY * deltaY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  const correlation = denominator !== 0 ? numerator / denominator : 0;

  return parseFloat(correlation.toFixed(4));
}

module.exports = {
  calculateTrendMetrics,
  calculateMovingAverages,
  calculateTrendLine,
  calculateStatistics,
  normalizeMultipleMeasures,
  calculateCorrelation
};
