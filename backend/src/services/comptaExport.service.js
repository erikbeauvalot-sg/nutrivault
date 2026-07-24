/**
 * Comptabilité Export Service
 * Generates a clean, formula-driven Excel accounting workbook (one sheet per
 * month + a summary sheet) from live Billing + Expense data, with RBAC scoping.
 *
 * Data always comes from the application database, so the exported file is
 * always up to date. This is the "clean" export (approach A default). A
 * template-faithful mode may be layered on later.
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');
const { yearExpenseWhere, expandRecurringExpenses } = require('../helpers/comptaExpenses');

// Card commission deducted from the amount actually received (SumUp/Weero ~1.75%).
// Overridable via env COMPTA_CARD_COMMISSION_RATE (e.g. 0.0175).
const DEFAULT_CARD_COMMISSION_RATE = parseFloat(process.env.COMPTA_CARD_COMMISSION_RATE || '0.0175');

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// App payment_method (STRING) → French label used in the accounting workbook.
const PAYMENT_METHOD_LABELS = {
  CREDIT_CARD: 'Carte bleue',
  CARD: 'Carte bleue',
  CASH: 'Espèces',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
  TRANSFER: 'Virement'
};

// Colours (Solarpunk-leaning warm palette).
const COLORS = {
  headerBg: 'FF1F5F4E',      // deep green
  headerText: 'FFFFFFFF',
  sectionBg: 'FFE8B923',     // warm gold
  sectionText: 'FF1F2D24',
  totalBg: 'FFF3EAD2',       // light sand
  expenseBg: 'FFB4552D',     // terracotta
  zebra: 'FFF7F4EC'
};

const EUR_FMT = '#,##0.00 €';
const DATE_FMT = 'dd/mm/yyyy';

function isCardPayment(method) {
  if (!method) return false;
  const m = String(method).toUpperCase();
  return m === 'CREDIT_CARD' || m === 'CARD' || m === 'CB' || m === 'CARTE BLEUE' || m === 'CARTE BANCAIRE';
}

function paymentLabel(method) {
  if (!method) return '';
  const upper = String(method).toUpperCase();
  return PAYMENT_METHOD_LABELS[upper] || method;
}

function patientName(patient) {
  if (!patient) return '';
  const last = (patient.last_name || '').toUpperCase();
  const first = patient.first_name || '';
  return `${last} ${first}`.trim();
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Amount actually received: card payments are net of the bank commission,
 * everything else is received in full (HT === "TTC" for exempt activity).
 */
function receivedAmount(amountHT, method, commissionRate) {
  if (isCardPayment(method)) return round2(amountHT * (1 - commissionRate));
  return round2(amountHT);
}

/**
 * Fetch all invoices + expenses for a year, scoped to the user, grouped by month.
 */
async function fetchYearData(user, year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  // --- Invoices (billing) scoped by patient ---
  const patientIds = await getScopedPatientIds(user);
  const billingWhere = {
    is_active: true,
    invoice_date: { [Op.gte]: start, [Op.lt]: end }
  };
  if (patientIds !== null) {
    if (patientIds.length === 0) billingWhere.id = null; // no access → no rows
    else billingWhere.patient_id = { [Op.in]: patientIds };
  }

  const invoices = await db.Billing.findAll({
    where: billingWhere,
    include: [{ model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['invoice_date', 'ASC'], ['invoice_number', 'ASC']]
  });

  // --- Expenses scoped by created_by (recurring ones materialised) ---
  const dietitianIds = await getScopedDietitianIds(user);
  const expenseBase = { is_active: true };
  if (dietitianIds !== null) {
    if (dietitianIds.length === 0) expenseBase.id = null;
    else expenseBase.created_by = { [Op.in]: dietitianIds };
  }

  const expenseRows = await db.Expense.findAll({
    where: yearExpenseWhere(year, expenseBase),
    order: [['expense_date', 'ASC']]
  });
  const expenses = expandRecurringExpenses(expenseRows, year);

  // Group into 12 buckets.
  const byMonth = Array.from({ length: 12 }, () => ({ invoices: [], expenses: [] }));
  for (const inv of invoices) {
    const m = new Date(inv.invoice_date).getUTCMonth();
    byMonth[m].invoices.push(inv);
  }
  for (const exp of expenses) {
    const m = new Date(exp.expense_date).getUTCMonth();
    byMonth[m].expenses.push(exp);
  }
  return byMonth;
}

function styleHeaderCell(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder();
}

function thinBorder() {
  const side = { style: 'thin', color: { argb: 'FFCBB994' } };
  return { top: side, left: side, bottom: side, right: side };
}

function styleTotalCell(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalBg } };
  cell.font = { bold: true, color: { argb: COLORS.sectionText } };
  cell.border = thinBorder();
}

