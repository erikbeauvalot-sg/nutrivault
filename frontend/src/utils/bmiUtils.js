/**
 * BMI Utilities
 * Helper functions for BMI calculations and classifications
 */

/**
 * Get BMI category and color based on BMI value
 * @param {number} bmi - The BMI value
 * @param {function} t - Translation function from i18next
 * @returns {object} Object with category text and badge variant
 */
export const getBMICategory = (bmi, t) => {
  if (!bmi || isNaN(bmi)) {
    return { category: '-', variant: 'secondary', textColor: 'text-muted' };
  }

  const bmiValue = parseFloat(bmi);

  if (bmiValue < 18.5) {
    return {
      category: t('bmi.underweight', 'Sous poids'),
      variant: 'info',
      textColor: 'text-info'
    };
  } else if (bmiValue >= 18.5 && bmiValue < 25) {
    return {
      category: t('bmi.idealWeight', 'Poids idéal'),
      variant: 'success',
      textColor: 'text-success'
    };
  } else if (bmiValue >= 25 && bmiValue < 30) {
    return {
      category: t('bmi.overweight', 'Surpoids'),
      variant: 'warning',
      textColor: 'text-warning'
    };
  } else if (bmiValue >= 30 && bmiValue < 35) {
    return {
      category: t('bmi.obesityModerate', 'Obésité modérée'),
      variant: 'orange',
      textColor: 'text-danger',
      customBg: '#fd7e14'
    };
  } else if (bmiValue >= 35 && bmiValue < 40) {
    return {
      category: t('bmi.obesitySevere', 'Obésité sévère'),
      variant: 'danger',
      textColor: 'text-danger'
    };
  } else {
    return {
      category: t('bmi.obesityMorbid', 'Obésité morbide'),
      variant: 'dark',
      textColor: 'text-dark',
      customBg: '#dc3545'
    };
  }
};

/**
 * Calculate BMI from weight and height
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {number|null} Calculated BMI or null if invalid inputs
 */
export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  return parseFloat(bmi.toFixed(1));
};

/**
 * Get BMI ranges for reference
 * @param {function} t - Translation function
 * @returns {array} Array of BMI range objects
 */
export const getBMIRanges = (t) => [
  {
    label: t('bmi.underweight', 'Sous poids'),
    range: '< 18,5',
    variant: 'info'
  },
  {
    label: t('bmi.idealWeight', 'Poids idéal'),
    range: '18,5 - 24,9',
    variant: 'success'
  },
  {
    label: t('bmi.overweight', 'Surpoids'),
    range: '25 - 29,9',
    variant: 'warning'
  },
  {
    label: t('bmi.obesityModerate', 'Obésité modérée'),
    range: '30 - 34,9',
    variant: 'orange',
    customBg: '#fd7e14'
  },
  {
    label: t('bmi.obesitySevere', 'Obésité sévère'),
    range: '35 - 39,9',
    variant: 'danger'
  },
  {
    label: t('bmi.obesityMorbid', 'Obésité morbide'),
    range: '≥ 40',
    variant: 'dark',
    customBg: '#dc3545'
  }
];
