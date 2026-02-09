/**
 * Consultation Guide PDF Service
 * Generates styled A4 guide PDFs using PDFKit
 * Solarpunk-inspired color palette with vector illustrations
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
  infoBoxBg: '#FFF8ED',     // Warm cream for info boxes
  noteBoxBg: '#E8F5E9',     // Light green for note boxes
  noteBoxBar: '#2D6A4F',    // Dark green accent bar
};

// Section heading icon types based on heading text
const SECTION_ICON_MAP = {
  'privilégier': 'checkmark',
  'protecteurs': 'checkmark',
  'bien tolérés': 'checkmark',
  'redécouvrir': 'checkmark',
  'sources de protéines': 'checkmark',
  'limiter': 'xcircle',
  'éviter': 'xcircle',
  'impérativement': 'xcircle',
  'conseil': 'lightbulb',
  'transition': 'lightbulb',
  'pratique': 'lightbulb',
  'maintenir': 'lightbulb',
  'journée type': 'forkknife',
  'exemple': 'forkknife',
  'note professionnelle': 'note',
  'introduction': 'stethoscope',
  'fodmap': 'stethoscope',
  'principes': 'stethoscope',
  'bases': 'stethoscope',
  'répartition': 'forkknife',
  'intolérance': 'stethoscope',
  'sensibilité': 'stethoscope',
  'autres intolérances': 'stethoscope',
  'nutriments': 'stethoscope',
  'méditerranéen': 'stethoscope',
  'sopk': 'stethoscope',
  'endométriose': 'stethoscope',
  'alimentaires pour le': 'stethoscope',
  'communs': 'checkmark',
};

/**
 * Determine the section icon based on heading text
 */
function getSectionIcon(heading) {
  const lower = heading.toLowerCase();
  for (const [keyword, icon] of Object.entries(SECTION_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return null;
}

// ─── Vector Icon Drawing Functions ──────────────────────────────

/**
 * Draw a leaf icon (ménopause)
 */
function drawLeafIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Leaf shape
  doc.path(`M${20*s},${4*s} C${8*s},${8*s} ${2*s},${20*s} ${8*s},${32*s} C${14*s},${38*s} ${20*s},${38*s} ${20*s},${38*s} C${20*s},${38*s} ${26*s},${38*s} ${32*s},${32*s} C${38*s},${20*s} ${32*s},${8*s} ${20*s},${4*s}`)
     .fill(COLORS.secondary);
  // Vein
  doc.moveTo(20*s, 10*s).lineTo(20*s, 34*s).lineWidth(1.5*s).strokeColor(COLORS.primary).stroke();
  doc.moveTo(20*s, 18*s).lineTo(13*s, 24*s).lineWidth(1*s).stroke();
  doc.moveTo(20*s, 22*s).lineTo(27*s, 28*s).lineWidth(1*s).stroke();
  doc.restore();
}

/**
 * Draw a scale icon (perte de poids)
 */
function drawScaleIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Base
  doc.roundedRect(8*s, 10*s, 24*s, 22*s, 3*s).fill(COLORS.secondary);
  // Display
  doc.roundedRect(13*s, 14*s, 14*s, 10*s, 2*s).fill(COLORS.white);
  // Needle
  doc.moveTo(20*s, 19*s).lineTo(23*s, 16*s).lineWidth(1.5*s).strokeColor(COLORS.primary).stroke();
  // Dot
  doc.circle(20*s, 19*s, 1.5*s).fill(COLORS.primary);
  // Scale marks
  doc.moveTo(15*s, 22*s).lineTo(25*s, 22*s).lineWidth(0.5*s).strokeColor(COLORS.muted).stroke();
  doc.restore();
}

/**
 * Draw an apple icon (rééquilibrage)
 */
function drawAppleIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Apple body
  doc.path(`M${20*s},${12*s} C${12*s},${12*s} ${6*s},${18*s} ${6*s},${26*s} C${6*s},${34*s} ${12*s},${38*s} ${20*s},${38*s} C${28*s},${38*s} ${34*s},${34*s} ${34*s},${26*s} C${34*s},${18*s} ${28*s},${12*s} ${20*s},${12*s}`)
     .fill(COLORS.accent);
  // Stem
  doc.moveTo(20*s, 12*s).lineTo(20*s, 6*s).lineWidth(2*s).strokeColor(COLORS.accentDark).stroke();
  // Leaf on stem
  doc.path(`M${20*s},${8*s} C${23*s},${5*s} ${28*s},${5*s} ${26*s},${9*s} C${24*s},${11*s} ${21*s},${10*s} ${20*s},${8*s}`)
     .fill(COLORS.secondary);
  doc.restore();
}

