/**
 * Invoice PDF Service
 * Generates customized invoice PDFs using pdfkit
 * OPTIMIZED for single A4 page layout
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../../../models');
const invoiceCustomizationService = require('./invoiceCustomization.service');

/**
 * Get the base path for uploads directory
 * In production (Docker): /app
 * In development: process.cwd() (backend directory)
 */
const getUploadsBasePath = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/app';
  }
  return process.cwd();
};

// A4 page dimensions
const PAGE_WIDTH = 595.28;  // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 50;
const FOOTER_HEIGHT = 70; // Reserved space for footer at bottom
const CONTENT_HEIGHT = PAGE_HEIGHT - (MARGIN * 2) - FOOTER_HEIGHT;

// Translations for invoice PDF
const translations = {
  fr: {
    invoice: 'FACTURE',
    billTo: 'FACTURER À :',
    invoiceNumber: 'Facture N° :',
    date: 'Date :',
    dueDate: 'Échéance :',
    status: 'Statut :',
    description: 'Description',
    quantity: 'Qté',
    unitPrice: 'Prix unit.',
    total: 'Total',
    subtotal: 'Sous-total :',
    paid: 'Payé :',
    totalDue: 'Total dû :',
    // Status translations
    DRAFT: 'Brouillon',
    SENT: 'Envoyée',
    PAID: 'Payée',
    CANCELLED: 'Annulée',
    OVERDUE: 'En retard',
    PARTIAL: 'Partielle'
  },
  en: {
    invoice: 'INVOICE',
    billTo: 'BILL TO:',
    invoiceNumber: 'Invoice #:',
    date: 'Date:',
    dueDate: 'Due Date:',
    status: 'Status:',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal:',
    paid: 'Paid:',
    totalDue: 'Total Due:',
    // Status translations
    DRAFT: 'Draft',
    SENT: 'Sent',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    OVERDUE: 'Overdue',
    PARTIAL: 'Partial'
  }
};

// Get translation helper
const getTranslations = (lang = 'fr') => translations[lang] || translations.fr;

/**
 * Generate invoice PDF with user customization
 * @param {string} invoiceId - Invoice ID
 * @param {string} userId - User ID for customization
 * @param {string} language - Language code ('fr' or 'en'), defaults to 'fr'
 */
