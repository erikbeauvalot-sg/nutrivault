/**
 * Comptabilité Faithful Injector — unit tests (pure helpers, no DB/file IO).
 */

const svc = require('../../src/services/comptaFaithful.service');

describe('comptaFaithful.service — mapping helpers', () => {
  describe('mapPrestation → canonical TRÉSO strings', () => {
    test('initial consultation (default modality Au cabinet)', () => {
      expect(svc.mapPrestation({ visit: { visit_type: 'Consultation initiale' } }))
        .toBe('Première consultation diététique (Au cabinet)');
    });

    test('follow-up consultation', () => {
      expect(svc.mapPrestation({ visit: { visit_type: 'Suivi' } }))
        .toBe('Consultation de suivi diététique (Au cabinet)');
    });

    test('visio keyword yields En visio modality', () => {
      expect(svc.mapPrestation({ service_description: 'Première consultation en visio' }))
        .toBe('Première consultation diététique (En visio)');
    });

    test('falls back to visit_type over service_description', () => {
      expect(svc.mapPrestation({ visit: { visit_type: 'Suivi' }, service_description: 'random text' }))
        .toBe('Consultation de suivi diététique (Au cabinet)');
    });

    test('uncategorisable text is passed through raw', () => {
      expect(svc.mapPrestation({ service_description: 'ttt' })).toBe('ttt');
    });
  });

  describe('classifyExpense → TRÉSO charge buckets', () => {
    test('RENT category → loyer', () => {
      expect(svc.classifyExpense({ category: 'RENT', description: 'Cabinet Suresnes' })).toBe('loyer');
    });
    test('Doctolib matched by vendor/description before category', () => {
      expect(svc.classifyExpense({ category: 'SOFTWARE', vendor: 'Doctolib', description: 'Doctolib' })).toBe('doctolib');
    });
    test('RC Pro matched by description', () => {
      expect(svc.classifyExpense({ category: 'INSURANCE', vendor: 'SOGSUR', description: 'RC Pro' })).toBe('rcpro');
    });
    test('remaining INSURANCE → assurance', () => {
      expect(svc.classifyExpense({ category: 'INSURANCE', description: 'Assurance locale' })).toBe('assurance');
    });
    test('OTHER and everything unmatched → autres', () => {
      expect(svc.classifyExpense({ category: 'OTHER', description: 'Abonnement ADL' })).toBe('autres');
      expect(svc.classifyExpense({ category: 'MARKETING', description: 'Flyers' })).toBe('autres');
    });

    test('category treso_line map drives custom categories', () => {
      const map = { MY_RENT: 'loyer', COMPTA: 'assurance', MISC: 'autres' };
      expect(svc.classifyExpense({ category: 'MY_RENT', description: 'x' }, map)).toBe('loyer');
      expect(svc.classifyExpense({ category: 'COMPTA', description: 'x' }, map)).toBe('assurance');
      expect(svc.classifyExpense({ category: 'MISC', description: 'x' }, map)).toBe('autres');
    });

    test('vendor keyword (Doctolib/RC pro) overrides category map', () => {
      const map = { SOFTWARE: 'autres', INSURANCE: 'assurance' };
      expect(svc.classifyExpense({ category: 'SOFTWARE', vendor: 'Doctolib' }, map)).toBe('doctolib');
      expect(svc.classifyExpense({ category: 'INSURANCE', description: 'RC Pro' }, map)).toBe('rcpro');
    });
  });

  describe('TRÉSO layout detection and charges injection', () => {
    // Mirrors the real master: month names in row 1 (déc 24 in C, months from D,
    // quarters in G/K/O/S), CHARGES block with labels in column B.
    const sharedStrings = ['déc 24', 'janvier', 'février', 'mars', 'T1', 'avril', 'mai', 'juin', 'T2',
      'juillet', 'août', 'septembre', 'T3', 'octobre', 'novembre', 'décembre', 'T4',
      'CHARGES', 'Suresnes - Loyer', 'Doctolib', 'Assurances', 'Assurances', 'Total'];
    const header = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']
      .map((col, i) => `<c r="${col}1" t="s"><v>${i}</v></c>`).join('');
    const xml = '<worksheet><sheetData>' +
      `<row r="1">${header}</row>` +
      '<row r="12"><c r="B12" t="s"><v>22</v></c><c r="D12" s="2"><f t="shared" ref="D12:E12" si="17">SUM(D10:D11)</f><v>0</v></c><c r="E12" s="2"><f t="shared" si="17"/><v>0</v></c></row>' +
      '<row r="14"><c r="A14" t="s"><v>17</v></c><c r="B14" t="s"><v>18</v></c>' +
        '<c r="D14" s="18"><f t="shared" ref="D14:F14" si="18">450</f><v>450</v></c><c r="E14" s="18"><f t="shared" si="18"/><v>450</v></c><c r="F14" s="18"><f t="shared" si="18"/><v>450</v></c>' +
        '<c r="G14" s="18"><f t="shared" ref="G14:G15" si="22">SUM(D14:F14)</f><v>1350</v></c></row>' +
      '<row r="15"><c r="B15" t="s"><v>19</v></c><c r="D15" s="18"><v>149</v></c><c r="G15" s="18"><f t="shared" si="22"/><v>149</v></c></row>' +
      '<row r="16"><c r="B16" t="s"><v>20</v></c><c r="D16" s="18"><v>28.66</v></c></row>' +
      '<row r="17"><c r="B17" t="s"><v>21</v></c><c r="D17" s="18"><v>29.37</v></c></row>' +
      '<row r="18"><c r="D18" s="18"><f>SUM(D14:D17)</f></c></row>' +
      '</sheetData></worksheet>';
    const months = (jan, feb = 0) => [jan, feb, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    test('detects month columns and charge rows from the labels', () => {
      const layout = svc.detectTresoLayout(xml, sharedStrings);
      expect(layout.monthCols.slice(0, 4)).toEqual(['D', 'E', 'F', 'H']);
      expect(layout.monthCols[11]).toBe('R');
      // No dedicated RC pro row: RC pro takes the first "Assurances" row, insurance the next
      expect(layout.chargeRows).toEqual({ loyer: 14, doctolib: 15, rcpro: 16, assurance: 17 });
    });

    test('writes only the months the app has, keeping manual values elsewhere', () => {
      const out = svc.injectTresoCharges(xml, { loyer: months(500), assurance: months(0) }, sharedStrings);
      expect(out).toContain('<c r="D14" s="18"><v>500</v></c>');
      expect(out).toContain('<c r="D17" s="18"><v>29.37</v></c>');
      // The "Total" row above CHARGES is never touched
      expect(out).toContain('<f t="shared" ref="D12:E12" si="17">SUM(D10:D11)</f>');
    });

    test('unshares a shared formula before overwriting its master (no orphans)', () => {
      const out = svc.injectTresoCharges(xml, { loyer: months(500) }, sharedStrings);
      expect(out).toContain('<c r="E14" s="18"><f>450</f><v>450</v></c>');
      expect(out).toContain('<c r="F14" s="18"><f>450</f><v>450</v></c>');
      expect(out).not.toMatch(/si="18"/);
      // Quarter totals keep their shared formula
      expect(out).toContain('<f t="shared" ref="G14:G15" si="22">SUM(D14:F14)</f>');
    });

    test('warns instead of writing when the layout is unknown', () => {
      const warnings = [];
      const out = svc.injectTresoCharges('<worksheet><sheetData/></worksheet>', { loyer: months(500) }, [], warnings);
      expect(out).toBe('<worksheet><sheetData/></worksheet>');
      expect(warnings[0]).toMatch(/introuvable/);
    });
  });

  describe('shiftFormula / unshareFormulaAt', () => {
    test('shifts relative references only', () => {
      expect(svc.shiftFormula('SUM(D14:F14)', 0, 1)).toBe('SUM(D15:F15)');
      expect(svc.shiftFormula('$D$5+D5+D$5+$D5', 1, 1)).toBe('$D$5+E6+E$5+$D6');
      expect(svc.shiftFormula("'01'!D19-'01'!E19", 1, 0)).toBe("'01'!E19-'01'!F19");
    });

    test('leaves strings, table references and functions alone', () => {
      expect(svc.shiftFormula('SUMIFS(Tableau2_7[PRIX HT],Tableau2_7[PRESTATIONS],"A1")+LOG10(B2)', 1, 1))
        .toBe('SUMIFS(Tableau2_7[PRIX HT],Tableau2_7[PRESTATIONS],"A1")+LOG10(C3)');
    });

    test('does not confuse a self-closing cell with the next one', () => {
      const xml = '<row r="1"><c r="A1" s="1"/><c r="B1"><f t="shared" ref="B1:C1" si="0">A1</f><v>1</v></c><c r="C1"><f t="shared" si="0"/></c></row>';
      expect(svc.unshareFormulaAt(xml, 'A1')).toBe(xml);
      expect(svc.unshareFormulaAt(xml, 'B1')).toBe('<row r="1"><c r="A1" s="1"/><c r="B1"><f>A1</f><v>1</v></c><c r="C1"><f>B1</f></c></row>');
    });
  });

  describe('injectInvoiceTable — columns by header name', () => {
    const rowXml = (r) => `<row r="${r}">${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(c => `<c r="${c}${r}" s="1"/>`).join('')}</row>`;
    const xml = `<worksheet><sheetData>${[2, 3, 4, 5].map(rowXml).join('')}</sheetData></worksheet>`;
    // July layout: "Structure" inserted after DATE, totals row at the bottom
    const table = {
      ref: 'A2:I5',
      cols: ['DATE ', 'Structure', 'NOM', 'PRESTATIONS', 'PRIX HT', 'PRIX TTC', "MODE D'ENCAISSEMENT", 'PAYEMENT REÇU', 'N°FACTURE'],
      headerRows: 1,
      totalsRows: 1
    };
    const invoice = {
      invoice_date: '2026-07-06T10:00:00Z',
      patient: { first_name: 'Jean', last_name: 'Dupont' },
      service_description: 'Consultation de suivi',
      amount_total: 65,
      payment_method: 'CASH',
      status: 'PAID',
      invoice_number: 'INV-2026-0042',
      location_code: 'ISSY'
    };

    test('maps each value to the column of the same header', () => {
      expect(svc.invoiceColumns(table)).toMatchObject({ date: 'A', structure: 'B', name: 'C', ht: 'E', number: 'I' });

      const out = svc.injectInvoiceTable(xml, table, [invoice], 0.0175, [], '07', { ISSY: 'Issy Les Moulineaux' });
      expect(out).toContain('<c r="B3" s="1" t="inlineStr"><is><t xml:space="preserve">Issy Les Moulineaux</t></is></c>');
      expect(out).toContain('<c r="C3" s="1" t="inlineStr"><is><t xml:space="preserve">DUPONT Jean</t></is></c>');
      expect(out).toContain('<c r="E3" s="1"><v>65</v></c>');
      expect(out).toContain('<c r="I3" s="1" t="inlineStr"><is><t xml:space="preserve">INV-2026-0042</t></is></c>');
    });

    test('never writes into the totals row', () => {
      const warnings = [];
      const out = svc.injectInvoiceTable(xml, table, [invoice, invoice, invoice], 0.0175, warnings, '07', {});
      expect(out).toContain(rowXml(5));
      expect(warnings[0]).toMatch(/3 factures pour 2 lignes/);
    });

    test('leaves Structure empty when the invoice has no location', () => {
      const out = svc.injectInvoiceTable(xml, table, [{ ...invoice, location_code: null }], 0.0175, [], '07', {});
      expect(out).toContain('<c r="B3" s="1"/>');
    });
  });

  describe('dropCalcChain', () => {
    test('removes the calculation chain and its references', async () => {
      const JSZip = require('jszip');
      const zip = new JSZip();
      zip.file('[Content_Types].xml', '<Types><Override PartName="/xl/workbook.xml" ContentType="a"/><Override PartName="/xl/calcChain.xml" ContentType="b"/></Types>');
      zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId9" Type="x" Target="calcChain.xml"/></Relationships>');
      zip.file('xl/calcChain.xml', '<calcChain><c r="A1" i="1"/></calcChain>');

      await svc.dropCalcChain(zip);

      expect(zip.file('xl/calcChain.xml')).toBeNull();
      expect(await zip.file('[Content_Types].xml').async('string')).toBe('<Types><Override PartName="/xl/workbook.xml" ContentType="a"/></Types>');
      expect(await zip.file('xl/_rels/workbook.xml.rels').async('string')).toBe('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
    });
  });

  describe('receivedAmount / paymentLabel', () => {
    test('card commission applied, others full', () => {
      expect(svc.receivedAmount(65, 'CREDIT_CARD', 0.0175)).toBe(63.86);
      expect(svc.receivedAmount(50, 'CASH', 0.0175)).toBe(50);
    });
    test('payment labels map to French', () => {
      expect(svc.paymentLabel('CASH')).toBe('Espèces');
      expect(svc.paymentLabel('CREDIT_CARD')).toBe('Carte bleue');
      expect(svc.paymentLabel('Werro')).toBe('Werro');
    });
  });

  describe('toSerial (Excel date serial)', () => {
    test('2026-01-05 → 46027', () => {
      expect(svc.toSerial('2026-01-05T00:00:00.000Z')).toBe(46027);
    });
  });

  describe('parseRef', () => {
    test('parses a table ref', () => {
      expect(svc.parseRef('A2:H18')).toEqual({ c1: 'A', r1: 2, c2: 'H', r2: 18 });
      expect(svc.parseRef('J2:L5')).toEqual({ c1: 'J', r1: 2, c2: 'L', r2: 5 });
    });
  });

  describe('writeCell — in-place XML cell replacement preserving style', () => {
    const row = '<row r="3"><c r="A3" s="98"><v>1</v></c><c r="B3" s="99" t="s"><v>5</v></c><c r="C3" s="100"/></row>';

    test('replaces a number cell, keeping forced style', () => {
      const out = svc.writeCell(row, 'A3', '98', { type: 'n', value: 65 });
      expect(out).toContain('<c r="A3" s="98"><v>65</v></c>');
    });

    test('writes an inline string cell', () => {
      const out = svc.writeCell(row, 'B3', '99', { type: 's', value: 'KRINER Marie' });
      expect(out).toContain('t="inlineStr"');
      expect(out).toContain('<t xml:space="preserve">KRINER Marie</t>');
    });

    test('writes a boolean cell', () => {
      const out = svc.writeCell(row, 'C3', '100', { type: 'b', value: true });
      expect(out).toContain('<c r="C3" s="100" t="b"><v>1</v></c>');
    });

    test('blank cell keeps style, self-closing', () => {
      const out = svc.writeCell(row, 'A3', '98', { type: 'blank' });
      expect(out).toContain('<c r="A3" s="98"/>');
    });

    test('XML-escapes special characters', () => {
      const out = svc.writeCell(row, 'B3', '99', { type: 's', value: 'A & B <x>' });
      expect(out).toContain('A &amp; B &lt;x&gt;');
    });
  });
});