/**
 * Draw a stomach icon (SII)
 */
function drawStomachIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Stomach shape
  doc.path(`M${16*s},${6*s} L${16*s},${12*s} C${10*s},${14*s} ${6*s},${20*s} ${8*s},${28*s} C${10*s},${34*s} ${18*s},${36*s} ${22*s},${32*s} C${26*s},${28*s} ${32*s},${26*s} ${32*s},${20*s} C${32*s},${14*s} ${28*s},${12*s} ${24*s},${12*s} L${24*s},${6*s}`)
     .lineWidth(2.5*s).strokeColor(COLORS.secondary).fillAndStroke(COLORS.light, COLORS.secondary);
  doc.restore();
}

/**
 * Draw a flower icon (pathologies féminines)
 */
function drawFlowerIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  // Petals
  const petals = 6;
  const petalR = 8 * s;
  const petalDist = 10 * s;
  for (let i = 0; i < petals; i++) {
    const angle = (i * 2 * Math.PI) / petals;
    const px = cx + Math.cos(angle) * petalDist;
    const py = cy + Math.sin(angle) * petalDist;
    doc.circle(px, py, petalR).fill(i % 2 === 0 ? COLORS.accent : COLORS.lightAccent);
  }
  // Center
  doc.circle(cx, cy, 6 * s).fill(COLORS.secondary);
  doc.circle(cx, cy, 3 * s).fill(COLORS.primary);
  doc.restore();
}

/**
 * Draw a plant/sprout icon (végétaliser)
 */
function drawPlantIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Pot
  doc.path(`M${12*s},${28*s} L${14*s},${36*s} L${26*s},${36*s} L${28*s},${28*s} Z`).fill(COLORS.accent);
  doc.rect(10*s, 26*s, 20*s, 3*s).fill(COLORS.accentDark);
  // Stem
  doc.moveTo(20*s, 26*s).lineTo(20*s, 14*s).lineWidth(2*s).strokeColor(COLORS.primary).stroke();
  // Left leaf
  doc.path(`M${20*s},${18*s} C${14*s},${14*s} ${10*s},${10*s} ${12*s},${16*s} C${14*s},${20*s} ${18*s},${20*s} ${20*s},${18*s}`)
     .fill(COLORS.secondary);
  // Right leaf
  doc.path(`M${20*s},${14*s} C${26*s},${10*s} ${30*s},${6*s} ${28*s},${12*s} C${26*s},${16*s} ${22*s},${16*s} ${20*s},${14*s}`)
     .fill(COLORS.secondary);
  doc.restore();
}

/**
 * Draw a heart icon (cardiovasculaire)
 */
function drawHeartIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 18 * s);
  doc.path(`M${20*s},${36*s} C${8*s},${26*s} ${2*s},${18*s} ${2*s},${14*s} C${2*s},${8*s} ${7*s},${4*s} ${12*s},${4*s} C${16*s},${4*s} ${19*s},${7*s} ${20*s},${10*s} C${21*s},${7*s} ${24*s},${4*s} ${28*s},${4*s} C${33*s},${4*s} ${38*s},${8*s} ${38*s},${14*s} C${38*s},${18*s} ${32*s},${26*s} ${20*s},${36*s}`)
     .fill(COLORS.accent);
  // Heartbeat line
  doc.moveTo(8*s, 18*s).lineTo(14*s, 18*s).lineTo(16*s, 12*s).lineTo(19*s, 24*s).lineTo(22*s, 14*s).lineTo(24*s, 18*s).lineTo(32*s, 18*s)
     .lineWidth(1.5*s).strokeColor(COLORS.white).stroke();
  doc.restore();
}

/**
 * Draw a wheat icon (intolérances)
 */
function drawWheatIcon(doc, cx, cy, size) {
  const s = size / 40;
  doc.save();
  doc.translate(cx - 20 * s, cy - 20 * s);
  // Stem
  doc.moveTo(20*s, 38*s).lineTo(20*s, 8*s).lineWidth(2*s).strokeColor(COLORS.accentDark).stroke();
  // Grains (pairs going up)
  const grainPairs = [
    [28, 12], [26, 16], [24, 20], [22, 24],
    [12, 12], [14, 16], [16, 20], [18, 24],
  ];
  grainPairs.forEach(([gx, gy]) => {
    doc.ellipse(gx*s, gy*s, 4*s, 2.2*s).fill(COLORS.accent);
  });
  // Top grain
  doc.ellipse(20*s, 8*s, 2.5*s, 4*s).fill(COLORS.accent);
  doc.restore();
}

