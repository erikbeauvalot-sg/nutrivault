/**
 * Consultation Guide PDF Service
 * Generates styled A4 guide PDFs using PDFKit
 * Solarpunk-inspired color palette
 */

const PDFDocument = require('pdfkit');

// A4 page dimensions
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
const FOOTER_HEIGHT = 40;
const USABLE_BOTTOM = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT;

// Solarpunk color palette
const COLORS = {
  primary: '#2D6A4F',       // Deep forest green
  secondary: '#52B788',     // Vibrant green
  accent: '#D4A373',        // Warm gold/sand
  accentDark: '#B07D4F',    // Deeper gold
  heading: '#1B4332',       // Dark green
  body: '#333333',          // Dark gray for body text
  muted: '#6B7280',         // Muted gray
  light: '#D8F3DC',         // Very light green
  lightAccent: '#FEFAE0',   // Light warm cream
  white: '#FFFFFF',
  divider: '#95D5B2',       // Medium green for lines
  bulletDot: '#D4A373',     // Gold bullet markers
};

/**
 * Generate a consultation guide PDF
 * @param {Object} guideContent - Guide content object with title, subtitle, sections
 * @returns {{ buffer: Buffer, fileName: string }}
 */
const generateGuidePDF = (guideContent) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        autoFirstPage: false,
        bufferPages: true,
        info: {
          Title: guideContent.title,
          Author: 'NutriVault',
          Subject: guideContent.subtitle,
          Creator: 'NutriVault PDF Generator'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const fileName = `guide-${guideContent.slug}.pdf`;
        resolve({ buffer, fileName });
      });
      doc.on('error', reject);

      // Add first page
      doc.addPage();
      let pageCount = 1;

      // Draw cover / title area
      drawTitlePage(doc, guideContent);

      // Draw each section
      guideContent.sections.forEach((section, index) => {
        const isLastSection = index === guideContent.sections.length - 1;
        drawSection(doc, section, isLastSection);
      });

      // Add footers to all pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i + 1, totalPages);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if we need a new page, add one if so
 * Returns current Y position
 */
function ensureSpace(doc, neededHeight) {
  if (doc.y + neededHeight > USABLE_BOTTOM) {
    doc.addPage();
    return MARGIN;
  }
  return doc.y;
}

/**
 * Draw the title/cover area at the top of the first page
 */
function drawTitlePage(doc, guide) {
  // Top decorative bar
  doc.rect(0, 0, PAGE_WIDTH, 8).fill(COLORS.primary);

  // Accent line below
  doc.rect(0, 8, PAGE_WIDTH, 3).fill(COLORS.accent);

  // Title background area
  const titleAreaHeight = 140;
  doc.rect(MARGIN - 10, 30, CONTENT_WIDTH + 20, titleAreaHeight)
     .fill(COLORS.light);

  // Left accent bar on title area
  doc.rect(MARGIN - 10, 30, 5, titleAreaHeight).fill(COLORS.primary);

  // Title
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor(COLORS.heading)
     .text(guide.title, MARGIN + 10, 50, {
       width: CONTENT_WIDTH - 20,
       lineGap: 4
     });

  // Subtitle
  doc.fontSize(13)
     .font('Helvetica')
     .fillColor(COLORS.primary)
     .text(guide.subtitle, MARGIN + 10, doc.y + 8, {
       width: CONTENT_WIDTH - 20
     });

  // Decorative divider line
  const dividerY = 30 + titleAreaHeight + 15;
  doc.moveTo(MARGIN, dividerY)
     .lineTo(MARGIN + 80, dividerY)
     .lineWidth(2)
     .strokeColor(COLORS.accent)
     .stroke();

  doc.moveTo(MARGIN + 85, dividerY)
     .lineTo(MARGIN + 90, dividerY)
     .lineWidth(2)
     .strokeColor(COLORS.secondary)
     .stroke();

  doc.y = dividerY + 20;
}

/**
 * Draw a section (heading + body or items)
 */
