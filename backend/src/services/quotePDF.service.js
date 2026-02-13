/**
 * Quote PDF Service
 * Generates customized quote/estimate PDFs using pdfkit.
 * Adapted from invoicePDF.service.js for quote-specific layout.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../../../models');
const invoiceCustomizationService = require('./invoiceCustomization.service');
const { formatDate } = require('../utils/timezone');

const getUploadsBasePath = () => {
  if (process.env.NODE_ENV === 'production') return '/app';
  return process.cwd();
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

const translations = {
  fr: {
    quote: 'DEVIS',
    clientLabel: 'CLIENT :',
    quoteNumber: 'Devis N° :',
    date: 'Date :',
    validUntil: 'Valable jusqu\'au :',
    status: 'Statut :',
    description: 'Description',
    quantity: 'Qté',
    unitPrice: 'Prix unit.',
    total: 'Total',
    subtotalHT: 'Sous-total HT :',
    tva: 'TVA ({rate}%) :',
    totalTTC: 'Total TTC :',
    acceptanceTitle: 'Bon pour accord',
    acceptanceLine: 'Date et signature du client :',
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    DECLINED: 'Refusé',
    EXPIRED: 'Expiré'
  },
  en: {
    quote: 'QUOTE',
    clientLabel: 'CLIENT:',
    quoteNumber: 'Quote #:',
    date: 'Date:',
    validUntil: 'Valid Until:',
    status: 'Status:',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotalHT: 'Subtotal (excl. tax):',
    tva: 'Tax ({rate}%):',
    totalTTC: 'Total (incl. tax):',
    acceptanceTitle: 'Acceptance',
    acceptanceLine: 'Date and client signature:',
    DRAFT: 'Draft',
    SENT: 'Sent',
    ACCEPTED: 'Accepted',
    DECLINED: 'Declined',
    EXPIRED: 'Expired'
  }
};

const getTranslations = (lang = 'fr') => translations[lang] || translations.fr;

/**
 * Generate quote PDF
 * @param {string} quoteId
 * @param {string} userId - For customization
 * @param {string} language - 'fr' or 'en'
 */
const generateQuotePDF = async (quoteId, userId, language = 'fr') => {
  const quote = await db.Quote.findByPk(quoteId, {
    include: [
      {
        model: db.Client, as: 'client',
        attributes: ['id', 'client_type', 'company_name', 'first_name', 'last_name', 'email', 'phone',
          'address_line1', 'address_line2', 'city', 'postal_code', 'country', 'siret', 'vat_number', 'contact_person']
      },
      {
        model: db.QuoteItem, as: 'items',
        order: [['sort_order', 'ASC']]
      }
    ],
    order: [[{ model: db.QuoteItem, as: 'items' }, 'sort_order', 'ASC']]
  });

  if (!quote) throw new Error('Quote not found');

  const customization = await invoiceCustomizationService.getCustomizationForInvoice(userId);
  const t = getTranslations(language);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    autoFirstPage: false
  });

  doc.addPage();

  drawHeader(doc, customization, t);
  drawQuoteAndClientInfo(doc, quote, quote.client, customization, t, language);
  drawLineItems(doc, quote.items || [], customization, t);
  drawTotals(doc, quote, customization, t);
  drawAcceptanceBlock(doc, t);
  drawSignature(doc, customization);
  drawFooter(doc, customization);

  doc.end();
  return doc;
};

