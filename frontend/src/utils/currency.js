/**
 * Currency Utility Functions
 * Format currency amounts with Euro symbol
 */

/**
 * Format amount as Euro currency
 * @param {number} amount - The amount to format
 * @param {string} locale - Locale for formatting (default: 'fr-FR')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, locale = 'fr-FR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format amount as simple Euro string (e.g., "100.00 €")
 * @param {number} amount - The amount to format
 * @returns {string} Formatted amount with Euro symbol
 */
export const formatEuro = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00 €';
  }

  return `${amount.toFixed(2)} €`;
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed number value
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;

  // Remove currency symbols and spaces
  const cleanedString = currencyString
    .replace(/[€$\s]/g, '')
    .replace(',', '.');

  return parseFloat(cleanedString) || 0;
};
