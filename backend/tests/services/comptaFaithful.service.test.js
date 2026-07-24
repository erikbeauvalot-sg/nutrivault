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

  describe('injectTresoCharges', () => {
    // Minimal TRÉSO-like rows for Loyer(12) with Jan(C)+Feb(D)+Mar(E) and T1(F)/TOTAL(T).
    const xml = '<worksheet><sheetData>' +
      '<row r="12"><c r="C12" s="1"><v>999</v></c><c r="D12" s="1"><v>999</v></c><c r="E12" s="1"><v>0</v></c><c r="F12" s="1"><v>111</v></c><c r="T12" s="1"><v>222</v></c></row>' +
      '<row r="13"><c r="C13" s="1"/><c r="F13" s="1"/><c r="T13" s="1"/></row>' +
      '<row r="14"><c r="C14" s="1"/><c r="F14" s="1"/><c r="T14" s="1"/></row>' +
      '<row r="15"><c r="C15" s="1"/><c r="F15" s="1"/><c r="T15" s="1"/></row>' +
      '<row r="16"><c r="F16" s="1"><v>88</v></c><c r="T16" s="1"><v>99</v></c></row>' +
      '</sheetData></worksheet>';

    test('writes monthly sum values for Loyer', () => {
      const out = svc.injectTresoCharges(xml, { loyer: [450, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
      expect(out).toContain('<c r="C12" s="1"><v>450</v></c>');
    });

    test('leaves quarter/total shared-formula cells untouched (no orphaning)', () => {
      const out = svc.injectTresoCharges(xml, { loyer: [450, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
      // F12/T12 must keep their original content (here plain cached values),
      // never rewritten — overwriting shared-formula masters corrupts the file.
      expect(out).toContain('<c r="F12" s="1"><v>111</v></c>');
      expect(out).toContain('<c r="T12" s="1"><v>222</v></c>');
      expect(out).toContain('<c r="F16" s="1"><v>88</v></c>');
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
