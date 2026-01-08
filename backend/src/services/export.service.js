/**
 * Data Export Service
 *
 * Handles exporting data to CSV, Excel, and PDF formats
 */

const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../../models');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const fs = require('fs');
const path = require('path');

/**
 * Export patients data
 */
async function exportPatients(format, filters, requestingUser, requestMetadata) {
  // Apply same RBAC rules as getPatients
  const where = {};

  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    where.assigned_dietitian_id = requestingUser.id;
  }

  // Apply filters if provided
  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active === 'true' || filters.is_active === true;
  }

  const patients = await db.Patient.findAll({
    where,
    include: [
      {
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['id', 'username', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Transform data for export
  const exportData = patients.map(p => ({
    ID: p.id,
    'First Name': p.first_name,
    'Last Name': p.last_name,
    'Date of Birth': p.date_of_birth,
    Gender: p.gender || 'N/A',
    Email: p.email || 'N/A',
    Phone: p.phone || 'N/A',
    City: p.city || 'N/A',
    'Postal Code': p.postal_code || 'N/A',
    Country: p.country || 'N/A',
    'Assigned Dietitian': p.assignedDietitian
      ? `${p.assignedDietitian.first_name} ${p.assignedDietitian.last_name}`
      : 'Unassigned',
    'Is Active': p.is_active ? 'Yes' : 'No',
    'Created At': p.created_at.toISOString()
  }));

  // Audit log
  await logCrudEvent(
    'EXPORT',
    'patients',
    null,
    requestingUser,
    requestMetadata,
    null,
    { format, count: exportData.length }
  );

  return generateExport(exportData, format, 'patients');
}

/**
 * Export visits data
 */
async function exportVisits(format, filters, requestingUser, requestMetadata) {
  const where = {};

  // Apply filters
  if (filters.patient_id) {
    where.patient_id = filters.patient_id;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  const visits = await db.Visit.findAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name'],
        include: [
          {
            model: db.User,
            as: 'assignedDietitian',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      },
      {
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name']
      }
    ],
    order: [['visit_date', 'DESC']]
  });

  // Filter for dietitians - only their assigned patients
  let filteredVisits = visits;
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    filteredVisits = visits.filter(v =>
      v.patient.assignedDietitian && v.patient.assignedDietitian.id === requestingUser.id
    );
  }

  const exportData = filteredVisits.map(v => ({
    ID: v.id,
    'Patient Name': `${v.patient.first_name} ${v.patient.last_name}`,
    'Visit Date': v.visit_date,
    'Visit Type': v.visit_type || 'N/A',
    Status: v.status,
    'Chief Complaint': v.chief_complaint || 'N/A',
    'Dietitian': v.dietitian
      ? `${v.dietitian.first_name} ${v.dietitian.last_name}`
      : 'N/A',
    Duration: v.duration ? `${v.duration} min` : 'N/A',
    'Created At': v.created_at.toISOString()
  }));

  await logCrudEvent(
    'EXPORT',
    'visits',
    null,
    requestingUser,
    requestMetadata,
    null,
    { format, count: exportData.length }
  );

  return generateExport(exportData, format, 'visits');
}

/**
 * Export billing data
 */
async function exportBilling(format, filters, requestingUser, requestMetadata) {
  const where = {};

  if (filters.patient_id) {
    where.patient_id = filters.patient_id;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  const billings = await db.Billing.findAll({
    where,
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name'],
        include: [
          {
            model: db.User,
            as: 'assignedDietitian',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      },
      {
        model: db.Visit,
        as: 'visit',
        attributes: ['id', 'visit_date']
      }
    ],
    order: [['invoice_date', 'DESC']]
  });

  // Filter for dietitians
  let filteredBilling = billings;
  if (requestingUser.role && requestingUser.role.name === 'DIETITIAN') {
    filteredBilling = billings.filter(b =>
      b.patient.assignedDietitian && b.patient.assignedDietitian.id === requestingUser.id
    );
  }

  const exportData = filteredBilling.map(b => ({
    'Invoice Number': b.invoice_number,
    'Patient Name': `${b.patient.first_name} ${b.patient.last_name}`,
    'Invoice Date': b.invoice_date,
    'Due Date': b.due_date,
    Amount: `$${parseFloat(b.amount).toFixed(2)}`,
    'Amount Paid': b.amount_paid ? `$${parseFloat(b.amount_paid).toFixed(2)}` : '$0.00',
    Status: b.status,
    'Payment Method': b.payment_method || 'N/A',
    'Visit Date': b.visit && b.visit.visit_date ? b.visit.visit_date : 'N/A',
    'Created At': b.created_at.toISOString()
  }));

  await logCrudEvent(
    'EXPORT',
    'billing',
    null,
    requestingUser,
    requestMetadata,
    null,
    { format, count: exportData.length }
  );

  return generateExport(exportData, format, 'billing');
}

/**
 * Generate export in specified format
 */
function generateExport(data, format, resourceType) {
  switch (format.toLowerCase()) {
    case 'csv':
      return generateCSV(data);
    case 'excel':
    case 'xlsx':
      return generateExcel(data, resourceType);
    case 'pdf':
      return generatePDF(data, resourceType);
    default:
      throw new AppError(`Unsupported export format: ${format}`, 400, 'INVALID_FORMAT');
  }
}

/**
 * Generate CSV export
 */
function generateCSV(data) {
  if (!data || data.length === 0) {
    throw new AppError('No data available for export', 400, 'NO_DATA');
  }

  const parser = new Parser();
  const csv = parser.parse(data);

  return {
    data: Buffer.from(csv, 'utf-8'),
    contentType: 'text/csv',
    extension: 'csv'
  };
}

/**
 * Generate Excel export
 */
async function generateExcel(data, resourceType) {
  if (!data || data.length === 0) {
    throw new AppError('No data available for export', 400, 'NO_DATA');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(resourceType.charAt(0).toUpperCase() + resourceType.slice(1));

  // Get column names from first row
  const columns = Object.keys(data[0]).map(key => ({
    header: key,
    key: key,
    width: 20
  }));

  worksheet.columns = columns;

  // Add data rows
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return {
    data: buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx'
  };
}

/**
 * Generate PDF export
 */
function generatePDF(data, resourceType) {
  if (!data || data.length === 0) {
    throw new AppError('No data available for export', 400, 'NO_DATA');
  }

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));

  // Title
  doc.fontSize(20).text(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Export`, {
    align: 'center'
  });

  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, {
    align: 'center'
  });

  doc.moveDown(2);

  // Table
  const columns = Object.keys(data[0]);
  const columnWidth = (doc.page.width - 100) / columns.length;

  // Header
  doc.fontSize(9).font('Helvetica-Bold');
  let y = doc.y;
  columns.forEach((col, i) => {
    doc.text(col, 50 + (i * columnWidth), y, {
      width: columnWidth,
      align: 'left'
    });
  });

  doc.moveDown();
  doc.font('Helvetica');

  // Rows
  data.forEach((row, rowIndex) => {
    if (doc.y > 700) {
      doc.addPage();
      y = 50;
      doc.y = y;
    }

    y = doc.y;
    columns.forEach((col, i) => {
      const value = String(row[col] || '');
      doc.text(value.substring(0, 50), 50 + (i * columnWidth), y, {
        width: columnWidth,
        height: 15,
        align: 'left',
        ellipsis: true
      });
    });

    doc.moveDown(0.5);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve({
        data: pdfBuffer,
        contentType: 'application/pdf',
        extension: 'pdf'
      });
    });

    doc.on('error', reject);
  });
}

module.exports = {
  exportPatients,
  exportVisits,
  exportBilling
};