// ─── Small Inline Icons for Section Headings ───────────────────

/**
 * Draw small checkmark icon
 */
function drawCheckmarkIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill(COLORS.secondary);
  doc.moveTo(x + size*0.25, y + size*0.5)
     .lineTo(x + size*0.45, y + size*0.7)
     .lineTo(x + size*0.75, y + size*0.3)
     .lineWidth(1.5).strokeColor(COLORS.white).stroke();
  doc.restore();
}

/**
 * Draw small X-circle icon
 */
function drawXCircleIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill('#E57373');
  doc.moveTo(x + size*0.3, y + size*0.3)
     .lineTo(x + size*0.7, y + size*0.7)
     .lineWidth(1.5).strokeColor(COLORS.white).stroke();
  doc.moveTo(x + size*0.7, y + size*0.3)
     .lineTo(x + size*0.3, y + size*0.7)
     .lineWidth(1.5).strokeColor(COLORS.white).stroke();
  doc.restore();
}

/**
 * Draw small lightbulb icon
 */
function drawLightbulbIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill(COLORS.accent);
  // Bulb shape (simplified)
  doc.circle(x + size/2, y + size*0.38, size*0.22).fill(COLORS.white);
  doc.rect(x + size*0.38, y + size*0.55, size*0.24, size*0.15).fill(COLORS.white);
  doc.restore();
}

/**
 * Draw small fork-knife icon
 */
function drawForkKnifeIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill(COLORS.accentDark);
  // Fork (3 tines)
  doc.moveTo(x + size*0.32, y + size*0.2).lineTo(x + size*0.32, y + size*0.5).lineWidth(1).strokeColor(COLORS.white).stroke();
  doc.moveTo(x + size*0.40, y + size*0.2).lineTo(x + size*0.40, y + size*0.5).lineWidth(1).strokeColor(COLORS.white).stroke();
  doc.moveTo(x + size*0.36, y + size*0.5).lineTo(x + size*0.36, y + size*0.8).lineWidth(1.2).strokeColor(COLORS.white).stroke();
  // Knife
  doc.moveTo(x + size*0.6, y + size*0.2).lineTo(x + size*0.66, y + size*0.5).lineTo(x + size*0.6, y + size*0.5).fill(COLORS.white);
  doc.moveTo(x + size*0.63, y + size*0.5).lineTo(x + size*0.63, y + size*0.8).lineWidth(1.2).strokeColor(COLORS.white).stroke();
  doc.restore();
}

/**
 * Draw small stethoscope/medical icon
 */
function drawStethoscopeIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill(COLORS.primary);
  // Cross shape
  doc.rect(x + size*0.38, y + size*0.22, size*0.24, size*0.56).fill(COLORS.white);
  doc.rect(x + size*0.22, y + size*0.38, size*0.56, size*0.24).fill(COLORS.white);
  doc.restore();
}

/**
 * Draw small note/document icon
 */
function drawNoteIcon(doc, x, y, size) {
  doc.save();
  doc.circle(x + size/2, y + size/2, size/2).fill(COLORS.primary);
  // Document shape
  doc.roundedRect(x + size*0.28, y + size*0.2, size*0.44, size*0.6, 1).fill(COLORS.white);
  // Lines
  doc.moveTo(x + size*0.35, y + size*0.38).lineTo(x + size*0.65, y + size*0.38).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
  doc.moveTo(x + size*0.35, y + size*0.5).lineTo(x + size*0.65, y + size*0.5).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
  doc.moveTo(x + size*0.35, y + size*0.62).lineTo(x + size*0.55, y + size*0.62).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
  doc.restore();
}

/**
 * Draw the appropriate section icon
 */
function drawSectionIcon(doc, iconType, x, y, size) {
  switch (iconType) {
    case 'checkmark': drawCheckmarkIcon(doc, x, y, size); break;
    case 'xcircle': drawXCircleIcon(doc, x, y, size); break;
    case 'lightbulb': drawLightbulbIcon(doc, x, y, size); break;
    case 'forkknife': drawForkKnifeIcon(doc, x, y, size); break;
    case 'stethoscope': drawStethoscopeIcon(doc, x, y, size); break;
    case 'note': drawNoteIcon(doc, x, y, size); break;
  }
}

// ─── Cover Icon Dispatcher ─────────────────────────────────────

