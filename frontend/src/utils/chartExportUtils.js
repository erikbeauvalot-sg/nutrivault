/**
 * Chart Export Utilities
 * Functions for exporting charts and data
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 4)
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { formatDate } from './dateUtils';

/**
 * Export chart as image (PNG or SVG)
 * @param {HTMLElement} chartElement - Chart container element
 * @param {string} filename - Output filename
 * @param {string} format - 'png' or 'svg'
 * @returns {Promise<void>}
 */
export async function exportChartAsImage(chartElement, filename = 'chart', format = 'png') {
  if (!chartElement) {
    throw new Error('Chart element not found');
  }

  try {
    if (format === 'png') {
      // Use html2canvas for PNG export
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false
      });

      canvas.toBlob((blob) => {
        saveAs(blob, `${filename}.png`);
      });
    } else if (format === 'svg') {
      // For SVG, we need to extract the SVG element from Recharts
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) {
        throw new Error('SVG element not found in chart');
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, `${filename}.svg`);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
}

/**
 * Export data as CSV
 * @param {Array<Object>} data - Array of data objects
 * @param {string} filename - Output filename
 * @param {Array<Object>} columns - Column definitions [{ key, label }]
 * @returns {void}
 */
export function exportDataAsCSV(data, filename = 'data', columns = null) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  try {
    // Auto-detect columns if not provided
    const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

    // Create CSV header
    const header = cols.map(col => `"${col.label}"`).join(',');

    // Create CSV rows
    const rows = data.map(row => {
      return cols.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  } catch (error) {
    console.error('Error exporting data as CSV:', error);
    throw error;
  }
}

/**
 * Generate PDF report with chart and data
 * @param {Object} options - Report options
 * @param {HTMLElement} options.chartElement - Chart container element
 * @param {string} options.title - Report title
 * @param {Object} options.patientData - Patient information
 * @param {Object} options.measureData - Measure data
 * @param {Object} options.statistics - Statistical summary
 * @param {Object} options.trend - Trend information
 * @param {string} options.filename - Output filename
 * @returns {Promise<void>}
 */
export async function generatePDFReport(options) {
  const {
    chartElement,
    title = 'Measure Report',
    patientData = {},
    measureData = {},
    statistics = {},
    trend = {},
    filename = 'report'
  } = options;

  if (!chartElement) {
    throw new Error('Chart element is required for PDF generation');
  }

  try {
    // Create PDF (A4 size)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Add header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, yPos);
    yPos += 10;

    // Add date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${formatDate(new Date())}`, margin, yPos);
    yPos += 10;

    // Add patient info
    if (patientData.name) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Patient Information', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${patientData.name}`, margin + 5, yPos);
      yPos += 5;

      if (patientData.id) {
        pdf.text(`ID: ${patientData.id}`, margin + 5, yPos);
        yPos += 5;
      }

      yPos += 3;
    }

    // Add measure info
    if (measureData.name) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Measure Information', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Measure: ${measureData.name}`, margin + 5, yPos);
      yPos += 5;

      if (measureData.unit) {
        pdf.text(`Unit: ${measureData.unit}`, margin + 5, yPos);
        yPos += 5;
      }

      if (measureData.count !== undefined) {
        pdf.text(`Data Points: ${measureData.count}`, margin + 5, yPos);
        yPos += 5;
      }

      yPos += 3;
    }

    // Add trend info
    if (trend.direction) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Trend Analysis', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const trendColor = trend.direction === 'increasing' ? [34, 197, 94] :
                         trend.direction === 'decreasing' ? [239, 68, 68] :
                         [59, 130, 246];

      pdf.setTextColor(...trendColor);
      pdf.text(`Direction: ${trend.direction.toUpperCase()}`, margin + 5, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 5;

      if (trend.percentageChange !== undefined) {
        pdf.text(`Change: ${trend.percentageChange > 0 ? '+' : ''}${trend.percentageChange.toFixed(1)}%`, margin + 5, yPos);
        yPos += 5;
      }

      if (trend.velocity !== undefined) {
        pdf.text(`Velocity: ${trend.velocity.toFixed(2)} ${measureData.unit || 'units'}/day`, margin + 5, yPos);
        yPos += 5;
      }

      yPos += 3;
    }

    // Add statistics
    if (statistics.mean !== undefined) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Statistics', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const stats = [
        `Mean: ${statistics.mean} ${measureData.unit || ''}`,
        `Median: ${statistics.median} ${measureData.unit || ''}`,
        `Std Dev: ±${statistics.stdDev} ${measureData.unit || ''}`,
        `Range: ${statistics.q1} - ${statistics.q3} ${measureData.unit || ''}`,
        `Outliers: ${statistics.outliers?.length || 0}`
      ];

      stats.forEach(stat => {
        pdf.text(stat, margin + 5, yPos);
        yPos += 5;
      });

      yPos += 5;
    }

    // Add chart image
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Chart', margin, yPos);
    yPos += 7;

    // Convert chart to image
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    if (yPos + imgHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
    yPos += imgHeight + 10;

    // Add footer
    const footerY = pageHeight - 10;
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Generated by NutriVault', margin, footerY);
    pdf.text(`Page 1`, pageWidth - margin - 20, footerY);

    // Save PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Format data for CSV export
 * @param {Array<Object>} data - Chart data
 * @param {Object} measureDefinition - Measure definition
 * @returns {Array<Object>} Formatted data
 */
export function formatChartDataForExport(data, measureDefinition = {}) {
  return data.map(point => ({
    'Date': point.date || point.fullDate || '',
    'Value': point.value !== undefined ? point.value : '',
    'MA 7-day': point.ma7 !== undefined ? point.ma7 : '',
    'MA 30-day': point.ma30 !== undefined ? point.ma30 : '',
    'MA 90-day': point.ma90 !== undefined ? point.ma90 : '',
    'Trend Line': point.trendLine !== undefined ? point.trendLine : '',
    'Outlier': point.isOutlier ? 'Yes' : 'No',
    'Notes': point.notes || ''
  }));
}
