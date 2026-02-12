/**
 * Statistics Utilities
 *
 * Client-side helper functions for statistical analysis and trend visualization.
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 */

import { formatDate } from './dateUtils';

/**
 * Calculate basic statistics from an array of values
 * @param {Array<number>} values - Numeric values array
 * @returns {Object} Statistics (mean, median, min, max, count)
 */
export function calculateStats(values) {
  if (!values || values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  const min = sorted[0];
  const max = sorted[count - 1];

  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    count
  };
}

/**
 * Determine trend direction from values and dates
 * @param {Array<number>} values - Numeric values array
 * @param {Array<Date|string>} dates - Corresponding dates array
 * @returns {string} Direction: 'increasing', 'decreasing', or 'stable'
 */
export function getTrendDirection(values, dates) {
  if (!values || values.length < 2) {
    return 'stable';
  }

  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const percentageChange = firstValue !== 0
    ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
    : 0;

  if (Math.abs(percentageChange) < 1) {
    return 'stable';
  }

  return percentageChange > 0 ? 'increasing' : 'decreasing';
}

/**
 * Format trend indicator for display
 * @param {Object} trend - Trend object with direction and percentageChange
 * @returns {Object} Formatted trend display data
 */
export function formatTrendIndicator(trend) {
  if (!trend) {
    return {
      emoji: '➡️',
      text: 'No trend data',
      color: 'gray',
      sign: ''
    };
  }

  const { direction, percentageChange } = trend;
  const absChange = Math.abs(percentageChange);

  const indicators = {
    increasing: {
      emoji: '↗️',
      text: 'Increasing',
      color: 'green',
      sign: '+'
    },
    decreasing: {
      emoji: '↘️',
      text: 'Decreasing',
      color: 'red',
      sign: '-'
    },
    stable: {
      emoji: '➡️',
      text: 'Stable',
      color: 'blue',
      sign: ''
    }
  };

  const indicator = indicators[direction] || indicators.stable;

  return {
    ...indicator,
    percentage: absChange.toFixed(1),
    formattedText: `${indicator.emoji} ${indicator.sign}${absChange.toFixed(1)}% ${indicator.text}`
  };
}

/**
 * Calculate velocity (rate of change per day)
 * @param {Array<number>} values - Numeric values array
 * @param {Array<Date|string>} dates - Corresponding dates array
 * @returns {number} Velocity (units per day)
 */
export function calculateVelocity(values, dates) {
  if (!values || !dates || values.length < 2) {
    return 0;
  }

  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const firstDate = new Date(dates[0]);
  const lastDate = new Date(dates[dates.length - 1]);

  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 0) {
    return 0;
  }

  const velocity = (lastValue - firstValue) / daysDiff;
  return parseFloat(velocity.toFixed(4));
}

/**
 * Identify outliers in a dataset
 * @param {Array<number>} values - Numeric values array
 * @returns {Array<number>} Indices of outliers
 */
export function identifyOutliers(values) {
  if (!values || values.length < 4) {
    return [];
  }

  // Calculate quartiles
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // IQR method for outlier detection
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outlierIndices = [];
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Format statistical summary for display
 * @param {Object} statistics - Statistics object from API
 * @param {string} unit - Unit of measurement
 * @returns {Array<Object>} Array of formatted stat items
 */
export function formatStatisticsSummary(statistics, unit = '') {
  if (!statistics) {
    return [];
  }

  return [
    {
      label: 'Mean',
      value: `${statistics.mean} ${unit}`,
      key: 'mean'
    },
    {
      label: 'Median',
      value: `${statistics.median} ${unit}`,
      key: 'median'
    },
    {
      label: 'Std Dev',
      value: `±${statistics.stdDev} ${unit}`,
      key: 'stdDev'
    },
    {
      label: 'Range',
      value: `${statistics.q1} - ${statistics.q3} ${unit}`,
      key: 'range'
    },
    {
      label: 'Outliers',
      value: statistics.outliers?.length || 0,
      key: 'outliers'
    }
  ];
}

/**
 * Get color for trend direction
 * @param {string} direction - Trend direction ('increasing', 'decreasing', 'stable')
 * @returns {string} CSS color value
 */
export function getTrendColor(direction) {
  const colors = {
    increasing: '#22c55e', // green-500
    decreasing: '#ef4444', // red-500
    stable: '#3b82f6' // blue-500
  };

  return colors[direction] || colors.stable;
}

/**
 * Get chart color for moving average line
 * @param {number} window - MA window size (7, 30, 90)
 * @returns {string} CSS color value
 */
export function getMAColor(window) {
  const colors = {
    7: '#f97316', // orange-500
    30: '#10b981', // emerald-500
    90: '#8b5cf6' // violet-500
  };

  return colors[window] || '#6b7280'; // gray-500
}

/**
 * Format data point for Recharts
 * @param {Object} point - Data point from API
 * @param {number} index - Index in array
 * @returns {Object} Formatted data point
 */
export function formatDataPointForChart(point, index) {
  return {
    index,
    date: formatDate(point.measured_at || point.date),
    fullDate: point.measured_at || point.date,
    value: point.value,
    notes: point.notes,
    isOutlier: point.isOutlier || false
  };
}

/**
 * Merge multiple datasets for Recharts (data + MA lines + trend line)
 * @param {Array<Object>} data - Main data points
 * @param {Object} movingAverages - MA data (ma7, ma30, ma90)
 * @param {Object} trendLine - Trend line data
 * @returns {Array<Object>} Merged dataset for Recharts
 */
export function mergeChartData(data, movingAverages = {}, trendLine = null) {
  if (!data || data.length === 0) {
    return [];
  }

  // Create base dataset from main data
  const merged = data.map((point, index) => ({
    index,
    date: formatDate(point.measured_at || point.date),
    fullDate: point.measured_at || point.date,
    value: point.value,
    isOutlier: point.isOutlier || false,
    notes: point.notes
  }));

  // Add MA7 values
  if (movingAverages.ma7 && movingAverages.ma7.length > 0) {
    const ma7StartIndex = data.length - movingAverages.ma7.length;
    movingAverages.ma7.forEach((ma, i) => {
      const targetIndex = ma7StartIndex + i;
      if (merged[targetIndex]) {
        merged[targetIndex].ma7 = ma.value;
      }
    });
  }

  // Add MA30 values
  if (movingAverages.ma30 && movingAverages.ma30.length > 0) {
    const ma30StartIndex = data.length - movingAverages.ma30.length;
    movingAverages.ma30.forEach((ma, i) => {
      const targetIndex = ma30StartIndex + i;
      if (merged[targetIndex]) {
        merged[targetIndex].ma30 = ma.value;
      }
    });
  }

  // Add MA90 values
  if (movingAverages.ma90 && movingAverages.ma90.length > 0) {
    const ma90StartIndex = data.length - movingAverages.ma90.length;
    movingAverages.ma90.forEach((ma, i) => {
      const targetIndex = ma90StartIndex + i;
      if (merged[targetIndex]) {
        merged[targetIndex].ma90 = ma.value;
      }
    });
  }

  // Add trend line values
  if (trendLine && trendLine.predictions && trendLine.predictions.length > 0) {
    trendLine.predictions.forEach((prediction, i) => {
      if (merged[i]) {
        merged[i].trendLine = prediction.value;
      }
    });
  }

  return merged;
}