function drawCoverIcon(doc, iconType, cx, cy, size) {
  switch (iconType) {
    case 'leaf': drawLeafIcon(doc, cx, cy, size); break;
    case 'scale': drawScaleIcon(doc, cx, cy, size); break;
    case 'apple': drawAppleIcon(doc, cx, cy, size); break;
    case 'stomach': drawStomachIcon(doc, cx, cy, size); break;
    case 'flower': drawFlowerIcon(doc, cx, cy, size); break;
    case 'plant': drawPlantIcon(doc, cx, cy, size); break;
    case 'heart': drawHeartIcon(doc, cx, cy, size); break;
    case 'wheat': drawWheatIcon(doc, cx, cy, size); break;
    default: drawLeafIcon(doc, cx, cy, size); break;
  }
}

// ─── Page Decorations ──────────────────────────────────────────

/**
 * Draw a subtle leaf motif in the bottom-right corner
 */
function drawCornerLeaf(doc) {
  const x = PAGE_WIDTH - MARGIN - 5;
  const y = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT - 5;
  doc.save();
  doc.opacity(0.12);
  // Small decorative leaf
  doc.path(`M${x},${y} C${x-8},${y-12} ${x-18},${y-14} ${x-12},${y-4} C${x-6},${y+2} ${x-2},${y+1} ${x},${y}`)
     .fill(COLORS.secondary);
  doc.path(`M${x},${y} C${x-4},${y-8} ${x-12},${y-18} ${x-16},${y-10} C${x-14},${y-2} ${x-4},${y+2} ${x},${y}`)
     .fill(COLORS.primary);
  doc.opacity(1);
  doc.restore();
}

/**
 * Draw an organic leaf-shaped divider between sections
 */
function drawOrganicDivider(doc, y) {
  const midX = PAGE_WIDTH / 2;
  doc.save();
  doc.opacity(0.4);
  // Center small leaf
  doc.path(`M${midX},${y-3} C${midX-6},${y-6} ${midX-10},${y-2} ${midX-6},${y+1} C${midX-2},${y+3} ${midX},${y+2} ${midX},${y-3}`)
     .fill(COLORS.secondary);
  doc.path(`M${midX},${y-3} C${midX+6},${y-6} ${midX+10},${y-2} ${midX+6},${y+1} C${midX+2},${y+3} ${midX},${y+2} ${midX},${y-3}`)
     .fill(COLORS.secondary);
  // Lines on either side
  doc.opacity(0.3);
  doc.moveTo(midX - 50, y).lineTo(midX - 14, y).lineWidth(0.8).strokeColor(COLORS.divider).stroke();
  doc.moveTo(midX + 14, y).lineTo(midX + 50, y).lineWidth(0.8).strokeColor(COLORS.divider).stroke();
  doc.opacity(1);
  doc.restore();
}

// ─── Info Box Drawing ──────────────────────────────────────────

/**
 * Draw a colored info box (for "journée type")
 */
function drawInfoBox(doc, text, y, width) {
  const padding = 12;
  const textWidth = width - padding * 2;

  // Measure text height
  const textHeight = doc.fontSize(10).font('Helvetica').heightOfString(text, { width: textWidth, lineGap: 3 });
  const boxHeight = textHeight + padding * 2;

  ensureSpace(doc, boxHeight + 10);
  const boxY = doc.y;

  // Cream background rounded rect
  doc.roundedRect(MARGIN, boxY, width, boxHeight, 6).fill(COLORS.infoBoxBg);

  // Subtle left accent
  doc.roundedRect(MARGIN, boxY, 4, boxHeight, 2).fill(COLORS.accent);

  // Text content
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor(COLORS.body)
     .text(text, MARGIN + padding + 4, boxY + padding, {
       width: textWidth - 4,
       lineGap: 3
     });

  doc.y = boxY + boxHeight + 6;
}

/**
 * Draw a "note professionnelle" box
 */
function drawNoteBox(doc, text, y, width) {
  const padding = 12;
  const textWidth = width - padding * 2 - 8;

  const textHeight = doc.fontSize(10).font('Helvetica-Oblique').heightOfString(text, { width: textWidth, lineGap: 3 });
  const boxHeight = textHeight + padding * 2;

  ensureSpace(doc, boxHeight + 10);
  const boxY = doc.y;

  // Light green background
  doc.roundedRect(MARGIN, boxY, width, boxHeight, 6).fill(COLORS.noteBoxBg);

  // Dark green left accent bar
  doc.roundedRect(MARGIN, boxY, 5, boxHeight, 2).fill(COLORS.noteBoxBar);

  // Text in italic
  doc.fontSize(10)
     .font('Helvetica-Oblique')
     .fillColor(COLORS.heading)
     .text(text, MARGIN + padding + 8, boxY + padding, {
       width: textWidth,
       lineGap: 3
     });

  doc.y = boxY + boxHeight + 6;
}

