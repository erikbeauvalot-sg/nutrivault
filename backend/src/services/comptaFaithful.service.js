/**
 * Comptabilité Faithful Injector
 *
 * Refreshes the user's existing accounting workbook IN PLACE at the XML level:
 * it overwrites only the monthly invoice and expense table cells with live app
 * data, leaving everything else (TABLEAU DE BORD, TRÉSO, charts, drawings,
 * manual charges, table layout and the 47 cross-sheet references) byte-for-byte
 * intact. Because table row counts never change, no formula reference breaks and
 * the dashboard/tréso recalculate automatically on open.
 *
 * Data always comes from the app; the master file is never modified — output is
 * always a separate buffer/copy.
 */

const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');
const { yearExpenseWhere, expandRecurringExpenses } = require('../helpers/comptaExpenses');

const DEFAULT_CARD_COMMISSION_RATE = parseFloat(process.env.COMPTA_CARD_COMMISSION_RATE || '0.0175');
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

const PAYMENT_METHOD_LABELS = {
  CREDIT_CARD: 'Carte bleue', CARD: 'Carte bleue', CB: 'Carte bleue',
  CASH: 'Espèces', CHECK: 'Chèque', CHEQUE: 'Chèque',
  BANK_TRANSFER: 'Virement', TRANSFER: 'Virement'
};

