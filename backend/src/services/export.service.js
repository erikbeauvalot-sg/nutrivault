const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const db = require('../../../models');

/**
 * Export Service
 * Handles data export to CSV, Excel, and PDF formats
 */
class ExportService {
  /**
   * Export patients data
   * @param {string} format - 'csv', 'excel', or 'pdf'
   * @param {Object} filters - Query filters
   * @param {Object} user - User object for RBAC
   * @returns {Object} { data: Buffer, contentType: string, extension: string }
   */
  async exportPatients(format, filters = {}, user) {
    // Build query with RBAC filtering
    const whereClause = {};

    // Apply filters
    if (filters.is_active !== undefined) {
      whereClause.is_active = filters.is_active === 'true' || filters.is_active === true;
    }

    // RBAC: Dietitians can only export assigned patients
    if (user.role?.name === 'DIETITIAN') {
      whereClause.assigned_dietitian_id = user.id;
    }

    // Fetch patients with related data
    const patients = await db.Patient.findAll({
      where: whereClause,
      include: [{
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['first_name', 'last_name'],
        required: false
      }],
      order: [['created_at', 'DESC']]
    });

    // Transform data for export
    const exportData = patients.map(patient => ({
      'ID': patient.id,
      'First Name': patient.first_name,
      'Last Name': patient.last_name,
      'Email': patient.email || '',
      'Phone': patient.phone || '',
      'Assigned Dietitian': patient.assignedDietitian ?
        `${patient.assignedDietitian.first_name} ${patient.assignedDietitian.last_name}` : '',
      'Is Active': patient.is_active ? 'Yes' : 'No',
      'Created At': new Date(patient.created_at).toLocaleDateString()
    }));

    return this.generateFile(exportData, format, 'patients');
  }