function drawSection(doc, section, isLastSection) {
  // Estimate space needed for heading
  ensureSpace(doc, 60);

  const sectionStartY = doc.y;

  // Section heading with colored background
  const headingHeight = 28;
  doc.rect(MARGIN, sectionStartY, CONTENT_WIDTH, headingHeight)
     .fill(COLORS.primary);

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(COLORS.white)
     .text(section.heading.toUpperCase(), MARGIN + 12, sectionStartY + 8, {
       width: CONTENT_WIDTH - 24
     });

  doc.y = sectionStartY + headingHeight + 12;

  // Draw body text or bullet items
  if (section.body) {
    drawBodyText(doc, section.body);
  }

  if (section.items) {
    drawBulletList(doc, section.items);
  }

  // Add spacing after section (unless last)
  if (!isLastSection) {
    doc.y += 10;

    // Small decorative divider between sections
    ensureSpace(doc, 15);
    const midX = PAGE_WIDTH / 2;
    doc.moveTo(midX - 30, doc.y)
       .lineTo(midX + 30, doc.y)
       .lineWidth(1)
       .strokeColor(COLORS.divider)
       .stroke();
    doc.y += 12;
  }
}

/**
 * Draw body text with paragraph support
 */
function drawBodyText(doc, text) {
  const paragraphs = text.split('\n\n');

  paragraphs.forEach((paragraph, i) => {
    ensureSpace(doc, 30);

    // Check for sub-heading pattern (text before colon at start of paragraph)
    const colonIndex = paragraph.indexOf(' : ');
    if (colonIndex > 0 && colonIndex < 30 && paragraph.length > colonIndex + 3) {
      // Bold the label before the colon
      const label = paragraph.substring(0, colonIndex + 3);
      const rest = paragraph.substring(colonIndex + 3);

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(COLORS.accentDark)
         .text(label, MARGIN + 8, doc.y, {
           width: CONTENT_WIDTH - 16,
           continued: true
         });
      doc.font('Helvetica')
         .fillColor(COLORS.body)
         .text(rest, {
           width: CONTENT_WIDTH - 16,
           lineGap: 3
         });
    } else {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(COLORS.body)
         .text(paragraph, MARGIN + 8, doc.y, {
           width: CONTENT_WIDTH - 16,
           lineGap: 3
         });
    }

    if (i < paragraphs.length - 1) {
      doc.y += 8;
    }
  });

  doc.y += 4;
}

/**
 * Draw a bullet list with colored dot markers
 */
function drawBulletList(doc, items) {
  items.forEach((item, index) => {
    ensureSpace(doc, 30);

    const bulletX = MARGIN + 10;
    const textX = MARGIN + 24;
    const textWidth = CONTENT_WIDTH - 34;

    // Draw colored bullet dot
    doc.circle(bulletX + 3, doc.y + 5, 3)
       .fill(index % 2 === 0 ? COLORS.accent : COLORS.secondary);

    // Check for bold prefix (text before first colon)
    const colonIndex = item.indexOf(' : ');
    if (colonIndex > 0 && colonIndex < 60) {
      const label = item.substring(0, colonIndex + 3);
      const rest = item.substring(colonIndex + 3);

      doc.fontSize(9.5)
         .font('Helvetica-Bold')
         .fillColor(COLORS.heading)
         .text(label, textX, doc.y, {
           width: textWidth,
           continued: true
         });
      doc.font('Helvetica')
         .fillColor(COLORS.body)
         .text(rest, {
           width: textWidth,
           lineGap: 2
         });
    } else {
      doc.fontSize(9.5)
         .font('Helvetica')
         .fillColor(COLORS.body)
         .text(item, textX, doc.y, {
           width: textWidth,
           lineGap: 2
         });
    }

    doc.y += 6;
  });
}

/**
 * Draw footer on each page
 */
function drawFooter(doc, pageNumber, totalPages) {
  const y = PAGE_HEIGHT - MARGIN - 10;

  // Thin line above footer
  doc.moveTo(MARGIN, y - 8)
     .lineTo(PAGE_WIDTH - MARGIN, y - 8)
     .lineWidth(0.5)
     .strokeColor(COLORS.divider)
     .stroke();

  // Footer text left
  doc.fontSize(7)
     .font('Helvetica')
     .fillColor(COLORS.muted)
     .text('NutriVault — Guide nutritionnel', MARGIN, y, {
       width: CONTENT_WIDTH / 2,
       align: 'left'
     });

  // Page number right
  doc.fontSize(7)
     .font('Helvetica')
     .fillColor(COLORS.muted)
     .text(`${pageNumber} / ${totalPages}`, PAGE_WIDTH / 2, y, {
       width: CONTENT_WIDTH / 2,
       align: 'right'
     });
}

module.exports = {
  generateGuidePDF
};