// ---------- small helpers ----------
function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function toSerial(date) { return Math.floor((new Date(date).getTime() - EXCEL_EPOCH) / 86400000); }
function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function colToNum(col) { let n = 0; for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64); return n; }
function numToCol(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function isCardPayment(method) {
  if (!method) return false;
  const m = String(method).toUpperCase();
  return m === 'CREDIT_CARD' || m === 'CARD' || m === 'CB' || m === 'CARTE BLEUE' || m === 'CARTE BANCAIRE';
}
function paymentLabel(method) {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[String(method).toUpperCase()] || method;
}
function patientName(patient) {
  if (!patient) return '';
  return `${(patient.last_name || '').toUpperCase()} ${patient.first_name || ''}`.trim();
}
function receivedAmount(amountHT, method, rate) {
  return isCardPayment(method) ? round2(amountHT * (1 - rate)) : round2(amountHT);
}

/**
 * Map an invoice (via its visit type / description) to one of the workbook's
 * canonical PRESTATIONS strings so TRÉSO's SUMIFS/COUNTIFS match. Falls back to
 * the raw service_description when it can't be categorised (still counted in the
 * monthly SUBTOTAL, just not in the first/follow split).
 */
function mapPrestation(inv) {
  const raw = (inv.visit && inv.visit.visit_type) || inv.service_description || '';
  const low = raw.toLowerCase();
  const modality = /visio|distanc|télé|tele|video|à distance/.test(low) ? 'En visio' : 'Au cabinet';
  if (/initial|premi|1er|1ère|1ere|first|bilan/.test(low)) {
    return `Première consultation diététique (${modality})`;
  }
  if (/suivi|follow|control|contrôle/.test(low)) {
    return `Consultation de suivi diététique (${modality})`;
  }
  return raw; // uncategorised — appears in totals but not in type split
}

// ---------- expense classification (TRÉSO CHARGES lines) ----------
// Each app expense maps to exactly one TRÉSO charge line. Named vendor lines
// (Doctolib, RC pro) are detected by text first (they are vendor-specific, not
// category-wide); otherwise the expense follows the TRÉSO line configured on its
// category (`treso_line`, editable in the app, default 'autres'). Anything left
// goes to 'autres', injected into the monthly "AUTRES DÉPENSES" tables.
// `categoryTresoMap` maps expense category code → treso_line.
function classifyExpense(exp, categoryTresoMap = {}) {
  const text = `${exp.vendor || ''} ${exp.description || ''}`.toLowerCase();
  if (/doctolib/.test(text)) return 'doctolib';
  if (/\brc\s*pro\b|\brcp\b|responsabilit[ée]\s+civile/.test(text)) return 'rcpro';
  const configured = categoryTresoMap[exp.category];
  if (configured && configured !== 'autres') return configured;
  // Legacy fallback for data created before categories carried treso_line.
  if (!configured) {
    if (exp.category === 'RENT' || /\bloyer\b/.test(text)) return 'loyer';
    if (exp.category === 'INSURANCE') return 'assurance';
  }
  return 'autres';
}

// TRÉSO layout: month columns (Jan..Dec) and the CHARGES rows they feed.
const TRESO_MONTH_COLS = ['C', 'D', 'E', 'G', 'H', 'I', 'K', 'L', 'M', 'O', 'P', 'Q'];
const TRESO_CHARGE_ROWS = { loyer: 12, doctolib: 13, rcpro: 14, assurance: 15 };

// ---------- XML cell writer ----------
/**
 * Replace (or insert) a single cell `<c r="ADDR">` inside a worksheet XML
 * string, preserving/forcing style index `styleIdx`. `cell` describes the value.
 */
function writeCell(xml, addr, styleIdx, cell) {
  const s = styleIdx != null && styleIdx !== '' ? ` s="${styleIdx}"` : '';
  let replacement;
  if (!cell || cell.type === 'blank') {
    replacement = `<c r="${addr}"${s}/>`;
  } else if (cell.type === 'n') {
    replacement = `<c r="${addr}"${s}><v>${cell.value}</v></c>`;
  } else if (cell.type === 'f') {
    replacement = `<c r="${addr}"${s}><f>${xmlEscape(cell.value)}</f></c>`;
  } else if (cell.type === 'b') {
    replacement = `<c r="${addr}"${s} t="b"><v>${cell.value ? 1 : 0}</v></c>`;
  } else { // string (inline)
    replacement = `<c r="${addr}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.value)}</t></is></c>`;
  }

  // Try to replace an existing cell element (self-closing or with content).
  const re = new RegExp(`<c r="${addr}"(?:\\s[^>]*?)?(?:/>|>[\\s\\S]*?</c>)`);
  if (re.test(xml)) return xml.replace(re, replacement);

  // Cell absent → insert into its row in column order.
  const rowNum = addr.match(/\d+$/)[0];
  const colNum = colToNum(addr.match(/^[A-Z]+/)[0]);
  const rowRe = new RegExp(`(<row r="${rowNum}"[^>]*>)([\\s\\S]*?)(</row>)`);
  const m = xml.match(rowRe);
  if (!m) return xml; // row missing — skip (should not happen within table capacity)
  const cells = m[2].match(/<c [\s\S]*?(?:\/>|<\/c>)/g) || [];
  let inserted = false;
  const out = [];
  for (const c of cells) {
    const cAddr = (c.match(/r="([A-Z]+\d+)"/) || [])[1] || '';
    const cCol = colToNum((cAddr.match(/^[A-Z]+/) || ['A'])[0]);
    if (!inserted && cCol > colNum) { out.push(replacement); inserted = true; }
    out.push(c);
  }
  if (!inserted) out.push(replacement);
  return xml.replace(rowRe, `$1${out.join('')}$3`);
}

/** Extract the style index of an existing cell at `addr`, or '' if none. */
function styleOf(xml, addr) {
  const m = xml.match(new RegExp(`<c r="${addr}"(?:\\s[^>]*?)?(?:/>|>)`));
  if (!m) return '';
  const s = m[0].match(/\ss="(\d+)"/);
  return s ? s[1] : '';
}

// ---------- workbook part mapping ----------
function parseRef(ref) {
  const [a, b] = ref.split(':');
  const c1 = a.match(/^[A-Z]+/)[0], r1 = parseInt(a.match(/\d+$/)[0], 10);
  const c2 = b.match(/^[A-Z]+/)[0], r2 = parseInt(b.match(/\d+$/)[0], 10);
  return { c1, r1, c2, r2 };
}

async function loadPartMap(zip) {
  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relMap = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) relMap[m[1]] = m[2];

  const sheets = [];
  for (const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = relMap[m[2]];
    if (target) sheets.push({ name: m[1], file: 'xl/' + target.replace(/^\//, '') });
  }
  return { sheets };
}

async function tablesForSheet(zip, sheetFile) {
  const relPath = sheetFile.replace(/([^/]+)$/, '_rels/$1.rels');
  const relFile = zip.file(relPath);
  if (!relFile) return [];
  const relsXml = await relFile.async('string');
  const tables = [];
  for (const m of relsXml.matchAll(/Target="([^"]*tables\/table\d+\.xml)"/g)) {
    const tPath = 'xl/' + m[1].replace(/^\.\.\//, '').replace(/^\//, '');
    const tFile = zip.file(tPath) || zip.file(m[1].replace(/^\.\./, 'xl'));
    if (!tFile) continue;
    const tXml = await (tFile).async('string');
    const ref = (tXml.match(/ref="([^"]+)"/) || [])[1];
    const cols = [...tXml.matchAll(/<tableColumn[^>]*name="([^"]+)"/g)].map(x => x[1]);
    tables.push({ path: tPath, ref, cols });
  }
  return tables;
}

function classifyTables(tables) {
  let invoice = null, expense = null;
  for (const t of tables) {
    const cols = t.cols.map(c => c.trim().toUpperCase());
    if (cols.includes('NOM') && cols.some(c => c.startsWith('PRIX HT'))) invoice = t;
    else if (cols.includes('TYPE') && cols.includes('MONTANT') && cols.includes('COMMENTAIRES')) expense = t;
  }
  return { invoice, expense };
}

// ---------- data ----------
async function fetchYearData(user, year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const patientIds = await getScopedPatientIds(user);
  const billingWhere = { is_active: true, invoice_date: { [Op.gte]: start, [Op.lt]: end } };
  if (patientIds !== null) {
    if (patientIds.length === 0) billingWhere.id = null;
    else billingWhere.patient_id = { [Op.in]: patientIds };
  }
  const invoices = await db.Billing.findAll({
    where: billingWhere,
    include: [
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] },
      { model: db.Visit, as: 'visit', attributes: ['id', 'visit_type'] }
    ],
    order: [['invoice_date', 'ASC'], ['invoice_number', 'ASC']]
  });

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
  // Materialise recurring expenses into one occurrence per period in the year.
  const expenses = expandRecurringExpenses(expenseRows, year);

  const byMonth = Array.from({ length: 12 }, () => ({ invoices: [], expenses: [] }));
  for (const inv of invoices) byMonth[new Date(inv.invoice_date).getUTCMonth()].invoices.push(inv);
  for (const exp of expenses) byMonth[new Date(exp.expense_date).getUTCMonth()].expenses.push(exp);
  return byMonth;
}

// ---------- injection ----------
function injectInvoiceTable(xml, ref, invoices, rate, warnings, sheetName) {
  const { c1, r1, r2 } = parseRef(ref); // header row = r1, data rows r1+1..r2
  const firstData = r1 + 1;
  const capacity = r2 - firstData + 1;
  const cols = [];
  for (let n = colToNum(c1); n <= colToNum(c1) + 7; n++) cols.push(numToCol(n)); // 8 columns A..H

  // Column styles sourced from the first data row so previously-empty rows format correctly.
  const styles = cols.map(col => styleOf(xml, `${col}${firstData}`));

  if (invoices.length > capacity) {
    warnings.push(`Mois ${sheetName}: ${invoices.length} factures pour ${capacity} lignes disponibles — ${invoices.length - capacity} non injectées (ajoutez des lignes au tableau dans Excel).`);
  }

  for (let i = 0; i < capacity; i++) {
    const rowNum = firstData + i;
    const inv = invoices[i];
    const [cD, cN, cP, cHT, cTTC, cM, cR, cF] = cols;
    if (!inv) {
      for (let k = 0; k < cols.length; k++) xml = writeCell(xml, `${cols[k]}${rowNum}`, styles[k], { type: 'blank' });
      continue;
    }
    const ht = parseFloat(inv.amount_total || 0);
    const ttc = receivedAmount(ht, inv.payment_method, rate);
    xml = writeCell(xml, `${cD}${rowNum}`, styles[0], { type: 'n', value: toSerial(inv.invoice_date) });
    xml = writeCell(xml, `${cN}${rowNum}`, styles[1], { type: 's', value: patientName(inv.patient) });
    xml = writeCell(xml, `${cP}${rowNum}`, styles[2], { type: 's', value: mapPrestation(inv) });
    xml = writeCell(xml, `${cHT}${rowNum}`, styles[3], { type: 'n', value: ht });
    xml = writeCell(xml, `${cTTC}${rowNum}`, styles[4], { type: 'n', value: ttc });
    xml = writeCell(xml, `${cM}${rowNum}`, styles[5], { type: 's', value: paymentLabel(inv.payment_method) });
    xml = writeCell(xml, `${cR}${rowNum}`, styles[6], { type: 'b', value: inv.status === 'PAID' });
    xml = writeCell(xml, `${cF}${rowNum}`, styles[7], { type: 's', value: inv.invoice_number || '/' });
  }
  return xml;
}

function injectExpenseTable(xml, ref, expenses, warnings, sheetName) {
  const { c1, r1, r2 } = parseRef(ref);
  const firstData = r1 + 1;
  const capacity = r2 - firstData + 1;
  const cols = [c1, numToCol(colToNum(c1) + 1), numToCol(colToNum(c1) + 2)]; // TYPE, MONTANT, COMMENTAIRES
  const styles = cols.map(col => styleOf(xml, `${col}${firstData}`));

  if (expenses.length > capacity) {
    warnings.push(`Mois ${sheetName}: ${expenses.length} dépenses pour ${capacity} lignes — ${expenses.length - capacity} non injectées.`);
  }
  for (let i = 0; i < capacity; i++) {
    const rowNum = firstData + i;
    const exp = expenses[i];
    if (!exp) {
      for (let k = 0; k < cols.length; k++) xml = writeCell(xml, `${cols[k]}${rowNum}`, styles[k], { type: 'blank' });
      continue;
    }
    xml = writeCell(xml, `${cols[0]}${rowNum}`, styles[0], { type: 's', value: exp.category || 'OTHER' });
    xml = writeCell(xml, `${cols[1]}${rowNum}`, styles[1], { type: 'n', value: parseFloat(exp.amount || 0) });
    xml = writeCell(xml, `${cols[2]}${rowNum}`, styles[2], { type: 's', value: exp.description || exp.vendor || '' });
  }
  return xml;
}

/**
 * Write the CHARGES lines of the TRÉSO sheet from app expense sums.
 * `chargeSums[bucket]` is a 12-length array (Jan..Dec) of monthly totals.
 * Rows 12-15 get monthly values; quarter/total cells (all rows incl. Autres)
 * become SUM formulas so they always aggregate the injected data.
 */
function injectTresoCharges(xml, chargeSums) {
  for (const [bucket, rowNum] of Object.entries(TRESO_CHARGE_ROWS)) {
    const sums = chargeSums[bucket] || [];
    for (let m = 0; m < 12; m++) {
      const col = TRESO_MONTH_COLS[m];
      const addr = `${col}${rowNum}`;
      xml = writeCell(xml, addr, styleOf(xml, addr), { type: 'n', value: round2(sums[m] || 0) });
    }
  }
  // The quarter (F/J/N/R) and total (T) cells are pre-existing SHARED SUM
  // formulas (e.g. F12 masters ref="F12:F17" si="10"). We deliberately do NOT
  // touch them: overwriting a shared-formula master orphans its slave cells
  // (F17, T18, …) and corrupts the workbook. Excel recomputes them on open
  // (fullCalcOnLoad) from the monthly values injected above. Row 16 (Autres)
  // likewise keeps its monthly `='MM'!…` table-reference formulas untouched.
  return xml;
}

function forceFullCalc(workbookXml) {
  if (/<calcPr[^>]*\/>/.test(workbookXml)) {
    return workbookXml.replace(/<calcPr([^>]*)\/>/, (full, attrs) =>
      /fullCalcOnLoad/.test(attrs) ? full : `<calcPr${attrs} fullCalcOnLoad="1"/>`);
  }
  if (/<calcPr[^>]*>/.test(workbookXml)) return workbookXml; // has children, leave as-is
  return workbookXml.replace(/<\/workbook>/, '<calcPr fullCalcOnLoad="1"/></workbook>');
}

/**
 * Produce a refreshed workbook buffer from the master template buffer.
 */
async function injectIntoBuffer(masterBuffer, user, year, options = {}) {
  const rate = options.commissionRate != null ? options.commissionRate : DEFAULT_CARD_COMMISSION_RATE;
  const zip = await JSZip.loadAsync(masterBuffer);
  const { sheets } = await loadPartMap(zip);
  const byMonth = await fetchYearData(user, year);
  const warnings = [];

  // Map each expense category code → its configured TRÉSO line.
  const categoryTresoMap = {};
  try {
    const cats = await db.ExpenseCategory.findAll({ attributes: ['code', 'treso_line'] });
    for (const c of cats) categoryTresoMap[c.code] = c.treso_line;
  } catch (e) { /* table may not exist yet — fall back to legacy heuristics */ }

  // CHARGES sums per bucket per month (Jan..Dec), populated while iterating.
  const chargeSums = { loyer: Array(12).fill(0), doctolib: Array(12).fill(0), rcpro: Array(12).fill(0), assurance: Array(12).fill(0) };

  for (let month = 1; month <= 12; month++) {
    const name = String(month).padStart(2, '0');
    const monthIdx = month - 1;

    // Split this month's expenses: named/categorised charges vs "autres".
    const autres = [];
    for (const exp of byMonth[monthIdx].expenses) {
      const bucket = classifyExpense(exp, categoryTresoMap);
      if (bucket === 'autres') autres.push(exp);
      else chargeSums[bucket][monthIdx] += parseFloat(exp.amount || 0);
    }

    const sheet = sheets.find(s => s.name === name);
    if (!sheet) continue;
    const tables = await tablesForSheet(zip, sheet.file);
    const { invoice, expense } = classifyTables(tables);
    if (!invoice) continue;

    let xml = await zip.file(sheet.file).async('string');
    xml = injectInvoiceTable(xml, invoice.ref, byMonth[monthIdx].invoices, rate, warnings, name);
    if (expense) {
      // Only "autres" expenses go into the monthly AUTRES DÉPENSES table.
      xml = injectExpenseTable(xml, expense.ref, autres, warnings, name);
    }
    zip.file(sheet.file, xml);
  }

  // Inject the TRÉSO CHARGES lines from the accumulated category sums.
  const treso = sheets.find(s => s.name === 'TRÉSO' || s.name === 'TRESO');
  if (treso) {
    let tresoXml = await zip.file(treso.file).async('string');
    tresoXml = injectTresoCharges(tresoXml, chargeSums);
    zip.file(treso.file, tresoXml);
  }

  // Force recalculation on open.
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  zip.file('xl/workbook.xml', forceFullCalc(wbXml));

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer, warnings };
}