const generateInvoicePDF = async (invoiceId, userId, language = 'fr') => {
  try {
    // Fetch invoice with all related data
    const invoice = await db.Billing.findByPk(invoiceId, {
      include: [
        {
          model: db.Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: db.Visit,
          as: 'visit',
          attributes: ['id', 'visit_date', 'visit_type']
        }
      ]
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get user customization
    const customization = await invoiceCustomizationService.getCustomizationForInvoice(userId);

    // Get translations
    const t = getTranslations(language);

    // Create PDF document with fixed margins
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: false
    });

    // Add single page
    doc.addPage();

    // Helper function to parse items JSON
    const parseItems = (itemsData) => {
      if (!itemsData) return [];
      if (typeof itemsData === 'string') {
        try {
          return JSON.parse(itemsData);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(itemsData) ? itemsData : [];
    };

    // Get items - if no items field exists, create one from service_description and amount_total
    let items = parseItems(invoice.items);

    if (items.length === 0 && invoice.service_description && invoice.amount_total) {
      // Create a single line item from service description and total amount
      items = [{
        item_name: invoice.service_description,
        description: invoice.notes || '',
        quantity: 1,
        unit_price: invoice.amount_total
      }];
    }

    // Draw header
    drawHeader(doc, customization, invoice, t);

    // Draw invoice + patient info (side by side)
    drawInvoiceAndPatientInfo(doc, invoice, invoice.patient, customization, t, language);

    // Draw line items table
    drawLineItems(doc, items, customization, t);

    // Draw totals
    drawTotals(doc, invoice, customization, t);

    // Draw signature (after totals)
    drawSignature(doc, customization);

    // Draw footer at ABSOLUTE bottom of page
    drawFooter(doc, customization);

    // Finalize PDF
    doc.end();

    return doc;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error(`Failed to generate invoice PDF: ${error.message}`);
  }
};

/**
 * Draw header - logo left, contact right
 */
function drawHeader(doc, customization, invoice, t) {
  const primaryColor = customization.primary_color || '#3498db';
  let y = MARGIN;

  // LEFT: Logo + Business name
  if (customization.show_logo && customization.logo_file_path) {
    try {
      const logoPath = path.join(getUploadsBasePath(), customization.logo_file_path);
      console.log('📷 Logo path:', logoPath, '- exists:', fs.existsSync(logoPath));
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, y, { width: 80, height: 40 });
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  }

  // Title
  doc.fontSize(22)
     .fillColor(primaryColor)
     .font('Helvetica-Bold')
     .text(t.invoice, MARGIN, y + 45);

  // RIGHT: Contact info
  if (customization.show_contact_info) {
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    let contactY = y;
    const contactX = 320;

    if (customization.business_name) {
      doc.text(customization.business_name, contactX, contactY, { align: 'right', width: 225 });
      contactY += 11;
    }
    if (customization.address_line1) {
      doc.text(customization.address_line1, contactX, contactY, { align: 'right', width: 225 });
      contactY += 11;
    }
    if (customization.city || customization.postal_code) {
      doc.text([customization.postal_code, customization.city].filter(Boolean).join(' '), contactX, contactY, { align: 'right', width: 225 });
      contactY += 11;
    }
    if (customization.phone) {
      doc.text(customization.phone, contactX, contactY, { align: 'right', width: 225 });
      contactY += 11;
    }
    if (customization.email) {
      doc.text(customization.email, contactX, contactY, { align: 'right', width: 225 });
      contactY += 11;
    }
    if (customization.misc_info) {
      contactY += 11; // Blank line before misc_info
      doc.text(customization.misc_info, contactX, contactY, { align: 'right', width: 225 });
    }
  }

  doc.y = y + 90; // Increased spacing
}

/**
 * Draw invoice details + patient info in TWO COLUMNS side by side
 */
function drawInvoiceAndPatientInfo(doc, invoice, patient, customization, t, language) {
  const y = doc.y + 20; // Add spacing
  const leftCol = MARGIN;
  const rightCol = 370; // Pushed further right, almost to the edge
  const dateLocale = language === 'fr' ? 'fr-FR' : 'en-US';

  // LEFT COLUMN: Patient info
  doc.fontSize(11).fillColor('#3498db').font('Helvetica-Bold');
  doc.text(t.billTo, leftCol, y);

  doc.fontSize(10).fillColor('#000').font('Helvetica');
  doc.text(`${patient.first_name} ${patient.last_name}`, leftCol, y + 18);
  if (patient.email) doc.text(patient.email, leftCol, y + 32);
  if (patient.phone) doc.text(patient.phone, leftCol, y + 46);

  // RIGHT COLUMN: Invoice details
  doc.fontSize(10).fillColor('#333').font('Helvetica');
  doc.text(`${t.invoiceNumber} ${invoice.invoice_number}`, rightCol, y);
  doc.text(`${t.date} ${new Date(invoice.invoice_date).toLocaleDateString(dateLocale)}`, rightCol, y + 14);
  doc.text(`${t.dueDate} ${new Date(invoice.due_date).toLocaleDateString(dateLocale)}`, rightCol, y + 28);

  // Translate status
  const translatedStatus = t[invoice.status] || invoice.status;
  doc.fontSize(11).fillColor('#e74c3c').font('Helvetica-Bold');
  doc.text(`${t.status} ${translatedStatus}`, rightCol, y + 46);

  doc.y = y + 80; // Increased spacing
}

/**
 * Draw line items table
 */
function drawLineItems(doc, items, customization, t) {
  const primaryColor = customization.primary_color || '#3498db';
  const y = doc.y + 15; // Add spacing
  const width = PAGE_WIDTH - (MARGIN * 2);

  // Table header
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#ffffff')
     .rect(MARGIN, y, width, 22)
     .fill(primaryColor);

  doc.fillColor('#ffffff')
     .text(t.description, MARGIN + 5, y + 7)
     .text(t.quantity, MARGIN + width - 170, y + 7, { width: 40, align: 'right' })
     .text(t.unitPrice, MARGIN + width - 120, y + 7, { width: 60, align: 'right' })
     .text(t.total, MARGIN + width - 50, y + 7, { width: 45, align: 'right' });

  // Table rows
  let rowY = y + 25;
  doc.font('Helvetica').fillColor('#000').fontSize(10);

  items.forEach((item, index) => {
    const quantity = parseFloat(item.quantity) || 1;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const lineTotal = quantity * unitPrice;

    if (index % 2 === 1) {
      doc.rect(MARGIN, rowY - 2, width, 22).fillAndStroke('#f5f5f5', '#f5f5f5');
    }

    doc.fillColor('#000')
       .text(item.item_name || item.description, MARGIN + 5, rowY, { width: 300 });
    doc.text(quantity.toFixed(0), MARGIN + width - 170, rowY, { width: 40, align: 'right' });
    doc.text(`€${unitPrice.toFixed(2)}`, MARGIN + width - 120, rowY, { width: 60, align: 'right' });
    doc.text(`€${lineTotal.toFixed(2)}`, MARGIN + width - 50, rowY, { width: 45, align: 'right' });

    rowY += 22;
  });

  doc.y = rowY + 10;
}

/**
 * Draw totals
 */
function drawTotals(doc, invoice, customization, t) {
  const y = doc.y + 10;
  const width = PAGE_WIDTH - (MARGIN * 2);

  doc.fontSize(10).font('Helvetica').fillColor('#000');
  doc.text(t.subtotal, MARGIN + width - 160, y, { width: 100, align: 'right' });
  doc.text(`€${parseFloat(invoice.amount_total).toFixed(2)}`, MARGIN + width - 50, y, { width: 45, align: 'right' });

  if (invoice.amount_paid > 0) {
    doc.text(t.paid, MARGIN + width - 160, y + 16, { width: 100, align: 'right' });
    doc.text(`-€${parseFloat(invoice.amount_paid).toFixed(2)}`, MARGIN + width - 50, y + 16, { width: 45, align: 'right' });
  }

  const totalDue = parseFloat(invoice.amount_total) - parseFloat(invoice.amount_paid || 0);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#3498db');
  doc.text(t.totalDue, MARGIN + width - 160, y + 36, { width: 100, align: 'right' });
  doc.text(`€${totalDue.toFixed(2)}`, MARGIN + width - 50, y + 36, { width: 45, align: 'right' });

  doc.y = y + 60;
}

/**
 * Draw signature - positioned after totals
 * Text (name, title) appears ABOVE the signature image
 */
function drawSignature(doc, customization) {
  if (!customization.signature_file_path && !customization.signature_name) return;

  const signatureY = doc.y + 30; // Space after totals
  const signatureX = PAGE_WIDTH - MARGIN - 120; // Right side positioning
  let currentY = signatureY;

  // Name and title ABOVE signature image
  if (customization.signature_name) {
    doc.fontSize(8).fillColor('#000').font('Helvetica');
    doc.text(customization.signature_name, signatureX, currentY, { width: 120, align: 'right' });
    currentY += 10;
  }
  if (customization.signature_title) {
    doc.fontSize(7).fillColor('#666').font('Helvetica');
    doc.text(customization.signature_title, signatureX, currentY, { width: 120, align: 'right' });
    currentY += 12;
  }

  // Signature image BELOW text
  if (customization.signature_file_path) {
    try {
      const signaturePath = path.join(getUploadsBasePath(), customization.signature_file_path);
      console.log('✍️ Signature path:', signaturePath, '- exists:', fs.existsSync(signaturePath));
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, signatureX + 10, currentY, { width: 100, height: 30 });
        currentY += 32;
      }
    } catch (err) {
      console.error('Error loading signature:', err);
    }
  }

  doc.y = currentY + 10;
}

/**
 * Draw footer - FIXED at bottom of A4 page
 * Displays footer text at the very bottom
 */
function drawFooter(doc, customization) {
  if (!customization.show_footer) return;

  const width = PAGE_WIDTH - (MARGIN * 2);

  // Footer text at the very bottom of the page
  if (customization.footer_text) {
    doc.fontSize(7).fillColor('#666').font('Helvetica');
    doc.text(customization.footer_text, MARGIN, PAGE_HEIGHT - MARGIN - 15, {
      align: 'center',
      width: width
    });
  }
}

module.exports = {
  generateInvoicePDF
};