  /**
   * Export visits data
   * @param {string} format - 'csv', 'excel', or 'pdf'
   * @param {Object} filters - Query filters
   * @param {Object} user - User object for RBAC
   * @returns {Object} { data: Buffer, contentType: string, extension: string }
   */
  async exportVisits(format, filters = {}, user) {
    // Build query with RBAC filtering
    const whereClause = {};

    // Apply filters
    if (filters.patient_id) {
      whereClause.patient_id = filters.patient_id;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    // RBAC: Dietitians can only export visits for assigned patients
    if (user.role?.name === 'DIETITIAN') {
      const assignedPatientIds = await db.Patient.findAll({
        where: { assigned_dietitian_id: user.id },
        attributes: ['id']
      }).then(patients => patients.map(p => p.id));

      if (assignedPatientIds.length === 0) {
        throw new Error('No assigned patients found');
      }

      whereClause.patient_id = { [Op.in]: assignedPatientIds };
    }

    // Fetch visits with related data
    const visits = await db.Visit.findAll({
      where: whereClause,
      include: [
        {
          model: db.Patient,
          as: 'patient',
          attributes: ['first_name', 'last_name']
        },
        {
          model: db.User,
          as: 'dietitian',
          attributes: ['first_name', 'last_name'],
          required: false
        }
      ],
      order: [['visit_date', 'DESC']]
    });

    // Transform data for export
    const exportData = visits.map(visit => ({
      'ID': visit.id,
      'Patient Name': `${visit.patient.first_name} ${visit.patient.last_name}`,
      'Visit Date': new Date(visit.visit_date).toLocaleDateString(),
      'Visit Type': visit.visit_type || '',
      'Status': visit.status,
      'Chief Complaint': visit.chief_complaint || '',
      'Dietitian': visit.dietitian ?
        `${visit.dietitian.first_name} ${visit.dietitian.last_name}` : '',
      'Duration (min)': visit.duration || '',
      'Created At': new Date(visit.created_at).toLocaleDateString()
    }));

    return this.generateFile(exportData, format, 'visits');
  }

  /**
   * Export billing data
   * @param {string} format - 'csv', 'excel', or 'pdf'
   * @param {Object} filters - Query filters
   * @param {Object} user - User object for RBAC
   * @returns {Object} { data: Buffer, contentType: string, extension: string }
   */
  async exportBilling(format, filters = {}, user) {
    // Build query with RBAC filtering
    const whereClause = {};

    // Apply filters
    if (filters.patient_id) {
      whereClause.patient_id = filters.patient_id;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }

    // RBAC: Dietitians can only export billing for assigned patients
    if (user.role?.name === 'DIETITIAN') {
      const assignedPatientIds = await db.Patient.findAll({
        where: { assigned_dietitian_id: user.id },
        attributes: ['id']
      }).then(patients => patients.map(p => p.id));

      if (assignedPatientIds.length === 0) {
        throw new Error('No assigned patients found');
      }

      whereClause.patient_id = { [Op.in]: assignedPatientIds };
    }

    // Fetch billing records with related data
    const billingRecords = await db.Billing.findAll({
      where: whereClause,
      include: [{
        model: db.Patient,
        as: 'patient',
        attributes: ['first_name', 'last_name']
      }],
      order: [['created_at', 'DESC']]
    });

    // Transform data for export
    const exportData = billingRecords.map(record => ({
      'Invoice Number': record.invoice_number || '',
      'Patient Name': `${record.patient.first_name} ${record.patient.last_name}`,
      'Invoice Date': record.invoice_date ? new Date(record.invoice_date).toLocaleDateString() : '',
      'Due Date': record.due_date ? new Date(record.due_date).toLocaleDateString() : '',
      'Amount': record.amount ? `$${record.amount.toFixed(2)}` : '',
      'Amount Paid': record.amount_paid ? `$${record.amount_paid.toFixed(2)}` : '',
      'Status': record.status,
      'Payment Method': record.payment_method || '',
      'Created At': new Date(record.created_at).toLocaleDateString()
    }));

    return this.generateFile(exportData, format, 'billing');
  }

  /**
   * Generate file in specified format
   * @param {Array} data - Data to export
   * @param {string} format - 'csv', 'excel', or 'pdf'
   * @param {string} filename - Base filename
   * @returns {Object} { data: Buffer, contentType: string, extension: string }
   */
  async generateFile(data, format, filename) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fullFilename = `${filename}_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        return this.generateCSV(data, fullFilename);
      case 'excel':
        return this.generateExcel(data, fullFilename);
      case 'pdf':
        return this.generatePDF(data, fullFilename);
      default:
        throw new Error('Unsupported format. Use csv, excel, or pdf.');
    }
  }

  /**
   * Generate CSV file
   */
  generateCSV(data, filename) {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const parser = new Parser();
    const csv = parser.parse(data);

    return {
      data: Buffer.from(csv, 'utf8'),
      contentType: 'text/csv',
      extension: 'csv',
      filename: `${filename}.csv`
    };
  }

  /**
   * Generate Excel file
   */
  async generateExcel(data, filename) {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers with styling
    const headers = Object.keys(data[0]);
    worksheet.columns = headers.map(header => ({
      header,
      key: header,
      width: Math.max(header.length, 15)
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' } // Light gray
    };

    // Add data rows
    data.forEach(row => {
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      data: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      filename: `${filename}.xlsx`
    };
  }

  /**
   * Generate PDF file
   */
  async generatePDF(data, filename) {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({
            data: pdfBuffer,
            contentType: 'application/pdf',
            extension: 'pdf',
            filename: `${filename}.pdf`
          });
        });

        // Add title
        doc.fontSize(16).text(`${filename.replace('_', ' ').toUpperCase()} REPORT`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Calculate column widths
        const headers = Object.keys(data[0]);
        const pageWidth = 550; // A4 width minus margins
        const colWidth = pageWidth / headers.length;

        // Add table headers
        doc.font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, 50 + (i * colWidth), doc.y, {
            width: colWidth - 10,
            align: 'left'
          });
        });
        doc.moveDown();

        // Add horizontal line
        doc.moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke();
        doc.moveDown();

        // Add data rows
        doc.font('Helvetica');
        data.forEach(row => {
          headers.forEach((header, i) => {
            const value = row[header] || '';
            doc.text(value.toString(), 50 + (i * colWidth), doc.y, {
              width: colWidth - 10,
              align: 'left'
            });
          });
          doc.moveDown();

          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new ExportService();