/**
 * Build one monthly worksheet with a REVENUS section and an AUTRES DÉPENSES section.
 */
function buildMonthSheet(wb, monthIndex, monthData, year, commissionRate) {
  const label = String(monthIndex + 1).padStart(2, '0');
  const ws = wb.addWorksheet(label, {
    properties: { tabColor: { argb: COLORS.headerBg } },
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  ws.columns = [
    { key: 'date', width: 12 },
    { key: 'nom', width: 26 },
    { key: 'prestation', width: 34 },
    { key: 'ht', width: 12 },
    { key: 'ttc', width: 12 },
    { key: 'mode', width: 18 },
    { key: 'recu', width: 13 },
    { key: 'facture', width: 12 }
  ];

  // Title row
  ws.mergeCells(1, 1, 1, 8);
  const title = ws.getCell(1, 1);
  title.value = `${MONTH_NAMES_FR[monthIndex]} ${year} — Comptabilité`;
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  title.font = { bold: true, size: 14, color: { argb: COLORS.sectionText } };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  // --- REVENUS CONSULTATIONS ---
  const headerRowNum = 2;
  const headers = ['DATE', 'NOM', 'PRESTATIONS', 'PRIX HT', 'PRIX TTC', "MODE D'ENCAISSEMENT", 'PAYEMENT REÇU', 'N°FACTURE'];
  const headerRow = ws.getRow(headerRowNum);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
    styleHeaderCell(headerRow.getCell(i + 1));
  });
  headerRow.height = 30;

  let r = headerRowNum + 1;
  const firstDataRow = r;
  monthData.invoices.forEach((inv, idx) => {
    const ht = parseFloat(inv.amount_total || 0);
    const ttc = receivedAmount(ht, inv.payment_method, commissionRate);
    const row = ws.getRow(r);
    row.getCell(1).value = inv.invoice_date ? new Date(inv.invoice_date) : null;
    row.getCell(1).numFmt = DATE_FMT;
    row.getCell(2).value = patientName(inv.patient);
    row.getCell(3).value = inv.service_description || '';
    row.getCell(4).value = ht;
    row.getCell(4).numFmt = EUR_FMT;
    row.getCell(5).value = ttc;
    row.getCell(5).numFmt = EUR_FMT;
    row.getCell(6).value = paymentLabel(inv.payment_method);
    row.getCell(7).value = inv.status === 'PAID' ? 'Oui' : 'Non';
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).value = inv.invoice_number || '/';
    row.getCell(8).alignment = { horizontal: 'center' };
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder();
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
      }
    }
    r++;
  });
  const lastDataRow = r - 1;

  // Totals row for revenues
  const totalRow = ws.getRow(r);
  totalRow.getCell(3).value = 'TOTAL';
  if (lastDataRow >= firstDataRow) {
    totalRow.getCell(4).value = { formula: `SUM(D${firstDataRow}:D${lastDataRow})` };
    totalRow.getCell(5).value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})` };
  } else {
    totalRow.getCell(4).value = 0;
    totalRow.getCell(5).value = 0;
  }
  totalRow.getCell(4).numFmt = EUR_FMT;
  totalRow.getCell(5).numFmt = EUR_FMT;
  for (let c = 1; c <= 8; c++) styleTotalCell(totalRow.getCell(c));
  const revenueTotalRow = r;
  r += 2;

  // --- AUTRES DÉPENSES ---
  ws.mergeCells(r, 1, r, 3);
  const expTitle = ws.getCell(r, 1);
  expTitle.value = 'AUTRES DÉPENSES';
  expTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.expenseBg } };
  expTitle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  expTitle.alignment = { horizontal: 'left', indent: 1 };
  r++;

  const expHeaderRow = ws.getRow(r);
  ['TYPE', 'MONTANT', 'COMMENTAIRES'].forEach((h, i) => {
    expHeaderRow.getCell(i + 1).value = h;
    styleHeaderCell(expHeaderRow.getCell(i + 1));
  });
  r++;

  const expFirst = r;
  monthData.expenses.forEach((exp, idx) => {
    const row = ws.getRow(r);
    row.getCell(1).value = exp.category || 'OTHER';
    row.getCell(2).value = parseFloat(exp.amount || 0);
    row.getCell(2).numFmt = EUR_FMT;
    row.getCell(3).value = exp.description || exp.vendor || '';
    for (let c = 1; c <= 3; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder();
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
    }
    r++;
  });
  const expLast = r - 1;

  const expTotalRow = ws.getRow(r);
  expTotalRow.getCell(1).value = 'TOTAL';
  if (expLast >= expFirst) {
    expTotalRow.getCell(2).value = { formula: `SUM(B${expFirst}:B${expLast})` };
  } else {
    expTotalRow.getCell(2).value = 0;
  }
  expTotalRow.getCell(2).numFmt = EUR_FMT;
  for (let c = 1; c <= 3; c++) styleTotalCell(expTotalRow.getCell(c));
  const expenseTotalRow = r;

  return {
    sheetName: label,
    revenueTotalRow,
    expenseTotalRow
  };
}

/**
 * Build the summary sheet referencing each month's totals via formulas.
 */
function buildSummarySheet(wb, monthRefs, year) {
  const ws = wb.addWorksheet('SYNTHÈSE', {
    properties: { tabColor: { argb: COLORS.sectionBg } },
    views: [{ state: 'frozen', ySplit: 3 }]
  });
  ws.columns = [
    { width: 16 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 16 }
  ];

  ws.mergeCells(1, 1, 1, 5);
  const title = ws.getCell(1, 1);
  title.value = `TABLEAU DE BORD ${year}`;
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  title.font = { bold: true, size: 16, color: { argb: COLORS.sectionText } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  const headerRow = ws.getRow(3);
  ['Mois', 'Revenus HT', 'Encaissé (net)', 'Dépenses', 'Résultat'].forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
    styleHeaderCell(headerRow.getCell(i + 1));
  });
  headerRow.height = 24;

  let r = 4;
  const firstRow = r;
  monthRefs.forEach((ref, idx) => {
    const row = ws.getRow(r);
    row.getCell(1).value = MONTH_NAMES_FR[idx];
    row.getCell(2).value = { formula: `'${ref.sheetName}'!D${ref.revenueTotalRow}` };
    row.getCell(3).value = { formula: `'${ref.sheetName}'!E${ref.revenueTotalRow}` };
    row.getCell(4).value = { formula: `'${ref.sheetName}'!B${ref.expenseTotalRow}` };
    row.getCell(5).value = { formula: `C${r}-D${r}` };
    for (let c = 2; c <= 5; c++) {
      row.getCell(c).numFmt = EUR_FMT;
      row.getCell(c).border = thinBorder();
    }
    row.getCell(1).border = thinBorder();
    if (idx % 2 === 1) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebra } };
      }
    }
    r++;
  });
  const lastRow = r - 1;

  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = 'TOTAL ANNÉE';
  for (let c = 2; c <= 5; c++) {
    const col = String.fromCharCode(65 + c - 1);
    totalRow.getCell(c).value = { formula: `SUM(${col}${firstRow}:${col}${lastRow})` };
    totalRow.getCell(c).numFmt = EUR_FMT;
    styleTotalCell(totalRow.getCell(c));
  }
  styleTotalCell(totalRow.getCell(1));
  totalRow.height = 22;

  return ws;
}

/**
 * Build the full workbook. Returns an ExcelJS.Workbook.
 */
async function buildWorkbook(user, year, options = {}) {
  const commissionRate = options.commissionRate != null
    ? options.commissionRate
    : DEFAULT_CARD_COMMISSION_RATE;

  const byMonth = await fetchYearData(user, year);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'NutriVault';
  wb.created = new Date();
  wb.properties.title = `Comptabilité ${year}`;

  // Placeholder for summary; build month sheets first to collect total rows.
  const monthRefs = [];
  for (let m = 0; m < 12; m++) {
    monthRefs.push(buildMonthSheet(wb, m, byMonth[m], year, commissionRate));
  }
  buildSummarySheet(wb, monthRefs, year);

  // Force Excel to recalc formulas on open.
  wb.calcProperties.fullCalcOnLoad = true;

  return wb;
}

/**
 * Generate the workbook as a Buffer (for download).
 */
async function exportBuffer(user, year, options = {}) {
  const wb = await buildWorkbook(user, year, options);
  return wb.xlsx.writeBuffer();
}

/**
 * Write the workbook to disk (Compta/Comptabilité_<year>.xlsx by default).
 * Returns the absolute path written.
 */
async function exportToDisk(user, year, options = {}) {
  const wb = await buildWorkbook(user, year, options);
  const projectRoot = path.resolve(__dirname, '../../../');
  const targetDir = process.env.COMPTA_EXPORT_DIR
    ? path.resolve(process.env.COMPTA_EXPORT_DIR)
    : path.join(projectRoot, 'Compta');

  // IMPORTANT: never overwrite a hand-maintained master workbook. The generated
  // ("clean") export goes to a distinct filename. Override via env if desired.
  const filename = process.env.COMPTA_EXPORT_FILENAME
    ? process.env.COMPTA_EXPORT_FILENAME.replace('{year}', String(year))
    : `Comptabilité_${year}_export.xlsx`;
  const filePath = path.join(targetDir, filename);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  await wb.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = {
  buildWorkbook,
  exportBuffer,
  exportToDisk,
  // exposed for testing
  receivedAmount,
  paymentLabel,
  patientName,
  DEFAULT_CARD_COMMISSION_RATE
};
