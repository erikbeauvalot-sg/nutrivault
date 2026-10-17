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
const { effectiveCashDate, cashDateExpr, cashDateRangeWhere } = require('../helpers/cashDate');
const { yearExpenseWhere, expandRecurringExpenses } = require('../helpers/comptaExpenses');

const DEFAULT_CARD_COMMISSION_RATE = parseFloat(process.env.COMPTA_CARD_COMMISSION_RATE || '0.0175');
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
// Rewriting a part must not add folder entries (xl/, xl/worksheets/): they are
// not OPC parts and the master has none.
const ZIP_WRITE_OPTIONS = { createFolders: false };

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

// TRÉSO layout is detected from the sheet itself (see detectTresoLayout): the
// user edits this workbook (inserted columns/rows), so hard-coded addresses rot.
const MONTH_NAMES_FR = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
// CHARGES label (column B) → bucket. Order matters: RC pro before the generic
// "assurance" rule; without a dedicated RC pro row it takes the first
// "Assurances" row and the generic bucket the next one.
const TRESO_CHARGE_LABELS = [
  ['loyer', /loyer/],
  ['doctolib', /doctolib/],
  ['rcpro', /\brc\s*pro\b|responsabilit/],
  ['assurance', /assurance/]
];

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

  // Overwriting a shared-formula master would orphan its slave cells (Excel then
  // reports corrupted content): give the slaves their own formula first.
  xml = unshareFormulaAt(xml, addr);

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

// ---------- shared formulas ----------
/**
 * Shift the relative A1 references of a formula by (dc, dr), as Excel does when
 * a shared formula is applied to another cell. String literals, quoted sheet
 * names and structured table references ([...]) are left untouched.
 */
function shiftFormula(formula, dc, dr) {
  const shiftRefs = (text) => text.replace(
    /(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g,
    (full, colAbs, col, rowAbs, row) => {
      const c = colAbs ? col : numToCol(colToNum(col) + dc);
      const r = rowAbs ? row : String(parseInt(row, 10) + dr);
      return `${colAbs}${c}${rowAbs}${r}`;
    }
  );

  let out = '';
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < formula.length) {
        if (formula[j] === ch) {
          if (formula[j + 1] === ch) { j += 2; continue; }
          break;
        }
        j++;
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '[') {
      let depth = 0;
      let j = i;
      for (; j < formula.length; j++) {
        if (formula[j] === '[') depth++;
        else if (formula[j] === ']' && --depth === 0) break;
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
    } else {
      let j = i;
      while (j < formula.length && !'"\'['.includes(formula[j])) j++;
      out += shiftRefs(formula.slice(i, j));
      i = j;
    }
  }
  return out;
}

function addrToRowCol(addr) {
  return { col: colToNum(addr.match(/^[A-Z]+/)[0]), row: parseInt(addr.match(/\d+$/)[0], 10) };
}

/**
 * If the cell at `addr` is a shared-formula master, turn every cell of the group
 * into a regular formula (slaves get the master formula shifted to their
 * position). Cached values are kept; Excel recalculates on open.
 */