// ─── Main PDF Generation ───────────────────────────────────────

/**
 * Generate a consultation guide PDF
 * @param {Object} guideContent - Guide content object with title, subtitle, icon, sections
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

      // Draw cover / title area
      drawTitlePage(doc, guideContent);

      // Draw each section
      guideContent.sections.forEach((section, index) => {
        const isLastSection = index === guideContent.sections.length - 1;
        drawSection(doc, section, isLastSection);
      });

      // Add footers and decorations to all pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i + 1, totalPages);
        drawCornerLeaf(doc);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if we need a new page, add one if so
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

  // Title background area (taller to accommodate icon)
  const titleAreaHeight = 160;
  doc.rect(MARGIN - 10, 30, CONTENT_WIDTH + 20, titleAreaHeight)
     .fill(COLORS.light);

  // Left accent bar on title area
  doc.rect(MARGIN - 10, 30, 5, titleAreaHeight).fill(COLORS.primary);

  // Draw cover icon on the right side
  if (guide.icon) {
    const iconSize = 60;
    const iconX = PAGE_WIDTH - MARGIN - iconSize / 2 - 10;
    const iconY = 30 + titleAreaHeight / 2;
    drawCoverIcon(doc, guide.icon, iconX, iconY, iconSize);
  }

  // Title (with room for icon on right)
  const titleWidth = guide.icon ? CONTENT_WIDTH - 90 : CONTENT_WIDTH - 20;
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor(COLORS.heading)
     .text(guide.title, MARGIN + 10, 50, {
       width: titleWidth,
       lineGap: 4
     });

  // Subtitle
  doc.fontSize(13)
     .font('Helvetica')
     .fillColor(COLORS.primary)
     .text(guide.subtitle, MARGIN + 10, doc.y + 8, {
       width: titleWidth
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

  // Small decorative leaf after divider
  doc.save();
  doc.opacity(0.3);
  doc.path(`M${MARGIN + 96},${dividerY} C${MARGIN + 100},${dividerY - 5} ${MARGIN + 106},${dividerY - 3} ${MARGIN + 104},${dividerY + 1} C${MARGIN + 102},${dividerY + 3} ${MARGIN + 98},${dividerY + 2} ${MARGIN + 96},${dividerY}`)
     .fill(COLORS.secondary);
  doc.opacity(1);
  doc.restore();

  doc.y = dividerY + 20;
}

/**
 * Determine if a section is "journée type" or "note professionnelle"
 */
function getSectionType(heading) {
  const lower = heading.toLowerCase();
  if (lower.includes('journée type') || lower.includes('exemple de')) return 'infobox';
  if (lower.includes('note professionnelle')) return 'notebox';
  return 'normal';
}

/**
 * Draw a section (heading + body or items)
 */
function drawSection(doc, section, isLastSection) {
  // Estimate space needed for heading
  ensureSpace(doc, 60);

  const sectionStartY = doc.y;
  const sectionType = getSectionType(section.heading);
  const iconType = getSectionIcon(section.heading);

  // Section heading with colored background
  const headingHeight = 28;
  const iconSize = 18;
  const hasIcon = !!iconType;
  const iconPadding = hasIcon ? iconSize + 8 : 0;

  doc.rect(MARGIN, sectionStartY, CONTENT_WIDTH, headingHeight)
     .fill(COLORS.primary);

  // Draw section heading icon inside the heading bar
  if (hasIcon) {
    drawSectionIcon(doc, iconType, MARGIN + 8, sectionStartY + (headingHeight - iconSize) / 2, iconSize);
  }

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor(COLORS.white)
     .text(section.heading.toUpperCase(), MARGIN + 12 + iconPadding, sectionStartY + 8, {
       width: CONTENT_WIDTH - 24 - iconPadding
     });

  doc.y = sectionStartY + headingHeight + 12;

  // Draw body text or bullet items (with special boxes for certain sections)
  if (section.body) {
    if (sectionType === 'infobox') {
      drawInfoBox(doc, section.body, doc.y, CONTENT_WIDTH);
    } else if (sectionType === 'notebox') {
      drawNoteBox(doc, section.body, doc.y, CONTENT_WIDTH);
    } else {
      drawBodyText(doc, section.body);
    }
  }

  if (section.items) {
    drawBulletList(doc, section.items);
  }

  // Add spacing after section (unless last)
  if (!isLastSection) {
    doc.y += 10;

    // Organic leaf divider between sections
    ensureSpace(doc, 15);
    drawOrganicDivider(doc, doc.y);
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
