import { format } from 'date-fns';

/**
 * Triggers a browser download for a Blob object.
 * @param {Blob} blob - The data blob to download.
 * @param {string} filename - The desired filename for the download.
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Generates a standardized filename for report exports.
 * @param {string} reportName - The name of the report (e.g., 'revenue_summary').
 * @returns {string} A filename like 'revenue_summary_2026-01-07.csv'.
 */
export const generateCsvFilename = (reportName) => {
  const dateStamp = format(new Date(), 'yyyy-MM-dd');
  return `${reportName}_${dateStamp}.csv`;
};

/**
 * Converts an array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of header names
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Build CSV rows
  const csvRows = [
    csvHeaders.join(','), // Header row
    ...data.map(row =>
      csvHeaders.map(header => {
        const cell = row[header];
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cell === null || cell === undefined) {
          return '';
        }
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};

/**
 * Downloads data as a CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Desired filename (without extension)
 * @param {Array} headers - Optional custom headers
 */
export const exportToCSV = (data, filename, headers = null) => {
  const csvContent = convertToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadBlob(blob, csvFilename);
};