function drawHeader(doc, customization, t) {
  const primaryColor = customization.primary_color || '#3498db';
  let y = MARGIN;
  let logoBottomY = y;

  if (customization.show_logo && customization.logo_file_path) {
    try {
      const logoPath = path.join(getUploadsBasePath(), customization.logo_file_path);
      if (fs.existsSync(logoPath)) {
        const logoWidth = customization.logo_width || 150;
        const logoHeight = customization.logo_height || 80;
        doc.image(logoPath, MARGIN, y, { fit: [logoWidth, logoHeight] });
        logoBottomY = y + logoHeight;
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  }

  const titleY = logoBottomY + 10;
  doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold').text(t.quote, MARGIN, titleY);

  if (customization.show_contact_info) {
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    let contactY = y;
    const contactX = 320;

    if (customization.business_name) { doc.text(customization.business_name, contactX, contactY, { align: 'right', width: 225 }); contactY += 11; }
    if (customization.address_line1) { doc.text(customization.address_line1, contactX, contactY, { align: 'right', width: 225 }); contactY += 11; }
    if (customization.city || customization.postal_code) { doc.text([customization.postal_code, customization.city].filter(Boolean).join(' '), contactX, contactY, { align: 'right', width: 225 }); contactY += 11; }
    if (customization.phone) { doc.text(customization.phone, contactX, contactY, { align: 'right', width: 225 }); contactY += 11; }
    if (customization.email) { doc.text(customization.email, contactX, contactY, { align: 'right', width: 225 }); contactY += 11; }
    if (customization.misc_info) { contactY += 11; doc.text(customization.misc_info, contactX, contactY, { align: 'right', width: 225 }); }
  }

  doc.y = (logoBottomY + 10) + 35;
}

function drawQuoteAndClientInfo(doc, quote, client, customization, t, language) {
  const y = doc.y + 20;
  const leftCol = MARGIN;
  const rightCol = 370;

  // Left: client info
  doc.fontSize(11).fillColor('#3498db').font('Helvetica-Bold');
  doc.text(t.clientLabel, leftCol, y);

  doc.fontSize(10).fillColor('#000').font('Helvetica');
  let clientY = y + 18;

  const clientName = client.client_type === 'company'
    ? client.company_name
    : `${client.first_name} ${client.last_name}`;
  doc.text(clientName, leftCol, clientY); clientY += 14;

  if (client.client_type === 'company' && client.contact_person) {
    doc.text(client.contact_person, leftCol, clientY); clientY += 14;
  }
  if (client.address_line1) { doc.text(client.address_line1, leftCol, clientY); clientY += 14; }
  if (client.address_line2) { doc.text(client.address_line2, leftCol, clientY); clientY += 14; }
  if (client.postal_code || client.city) {
    doc.text([client.postal_code, client.city].filter(Boolean).join(' '), leftCol, clientY); clientY += 14;
  }
  if (client.email) { doc.text(client.email, leftCol, clientY); clientY += 14; }
  if (client.siret) { doc.fontSize(8).text(`SIRET: ${client.siret}`, leftCol, clientY); clientY += 12; }
  if (client.vat_number) { doc.fontSize(8).text(`TVA: ${client.vat_number}`, leftCol, clientY); clientY += 12; }

  // Right: quote details
  doc.fontSize(10).fillColor('#333').font('Helvetica');
  doc.text(`${t.quoteNumber} ${quote.quote_number}`, rightCol, y);
  doc.text(`${t.date} ${formatDate(quote.quote_date, language)}`, rightCol, y + 14);
  doc.text(`${t.validUntil} ${formatDate(quote.validity_date, language)}`, rightCol, y + 28);

  if (quote.subject) {
    doc.fontSize(9).fillColor('#555').font('Helvetica-Oblique');
    doc.text(quote.subject, rightCol, y + 46, { width: 175 });
  }

  const translatedStatus = t[quote.status] || quote.status;
  const statusColor = { DRAFT: '#888', SENT: '#3498db', ACCEPTED: '#27ae60', DECLINED: '#e74c3c', EXPIRED: '#e67e22' };
  doc.fontSize(11).fillColor(statusColor[quote.status] || '#333').font('Helvetica-Bold');
  doc.text(`${t.status} ${translatedStatus}`, rightCol, y + 64);

  doc.y = Math.max(clientY, y + 80) + 10;
}

function drawLineItems(doc, items, customization, t) {
  const primaryColor = customization.primary_color || '#3498db';
  const y = doc.y + 15;
  const width = PAGE_WIDTH - (MARGIN * 2);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
    .rect(MARGIN, y, width, 22).fill(primaryColor);

  doc.fillColor('#ffffff')
    .text(t.description, MARGIN + 5, y + 7)
    .text(t.quantity, MARGIN + width - 170, y + 7, { width: 40, align: 'right' })
    .text(t.unitPrice, MARGIN + width - 120, y + 7, { width: 60, align: 'right' })
    .text(t.total, MARGIN + width - 50, y + 7, { width: 45, align: 'right' });

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

    if (item.description && item.item_name) {
      doc.fontSize(8).fillColor('#666').text(item.description, MARGIN + 5, rowY + 12, { width: 300 });
      doc.fontSize(10).fillColor('#000');
    }

    doc.text(quantity.toFixed(quantity % 1 === 0 ? 0 : 2), MARGIN + width - 170, rowY, { width: 40, align: 'right' });
    doc.text(`€${unitPrice.toFixed(2)}`, MARGIN + width - 120, rowY, { width: 60, align: 'right' });
    doc.text(`€${lineTotal.toFixed(2)}`, MARGIN + width - 50, rowY, { width: 45, align: 'right' });

    rowY += (item.description && item.item_name) ? 30 : 22;
  });

  doc.y = rowY + 10;
}