function masterPath(year) {
  const projectRoot = path.resolve(__dirname, '../../../');
  const dir = process.env.COMPTA_EXPORT_DIR ? path.resolve(process.env.COMPTA_EXPORT_DIR) : path.join(projectRoot, 'Compta');
  const name = process.env.COMPTA_MASTER_FILENAME
    ? process.env.COMPTA_MASTER_FILENAME.replace('{year}', String(year))
    : `Comptabilité_${year}.xlsx`;
  return path.join(dir, name);
}

/** Returns true when a master workbook exists for the year (faithful mode possible). */
function masterExists(year) {
  return fs.existsSync(masterPath(year));
}

/** Faithful export as a Buffer (reads the master, never writes to it). */
async function exportBuffer(user, year, options = {}) {
  const master = masterPath(year);
  if (!fs.existsSync(master)) {
    const err = new Error(`Master workbook not found: ${master}`);
    err.code = 'MASTER_NOT_FOUND';
    throw err;
  }
  const masterBuffer = fs.readFileSync(master);
  return injectIntoBuffer(masterBuffer, user, year, options);
}

/** Faithful export written to a distinct file (never the master). */
async function exportToDisk(user, year, options = {}) {
  const { buffer, warnings } = await exportBuffer(user, year, options);
  const projectRoot = path.resolve(__dirname, '../../../');
  const dir = process.env.COMPTA_EXPORT_DIR ? path.resolve(process.env.COMPTA_EXPORT_DIR) : path.join(projectRoot, 'Compta');
  const filename = process.env.COMPTA_EXPORT_FILENAME
    ? process.env.COMPTA_EXPORT_FILENAME.replace('{year}', String(year))
    : `Comptabilité_${year}_export.xlsx`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, warnings };
}

module.exports = {
  exportBuffer,
  exportToDisk,
  injectIntoBuffer,
  masterExists,
  masterPath,
  // exposed for tests
  mapPrestation,
  classifyExpense,
  injectTresoCharges,
  paymentLabel,
  receivedAmount,
  patientName,
  toSerial,
  writeCell,
  parseRef
};
