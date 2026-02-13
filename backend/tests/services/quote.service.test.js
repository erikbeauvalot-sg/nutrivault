/**
 * Quote Service Tests
 * Tests for quote CRUD, version increment on edit, status transitions, totals calculation
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let db;
let quoteService;

describe('Quote Service', () => {
  let adminAuth, dietitianAuth;
  let testClient;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    quoteService = require('../../src/services/quote.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();

    // Create test client
    testClient = await db.Client.create({
      client_type: 'person',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@test.com',
      phone: '0612345678',
      created_by: adminAuth.user.id,
      is_active: true
    });
  });

  // ========================================
  // createQuote
  // ========================================
  describe('createQuote', () => {
    it('should create a quote with auto-generated number', async () => {
      const result = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Consultation package',
        items: [
          { item_name: 'Initial consultation', quantity: 1, unit_price: 80 },
          { item_name: 'Follow-up', quantity: 3, unit_price: 50 }
        ],
        tax_rate: 20
      });

      const currentYear = new Date().getFullYear();
      expect(result.quote_number).toMatch(new RegExp(`^DEV-${currentYear}-\\d{4}$`));
      expect(result.status).toBe('DRAFT');
      expect(result.client.id).toBe(testClient.id);
      expect(result.items.length).toBe(2);
    });

    it('should calculate totals correctly', async () => {
      const result = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [
          { item_name: 'Item A', quantity: 2, unit_price: 100 },
          { item_name: 'Item B', quantity: 1, unit_price: 50 }
        ],
        tax_rate: 10
      });

      // Subtotal: (2*100) + (1*50) = 250
      expect(parseFloat(result.amount_subtotal)).toBe(250);
      // Tax: 250 * 10% = 25
      expect(parseFloat(result.amount_tax)).toBe(25);
      // Total: 250 + 25 = 275
      expect(parseFloat(result.amount_total)).toBe(275);
    });

    it('should auto-increment quote numbers', async () => {
      const first = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [{ item_name: 'A', quantity: 1, unit_price: 10 }]
      });
      const second = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [{ item_name: 'B', quantity: 1, unit_price: 20 }]
      });

      const firstNum = parseInt(first.quote_number.split('-')[2]);
      const secondNum = parseInt(second.quote_number.split('-')[2]);
      expect(secondNum).toBe(firstNum + 1);
    });

    it('should default validity to +30 days from quote_date', async () => {
      const result = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        quote_date: '2026-03-01',
        items: [{ item_name: 'Service', quantity: 1, unit_price: 100 }]
      });

      const quoteDate = new Date('2026-03-01');
      const validityDate = new Date(result.validity_date);
      const diffDays = Math.round((validityDate - quoteDate) / 86400000);
      expect(diffDays).toBe(30);
    });

    it('should throw 404 for non-existent client', async () => {
      await expect(
        quoteService.createQuote(adminAuth.user, {
          client_id: '00000000-0000-0000-0000-000000000000',
          items: [{ item_name: 'X', quantity: 1, unit_price: 10 }]
        })
      ).rejects.toThrow('Client not found');
    });
  });

  // ========================================
  // updateQuote — version increment
  // ========================================
  describe('updateQuote — version increment', () => {
    let testQuote;

    beforeEach(async () => {
      testQuote = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Original quote',
        items: [{ item_name: 'Service', quantity: 1, unit_price: 100 }],
        tax_rate: 0
      });
    });

    it('should add -02 suffix on first edit', async () => {
      const originalNumber = testQuote.quote_number; // e.g., DEV-2026-0001

      const updated = await quoteService.updateQuote(testQuote.id, adminAuth.user, {
        subject: 'Updated quote v2'
      });

      expect(updated.quote_number).toBe(`${originalNumber}-02`);
    });

    it('should increment to -03 on second edit', async () => {
      const originalNumber = testQuote.quote_number;

      // First edit: → -02
      await quoteService.updateQuote(testQuote.id, adminAuth.user, {
        subject: 'v2'
      });

      // Second edit: → -03
      const updated = await quoteService.updateQuote(testQuote.id, adminAuth.user, {
        subject: 'v3'
      });

      expect(updated.quote_number).toBe(`${originalNumber}-03`);
    });

    it('should increment to -04 on third edit', async () => {
      const originalNumber = testQuote.quote_number;

      await quoteService.updateQuote(testQuote.id, adminAuth.user, { subject: 'v2' });
      await quoteService.updateQuote(testQuote.id, adminAuth.user, { subject: 'v3' });
      const updated = await quoteService.updateQuote(testQuote.id, adminAuth.user, { subject: 'v4' });

      expect(updated.quote_number).toBe(`${originalNumber}-04`);
    });

    it('should recalculate totals when items change', async () => {
      const updated = await quoteService.updateQuote(testQuote.id, adminAuth.user, {
        items: [
          { item_name: 'New service', quantity: 2, unit_price: 200 }
        ],
        tax_rate: 20
      });

      // Subtotal: 2 * 200 = 400
      expect(parseFloat(updated.amount_subtotal)).toBe(400);
      // Tax: 400 * 20% = 80
      expect(parseFloat(updated.amount_tax)).toBe(80);
      // Total: 480
      expect(parseFloat(updated.amount_total)).toBe(480);
    });

    it('should replace items on update', async () => {
      const updated = await quoteService.updateQuote(testQuote.id, adminAuth.user, {
        items: [
          { item_name: 'Item A', quantity: 1, unit_price: 50 },
          { item_name: 'Item B', quantity: 1, unit_price: 75 }
        ]
      });

      expect(updated.items.length).toBe(2);
      const names = updated.items.map(i => i.item_name).sort();
      expect(names).toEqual(['Item A', 'Item B']);
    });

    it('should reject editing non-DRAFT quotes', async () => {
      // Change status to SENT
      await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT');

      await expect(
        quoteService.updateQuote(testQuote.id, adminAuth.user, { subject: 'nope' })
      ).rejects.toThrow('Only DRAFT quotes can be edited');
    });

    it('should throw 404 for non-existent quote', async () => {
      await expect(
        quoteService.updateQuote('00000000-0000-0000-0000-000000000000', adminAuth.user, {
          subject: 'nope'
        })
      ).rejects.toThrow('Quote not found');
    });

    it('should deny dietitian from updating other users quotes', async () => {
      await expect(
        quoteService.updateQuote(testQuote.id, dietitianAuth.user, {
          subject: 'hacked'
        })
      ).rejects.toThrow('Quote not found');
    });
  });

  // ========================================
  // getQuotes
  // ========================================
  describe('getQuotes', () => {
    beforeEach(async () => {
      await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Quote Alpha',
        items: [{ item_name: 'A', quantity: 1, unit_price: 100 }]
      });
      await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Quote Beta',
        items: [{ item_name: 'B', quantity: 1, unit_price: 200 }]
      });
    });

    it('should return paginated quotes', async () => {
      const result = await quoteService.getQuotes(adminAuth.user);

      expect(result).toHaveProperty('quotes');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result.quotes.length).toBe(2);
    });

    it('should filter by search (subject)', async () => {
      const result = await quoteService.getQuotes(adminAuth.user, { search: 'Alpha' });

      expect(result.total).toBe(1);
      expect(result.quotes[0].subject).toBe('Quote Alpha');
    });

    it('should filter by client_id', async () => {
      const otherClient = await db.Client.create({
        client_type: 'company',
        company_name: 'Other Corp',
        created_by: adminAuth.user.id,
        is_active: true
      });

      await quoteService.createQuote(adminAuth.user, {
        client_id: otherClient.id,
        subject: 'Other quote',
        items: [{ item_name: 'C', quantity: 1, unit_price: 50 }]
      });

      const result = await quoteService.getQuotes(adminAuth.user, { client_id: testClient.id });

      expect(result.total).toBe(2);
      result.quotes.forEach(q => {
        expect(q.client_id).toBe(testClient.id);
      });
    });

    it('should filter by status', async () => {
      const result = await quoteService.getQuotes(adminAuth.user, { status: 'DRAFT' });

      expect(result.total).toBe(2);
      result.quotes.forEach(q => {
        expect(q.status).toBe('DRAFT');
      });
    });

    it('should apply pagination', async () => {
      const result = await quoteService.getQuotes(adminAuth.user, { page: 1, limit: 1 });

      expect(result.quotes.length).toBe(1);
      expect(result.totalPages).toBe(2);
    });
  });

  // ========================================
  // getQuoteById
  // ========================================
  describe('getQuoteById', () => {
    it('should return quote with client, items, and creator', async () => {
      const created = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Detailed quote',
        items: [{ item_name: 'Consultation', quantity: 1, unit_price: 80 }]
      });

      const result = await quoteService.getQuoteById(created.id, adminAuth.user);

      expect(result.id).toBe(created.id);
      expect(result.client).toBeDefined();
      expect(result.client.first_name).toBe('Jean');
      expect(result.items.length).toBe(1);
      expect(result.creator).toBeDefined();
    });

    it('should throw 404 for non-existent quote', async () => {
      await expect(
        quoteService.getQuoteById('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Quote not found');
    });
  });

  // ========================================
  // deleteQuote — soft delete
  // ========================================
  describe('deleteQuote', () => {
    it('should soft delete a quote', async () => {
      const created = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [{ item_name: 'X', quantity: 1, unit_price: 10 }]
      });

      const result = await quoteService.deleteQuote(created.id, adminAuth.user);
      expect(result.message).toBe('Quote deleted successfully');

      const raw = await db.Quote.findByPk(created.id);
      expect(raw.is_active).toBe(false);
    });

    it('should throw 404 for non-existent quote', async () => {
      await expect(
        quoteService.deleteQuote('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Quote not found');
    });
  });

  // ========================================
  // changeQuoteStatus
  // ========================================
  describe('changeQuoteStatus', () => {
    let testQuote;

    beforeEach(async () => {
      testQuote = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [{ item_name: 'Service', quantity: 1, unit_price: 100 }]
      });
    });

    it('should transition DRAFT → SENT', async () => {
      const result = await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT');
      expect(result.status).toBe('SENT');
    });

    it('should transition SENT → ACCEPTED', async () => {
      await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT');
      const result = await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'ACCEPTED');

      expect(result.status).toBe('ACCEPTED');
      expect(result.accepted_date).toBeDefined();
    });

    it('should transition SENT → DECLINED with reason', async () => {
      await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT');
      const result = await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'DECLINED', {
        declined_reason: 'Too expensive'
      });

      expect(result.status).toBe('DECLINED');
      expect(result.declined_reason).toBe('Too expensive');
    });

    it('should reject invalid status transitions', async () => {
      // DRAFT → ACCEPTED (invalid, must go through SENT first)
      await expect(
        quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'ACCEPTED')
      ).rejects.toThrow('Cannot change status from DRAFT to ACCEPTED');
    });

    it('should reject transitions from terminal states', async () => {
      await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT');
      await quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'ACCEPTED');

      await expect(
        quoteService.changeQuoteStatus(testQuote.id, adminAuth.user, 'SENT')
      ).rejects.toThrow('Cannot change status from ACCEPTED to SENT');
    });

    it('should throw 404 for non-existent quote', async () => {
      await expect(
        quoteService.changeQuoteStatus('00000000-0000-0000-0000-000000000000', adminAuth.user, 'SENT')
      ).rejects.toThrow('Quote not found');
    });
  });

  // ========================================
  // convertToInvoice
  // ========================================
  describe('convertToInvoice', () => {
    let acceptedQuote;

    beforeEach(async () => {
      acceptedQuote = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Invoice conversion',
        items: [
          { item_name: 'Consultation', quantity: 2, unit_price: 80 }
        ],
        tax_rate: 20
      });
      await quoteService.changeQuoteStatus(acceptedQuote.id, adminAuth.user, 'SENT');
      await quoteService.changeQuoteStatus(acceptedQuote.id, adminAuth.user, 'ACCEPTED');
    });

    it('should convert ACCEPTED quote to invoice', async () => {
      const result = await quoteService.convertToInvoice(acceptedQuote.id, adminAuth.user);

      expect(result.invoice).toBeDefined();
      expect(result.invoice.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(parseFloat(result.invoice.amount_total)).toBe(parseFloat(acceptedQuote.amount_total));
      expect(result.invoice.status).toBe('DRAFT');
    });

    it('should link quote to the created invoice', async () => {
      const result = await quoteService.convertToInvoice(acceptedQuote.id, adminAuth.user);

      const updatedQuote = await db.Quote.findByPk(acceptedQuote.id);
      expect(updatedQuote.billing_id).toBe(result.invoice.id);
    });

    it('should reject non-ACCEPTED quotes', async () => {
      const draftQuote = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        items: [{ item_name: 'X', quantity: 1, unit_price: 10 }]
      });

      await expect(
        quoteService.convertToInvoice(draftQuote.id, adminAuth.user)
      ).rejects.toThrow('Only ACCEPTED quotes can be converted');
    });

    it('should reject already converted quotes', async () => {
      await quoteService.convertToInvoice(acceptedQuote.id, adminAuth.user);

      await expect(
        quoteService.convertToInvoice(acceptedQuote.id, adminAuth.user)
      ).rejects.toThrow('already been converted');
    });
  });

  // ========================================
  // duplicateQuote
  // ========================================
  describe('duplicateQuote', () => {
    it('should create a copy with new quote number', async () => {
      const original = await quoteService.createQuote(adminAuth.user, {
        client_id: testClient.id,
        subject: 'Original',
        items: [{ item_name: 'Service', quantity: 1, unit_price: 100 }],
        tax_rate: 10
      });

      const duplicate = await quoteService.duplicateQuote(original.id, adminAuth.user);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.quote_number).not.toBe(original.quote_number);
      expect(duplicate.subject).toBe(original.subject);
      expect(duplicate.client_id).toBe(original.client_id);
      expect(duplicate.items.length).toBe(1);
      expect(duplicate.status).toBe('DRAFT');
    });

    it('should throw 404 for non-existent quote', async () => {
      await expect(
        quoteService.duplicateQuote('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Quote not found');
    });
  });
});