function drawTotals(doc, quote, customization, t) {
  const y = doc.y + 10;
  const width = PAGE_WIDTH - (MARGIN * 2);
  const taxRate = parseFloat(quote.tax_rate) || 0;

  doc.fontSize(10).font('Helvetica').fillColor('#000');
  doc.text(t.subtotalHT, MARGIN + width - 160, y, { width: 100, align: 'right' });
  doc.text(`€${parseFloat(quote.amount_subtotal).toFixed(2)}`, MARGIN + width - 50, y, { width: 45, align: 'right' });

  let offset = 16;
  if (taxRate > 0) {
    const tvaLabel = t.tva.replace('{rate}', taxRate.toFixed(taxRate % 1 === 0 ? 0 : 2));
    doc.text(tvaLabel, MARGIN + width - 160, y + offset, { width: 100, align: 'right' });
    doc.text(`€${parseFloat(quote.amount_tax).toFixed(2)}`, MARGIN + width - 50, y + offset, { width: 45, align: 'right' });
    offset += 16;
  }

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#3498db');
  doc.text(t.totalTTC, MARGIN + width - 160, y + offset + 4, { width: 100, align: 'right' });
  doc.text(`€${parseFloat(quote.amount_total).toFixed(2)}`, MARGIN + width - 50, y + offset + 4, { width: 45, align: 'right' });

  doc.y = y + offset + 30;
}

function drawAcceptanceBlock(doc, t) {
  // Only draw if there's enough space
  if (doc.y > PAGE_HEIGHT - 200) return;

  const y = doc.y + 20;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
  doc.text(t.acceptanceTitle, MARGIN, y);

  doc.fontSize(9).font('Helvetica').fillColor('#666');
  doc.text(t.acceptanceLine, MARGIN, y + 18);

  // Signature line
  doc.moveTo(MARGIN, y + 70).lineTo(MARGIN + 200, y + 70).stroke('#999');

  doc.y = y + 80;
}

function drawSignature(doc, customization) {
  if (!customization.signature_file_path && !customization.signature_name) return;

  const signatureY = doc.y + 10;
  const signatureX = PAGE_WIDTH - MARGIN - 120;
  let currentY = signatureY;

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

  if (customization.signature_file_path) {
    try {
      const signaturePath = path.join(getUploadsBasePath(), customization.signature_file_path);
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

function drawFooter(doc, customization) {
  if (!customization.show_footer || !customization.footer_text) return;

  const width = PAGE_WIDTH - (MARGIN * 2);
  doc.fontSize(7).fillColor('#666').font('Helvetica');
  doc.text(customization.footer_text, MARGIN, PAGE_HEIGHT - MARGIN - 15, {
    align: 'center',
    width: width
  });
}

module.exports = { generateQuotePDF };
