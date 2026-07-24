/**
 * Comptabilité Export Service — unit tests
 * Focus on the pure mapping/business logic (card commission, payment labels,
 * patient name formatting). No DB required.
 */

const svc = require('../../src/services/comptaExport.service');

describe('comptaExport.service — mapping helpers', () => {
  describe('receivedAmount', () => {
    const rate = 0.0175;

    test('card payment is net of commission', () => {
      // 65 * (1 - 0.0175) = 63.8625 → 63.86
      expect(svc.receivedAmount(65, 'CREDIT_CARD', rate)).toBe(63.86);
    });

    test('non-card payment received in full (HT === received)', () => {
      expect(svc.receivedAmount(50, 'CASH', rate)).toBe(50);
      expect(svc.receivedAmount(50, 'CHECK', rate)).toBe(50);
      expect(svc.receivedAmount(50, 'BANK_TRANSFER', rate)).toBe(50);
    });

    test('recognizes already-French card label', () => {
      expect(svc.receivedAmount(65, 'Carte bleue', rate)).toBe(63.86);
    });

    test('null/empty payment method received in full', () => {
      expect(svc.receivedAmount(70, null, rate)).toBe(70);
      expect(svc.receivedAmount(70, '', rate)).toBe(70);
    });

    test('zero amount stays zero', () => {
      expect(svc.receivedAmount(0, 'CREDIT_CARD', rate)).toBe(0);
    });
  });

  describe('paymentLabel', () => {
    test('maps app payment methods to French labels', () => {
      expect(svc.paymentLabel('CREDIT_CARD')).toBe('Carte bleue');
      expect(svc.paymentLabel('CASH')).toBe('Espèces');
      expect(svc.paymentLabel('CHECK')).toBe('Chèque');
      expect(svc.paymentLabel('BANK_TRANSFER')).toBe('Virement');
    });

    test('passes through unknown values unchanged', () => {
      expect(svc.paymentLabel('Werro')).toBe('Werro');
    });

    test('empty method yields empty string', () => {
      expect(svc.paymentLabel(null)).toBe('');
      expect(svc.paymentLabel('')).toBe('');
    });
  });

  describe('patientName', () => {
    test('formats as UPPERCASE last name + first name', () => {
      expect(svc.patientName({ first_name: 'Marie-Laure', last_name: 'Kriner' }))
        .toBe('KRINER Marie-Laure');
    });

    test('handles missing parts gracefully', () => {
      expect(svc.patientName({ last_name: 'Dupont' })).toBe('DUPONT');
      expect(svc.patientName({ first_name: 'Jean' })).toBe('Jean');
      expect(svc.patientName(null)).toBe('');
    });
  });
});