function unshareFormulaAt(xml, addr) {
  // (?<!/) keeps a self-closing <c .../> from swallowing the following cells
  const cellRe = new RegExp(`<c r="${addr}"(?:\\s[^>]*?)?(?<!/)>([\\s\\S]*?)</c>`);
  const cell = xml.match(cellRe);
  if (!cell) return xml;
  const master = cell[1].match(/<f([^>]*\bt="shared"[^>]*\bref="[^"]+"[^>]*)>([\s\S]*?)<\/f>/);
  if (!master) return xml;
  const si = (master[1].match(/\bsi="(\d+)"/) || [])[1];
  if (si === undefined) return xml;

  const formula = decodeXml(master[2]);
  const origin = addrToRowCol(addr);
  const slaveRe = new RegExp(`(<c r="([A-Z]+\\d+)"[^>]*>)<f[^>]*\\bt="shared"[^>]*\\bsi="${si}"[^>]*?(?:/>|></f>)`, 'g');
  xml = xml.replace(slaveRe, (full, open, slaveAddr) => {
    const pos = addrToRowCol(slaveAddr);
    return `${open}<f>${xmlEscape(shiftFormula(formula, pos.col - origin.col, pos.row - origin.row))}</f>`;
  });
  // The master itself becomes a plain formula.
  return xml.replace(cellRe, (full) => full.replace(master[0], `<f>${master[2]}</f>`));
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

async function loadSharedStrings(zip) {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  const xml = await file.async('string');
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(si =>
    [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => decodeXml(t[1])).join(''));
}

function decodeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
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
    const tableTag = (tXml.match(/<table\b[^>]*>/) || [''])[0];
    const ref = (tableTag.match(/\bref="([^"]+)"/) || [])[1];
    const cols = [...tXml.matchAll(/<tableColumn[^>]*name="([^"]+)"/g)].map(x => decodeXml(x[1]));
    const headerRows = parseInt((tableTag.match(/\bheaderRowCount="(\d+)"/) || [null, '1'])[1], 10);
    const totalsRows = parseInt((tableTag.match(/\btotalsRowCount="(\d+)"/) || [null, '0'])[1], 10);
    tables.push({ path: tPath, ref, cols, headerRows, totalsRows });
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

  const patientIds = await getScopedPatientIds(user);
  // Invoices belong to the year (and month) of their cash date (date d'encaissement)
  const billingWhere = { is_active: true, ...cashDateRangeWhere(`${year}-01-01`, `${year}-12-31`) };
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
    order: [[cashDateExpr(), 'ASC'], ['invoice_date', 'ASC'], ['invoice_number', 'ASC']]
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
  for (const inv of invoices) byMonth[Number(effectiveCashDate(inv).slice(5, 7)) - 1].invoices.push(inv);
  for (const exp of expenses) byMonth[new Date(exp.expense_date).getUTCMonth()].expenses.push(exp);
  return byMonth;
}

// ---------- injection ----------
// Invoice table columns, recognised by header name (the user adds columns, e.g.
// "Structure" since July): role → test on the normalized header.
const INVOICE_COLUMN_ROLES = [
  ['date', h => h === 'DATE'],
  ['structure', h => h === 'STRUCTURE' || h === 'LIEU'],
  ['name', h => h === 'NOM'],
  ['prestation', h => h === 'PRESTATIONS' || h === 'PRESTATION'],
  ['ht', h => h === 'PRIX HT'],
  ['ttc', h => h === 'PRIX TTC'],
  ['mode', h => h.startsWith('MODE')],
  ['paid', h => h.startsWith('PAYEMENT') || h.startsWith('PAIEMENT')],
  ['number', h => h.includes('FACTURE')]
];

function normalizeHeader(name) {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Data rows of a table, excluding its header and totals rows. */
function tableDataRows(table) {
  const { r1, r2 } = parseRef(table.ref);
  const headerRows = table.headerRows ?? 1;
  const totalsRows = table.totalsRows ?? 0;
  return { firstData: r1 + headerRows, lastData: r2 - totalsRows };
}

/** role → column letter for an invoice table, from its header names. */
function invoiceColumns(table) {
  const { c1 } = parseRef(table.ref);
  const columns = {};
  table.cols.forEach((name, i) => {
    const header = normalizeHeader(name);
    const role = INVOICE_COLUMN_ROLES.find(([r, test]) => !columns[r] && test(header));
    if (role) columns[role[0]] = numToCol(colToNum(c1) + i);
  });
  return columns;
}

/**
 * @param {Object} table - { ref, cols, headerRows, totalsRows }
 * @param {Object} locationLabels - location code → label (written in "Structure")
 */
function injectInvoiceTable(xml, table, invoices, rate, warnings, sheetName, locationLabels = {}) {
  const { firstData, lastData } = tableDataRows(table);
  const capacity = Math.max(0, lastData - firstData + 1);
  const columns = invoiceColumns(table);
  const roles = Object.keys(columns);

  // Column styles sourced from the first data row so previously-empty rows format correctly.
  const styles = {};
  for (const role of roles) styles[role] = styleOf(xml, `${columns[role]}${firstData}`);

  if (invoices.length > capacity) {
    warnings.push(`Mois ${sheetName}: ${invoices.length} factures pour ${capacity} lignes disponibles — ${invoices.length - capacity} non injectées (ajoutez des lignes au tableau dans Excel).`);
  }

  const write = (role, rowNum, cell) => {
    if (columns[role]) xml = writeCell(xml, `${columns[role]}${rowNum}`, styles[role], cell);
  };

  for (let i = 0; i < capacity; i++) {
    const rowNum = firstData + i;
    const inv = invoices[i];
    if (!inv) {
      for (const role of roles) write(role, rowNum, { type: 'blank' });
      continue;
    }
    const ht = parseFloat(inv.amount_total || 0);
    const location = inv.location_code ? locationLabels[inv.location_code] : null;
    write('date', rowNum, { type: 'n', value: toSerial(inv.invoice_date) });
    write('structure', rowNum, location ? { type: 's', value: location } : { type: 'blank' });
    write('name', rowNum, { type: 's', value: patientName(inv.patient) });
    write('prestation', rowNum, { type: 's', value: mapPrestation(inv) });
    write('ht', rowNum, { type: 'n', value: ht });
    write('ttc', rowNum, { type: 'n', value: receivedAmount(ht, inv.payment_method, rate) });
    write('mode', rowNum, { type: 's', value: paymentLabel(inv.payment_method) });
    write('paid', rowNum, { type: 'b', value: inv.status === 'PAID' });
    write('number', rowNum, { type: 's', value: inv.invoice_number || '/' });
  }
  return xml;
}

function injectExpenseTable(xml, table, expenses, warnings, sheetName) {
  const { c1 } = parseRef(table.ref);
  const { firstData, lastData } = tableDataRows(table);
  const capacity = Math.max(0, lastData - firstData + 1);
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

// ---------- TRÉSO ----------
function normalizeLabel(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Text of every string cell of a worksheet: Map("B14" → "Suresnes - Loyer"). */
function stringCells(xml, sharedStrings) {
  const cells = new Map();
  for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, addr, attrs, body = ''] = m;
    let text = null;
    if (/\bt="s"/.test(attrs)) {
      const v = body.match(/<v>(\d+)<\/v>/);
      if (v) text = sharedStrings[parseInt(v[1], 10)];
    } else if (/\bt="inlineStr"/.test(attrs)) {
      text = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('');
    }
    if (text != null) cells.set(addr, text);
  }
  return cells;
}

/**
 * Locate the TRÉSO month columns and CHARGES rows from the sheet content:
 * - month columns: the header row naming the months (janvier … décembre)
 * - charge rows: the rows under the "CHARGES" label, matched by their label
 *
 * @returns {{ monthCols: string[]|null, chargeRows: Object<string, number> }}
 */
function detectTresoLayout(xml, sharedStrings) {
  const cells = stringCells(xml, sharedStrings);
  const byRow = new Map();
  for (const [addr, text] of cells) {
    const { col, row } = addrToRowCol(addr);
    if (!byRow.has(row)) byRow.set(row, new Map());
    byRow.get(row).set(col, normalizeLabel(text));
  }

  let monthCols = null;
  for (const rowCells of byRow.values()) {
    const cols = MONTH_NAMES_FR.map(month => {
      for (const [col, text] of rowCells) if (text === month) return numToCol(col);
      return null;
    });
    if (cols.every(Boolean)) { monthCols = cols; break; }
  }

  const chargeRows = {};
  const chargesRow = [...byRow.entries()].find(([, rowCells]) => [...rowCells.values()].includes('charges'));
  if (chargesRow) {
    const labelRows = [];
    for (let row = chargesRow[0]; byRow.get(row)?.get(2); row++) labelRows.push([row, byRow.get(row).get(2)]);
    const used = new Set();
    for (const [bucket, pattern] of TRESO_CHARGE_LABELS) {
      const exact = labelRows.find(([row, label]) => !used.has(row) && pattern.test(label));
      const fallback = bucket === 'rcpro'
        ? labelRows.find(([row, label]) => !used.has(row) && /assurance/.test(label))
        : null;
      const match = exact || fallback;
      if (match) {
        chargeRows[bucket] = match[0];
        used.add(match[0]);
      }
    }
  }
  return { monthCols, chargeRows };
}

/**
 * Write the CHARGES lines of the TRÉSO sheet from app expense sums.
 * `chargeSums[bucket]` is a 12-length array (Jan..Dec) of monthly totals.
 *
 * Only months where the app has an amount are written: the other cells keep
 * the values typed in the master (charges not tracked in the app). Quarter and
 * total cells are never touched, Excel recomputes them (fullCalcOnLoad).
 */
function injectTresoCharges(xml, chargeSums, sharedStrings = [], warnings = []) {
  const { monthCols, chargeRows } = detectTresoLayout(xml, sharedStrings);
  if (!monthCols) {
    warnings.push('TRÉSO : ligne des mois (janvier … décembre) introuvable — charges non injectées.');
    return xml;
  }
  for (const [bucket, sums = []] of Object.entries(chargeSums)) {
    const total = sums.reduce((acc, value) => acc + (value || 0), 0);
    if (!total) continue;
    const rowNum = chargeRows[bucket];
    if (!rowNum) {
      warnings.push(`TRÉSO : aucune ligne « ${bucket} » dans les CHARGES — ${round2(total)} € non injectés.`);
      continue;
    }
    for (let m = 0; m < 12; m++) {
      if (!sums[m]) continue;
      const addr = `${monthCols[m]}${rowNum}`;
      xml = writeCell(xml, addr, styleOf(xml, addr), { type: 'n', value: round2(sums[m]) });
    }
  }
  return xml;
}

/**
 * Remove xl/calcChain.xml: it lists every formula cell, and injected values
 * replace some formulas, so a stale chain makes Excel "repair" the file.
 * The chain is optional — Excel rebuilds it on open.
 */
async function dropCalcChain(zip) {
  if (!zip.file('xl/calcChain.xml')) return;
  zip.remove('xl/calcChain.xml');

  const typesXml = await zip.file('[Content_Types].xml').async('string');
  zip.file('[Content_Types].xml', typesXml.replace(/<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, ''), ZIP_WRITE_OPTIONS);

  const relsPath = 'xl/_rels/workbook.xml.rels';
  const relsXml = await zip.file(relsPath).async('string');
  zip.file(relsPath, relsXml.replace(/<Relationship[^>]*Target="[^"]*calcChain\.xml"[^>]*\/>/g, ''), ZIP_WRITE_OPTIONS);
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

  // Practice location labels, written in the invoice tables "Structure" column.
  const locationLabels = {};
  for (const location of await db.PracticeLocation.findAll({ attributes: ['code', 'label'] })) {
    locationLabels[location.code] = location.label;
  }

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
    xml = injectInvoiceTable(xml, invoice, byMonth[monthIdx].invoices, rate, warnings, name, locationLabels);
    if (expense) {
      // Only "autres" expenses go into the monthly AUTRES DÉPENSES table.
      xml = injectExpenseTable(xml, expense, autres, warnings, name);
    }
    zip.file(sheet.file, xml, ZIP_WRITE_OPTIONS);
  }

  // Inject the TRÉSO CHARGES lines from the accumulated category sums.
  const treso = sheets.find(s => s.name === 'TRÉSO' || s.name === 'TRESO');
  if (treso) {
    let tresoXml = await zip.file(treso.file).async('string');
    tresoXml = injectTresoCharges(tresoXml, chargeSums, await loadSharedStrings(zip), warnings);
    zip.file(treso.file, tresoXml, ZIP_WRITE_OPTIONS);
  }

  // Force recalculation on open.
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  zip.file('xl/workbook.xml', forceFullCalc(wbXml), ZIP_WRITE_OPTIONS);
  await dropCalcChain(zip);

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
  detectTresoLayout,
  shiftFormula,
  unshareFormulaAt,
  paymentLabel,
  receivedAmount,
  patientName,
  toSerial,
  writeCell,
  parseRef,
  injectInvoiceTable,
  invoiceColumns,
  dropCalcChain
};
