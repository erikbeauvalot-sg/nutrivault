/**
 * Billing Service Tests
 * Tests for billing.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures, visits: visitFixtures, billing: billingFixtures } = require('../fixtures');

let db;
let billingService;

describe('Billing Service', () => {
  let adminAuth, dietitianAuth;
  let testPatient, testVisit;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    billingService = require('../../src/services/billing.service');
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

    // Create test patient with M2M link
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Create test visit
    testVisit = await db.Visit.create({
      ...visitFixtures.validVisit,
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });
  });

  // ========================================
  // getInvoices
  // ========================================
  describe('getInvoices', () => {
    beforeEach(async () => {
      for (const invoice of billingFixtures.invoicesList) {
        await db.Billing.create({
          ...invoice,
          patient_id: testPatient.id
        });
      }
    });

    it('should return paginated invoices for admin', async () => {
      const result = await billingService.getInvoices(adminAuth.user);

      expect(result).toHaveProperty('invoices');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages');
      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
    });

    it('should return invoices for dietitian (scoped)', async () => {
      const result = await billingService.getInvoices(dietitianAuth.user);

      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty result for VIEWER user', async () => {
      await db.Role.findOrCreate({ where: { name: 'VIEWER' }, defaults: { description: 'View only', is_active: true } });
      const viewerAuth = await testAuth.createUser('VIEWER');

      const result = await billingService.getInvoices(viewerAuth.user);

      expect(result.invoices).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter by patient_id', async () => {
      const result = await billingService.getInvoices(adminAuth.user, {
        patient_id: testPatient.id
      });

      result.invoices.forEach(inv => {
        expect(inv.patient_id).toBe(testPatient.id);
      });
    });

    it('should filter by visit_id', async () => {
      // Create an invoice with visit_id
      await db.Billing.create({
        invoice_number: 'INV-VISIT-001',
        patient_id: testPatient.id,
        visit_id: testVisit.id,
        service_description: 'Visit consultation',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        is_active: true
      });

      const result = await billingService.getInvoices(adminAuth.user, {
        visit_id: testVisit.id
      });

      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
      result.invoices.forEach(inv => {
        expect(inv.visit_id).toBe(testVisit.id);
      });
    });

    it('should filter by status', async () => {
      const result = await billingService.getInvoices(adminAuth.user, {
        status: 'DRAFT'
      });

      result.invoices.forEach(inv => {
        expect(inv.status).toBe('DRAFT');
      });
    });

    it('should filter by search term', async () => {
      const result = await billingService.getInvoices(adminAuth.user, {
        search: 'INV-LIST'
      });

      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by date range', async () => {
      const result = await billingService.getInvoices(adminAuth.user, {
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      });

      expect(result.invoices.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply pagination', async () => {
      const result = await billingService.getInvoices(adminAuth.user, {
        page: 1,
        limit: 2
      });

      expect(result.invoices.length).toBeLessThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should include patient info in invoices', async () => {
      const result = await billingService.getInvoices(adminAuth.user);

      result.invoices.forEach(inv => {
        expect(inv.patient).toBeDefined();
        expect(inv.patient.first_name).toBeDefined();
      });
    });
  });

  // ========================================
  // getInvoiceById
  // ========================================
  describe('getInvoiceById', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should return invoice with full details', async () => {
      const result = await billingService.getInvoiceById(testInvoice.id, adminAuth.user);

      expect(result.id).toBe(testInvoice.id);
      expect(result.invoice_number).toBe(billingFixtures.validInvoiceDB.invoice_number);
      expect(result.patient).toBeDefined();
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.getInvoiceById('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Invoice not found');
    });

    it('should include patient details', async () => {
      const result = await billingService.getInvoiceById(testInvoice.id, adminAuth.user);

      expect(result.patient.first_name).toBe(patientFixtures.validPatient.first_name);
      expect(result.patient.last_name).toBe(patientFixtures.validPatient.last_name);
    });

    it('should include payments in response', async () => {
      const result = await billingService.getInvoiceById(testInvoice.id, adminAuth.user);

      expect(result.payments).toBeDefined();
      expect(Array.isArray(result.payments)).toBe(true);
    });

    it('should include email history', async () => {
      const result = await billingService.getInvoiceById(testInvoice.id, adminAuth.user);

      expect(result.email_history).toBeDefined();
      expect(Array.isArray(result.email_history)).toBe(true);
    });

    it('should deny access for unauthorized dietitian', async () => {
      const otherDietitian = await testAuth.createDietitian();

      await expect(
        billingService.getInvoiceById(testInvoice.id, otherDietitian.user)
      ).rejects.toThrow('Access denied');
    });
  });

  // ========================================
  // createInvoice
  // ========================================
  describe('createInvoice', () => {
    it('should create invoice with auto-generated number', async () => {
      const invoiceData = {
        patient_id: testPatient.id,
        service_description: 'Test consultation',
        amount_total: 100.00,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const result = await billingService.createInvoice(invoiceData, adminAuth.user);

      expect(result.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(result.amount_total).toBe(100);
      expect(result.amount_due).toBe(100);
      expect(result.amount_paid).toBe(0);
      expect(result.status).toBe('DRAFT');
    });

    it('should auto-increment invoice number', async () => {
      const invoiceData = {
        patient_id: testPatient.id,
        service_description: 'First',
        amount_total: 50
      };

      const first = await billingService.createInvoice(invoiceData, adminAuth.user);
      const second = await billingService.createInvoice(
        { ...invoiceData, service_description: 'Second' },
        adminAuth.user
      );

      const firstNum = parseInt(first.invoice_number.split('-')[2]);
      const secondNum = parseInt(second.invoice_number.split('-')[2]);
      expect(secondNum).toBe(firstNum + 1);
    });

    it('should reject non-existent patient', async () => {
      const invoiceData = {
        patient_id: '00000000-0000-0000-0000-000000000000',
        service_description: 'Test',
        amount_total: 50
      };

      await expect(
        billingService.createInvoice(invoiceData, adminAuth.user)
      ).rejects.toThrow('Patient not found');
    });

    it('should set default due date if not provided', async () => {
      const invoiceData = {
        patient_id: testPatient.id,
        service_description: 'No due date',
        amount_total: 50
      };

      const result = await billingService.createInvoice(invoiceData, adminAuth.user);

      expect(result.due_date).toBeDefined();
    });

    it('should create invoice with visit link', async () => {
      const invoiceData = {
        patient_id: testPatient.id,
        visit_id: testVisit.id,
        service_description: 'Visit consultation',
        amount_total: 85
      };

      const result = await billingService.createInvoice(invoiceData, adminAuth.user);

      expect(result.visit_id).toBe(testVisit.id);
    });

    it('should deny VIEWER from creating invoices', async () => {
      await db.Role.findOrCreate({ where: { name: 'VIEWER' }, defaults: { description: 'View only', is_active: true } });
      const viewerAuth = await testAuth.createUser('VIEWER');
      const invoiceData = {
        patient_id: testPatient.id,
        service_description: 'Viewer attempt',
        amount_total: 50
      };

      await expect(
        billingService.createInvoice(invoiceData, viewerAuth.user)
      ).rejects.toThrow('Access denied');
    });

    it('should reject cancelled visit', async () => {
      const cancelledVisit = await db.Visit.create({
        ...visitFixtures.visitStatuses.cancelled,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });

      const invoiceData = {
        patient_id: testPatient.id,
        visit_id: cancelledVisit.id,
        service_description: 'Test',
        amount_total: 50
      };

      await expect(
        billingService.createInvoice(invoiceData, adminAuth.user)
      ).rejects.toThrow('Visit not found or not eligible');
    });
  });

  // ========================================
  // updateInvoice
  // ========================================
  describe('updateInvoice', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should update allowed fields', async () => {
      const result = await billingService.updateInvoice(
        testInvoice.id,
        { service_description: 'Updated description', notes: 'Some notes' },
        adminAuth.user
      );

      expect(result.service_description).toBe('Updated description');
    });

    it('should recalculate amount_due when amount_total changes', async () => {
      // First record a partial payment
      await testInvoice.update({ amount_paid: 30, amount_due: 55 });

      const result = await billingService.updateInvoice(
        testInvoice.id,
        { amount_total: 100 },
        adminAuth.user
      );

      expect(parseFloat(result.amount_due)).toBe(70); // 100 - 30
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.updateInvoice(
          '00000000-0000-0000-0000-000000000000',
          { notes: 'test' },
          adminAuth.user
        )
      ).rejects.toThrow('Invoice not found');
    });

    it('should deny VIEWER from updating invoices', async () => {
      await db.Role.findOrCreate({ where: { name: 'VIEWER' }, defaults: { description: 'View only', is_active: true } });
      const viewerAuth = await testAuth.createUser('VIEWER');

      await expect(
        billingService.updateInvoice(testInvoice.id, { notes: 'test' }, viewerAuth.user)
      ).rejects.toThrow('Access denied');
    });

    it('should allow status update', async () => {
      const result = await billingService.updateInvoice(
        testInvoice.id,
        { status: 'SENT' },
        adminAuth.user
      );

      expect(result.status).toBe('SENT');
    });
  });

  // ========================================
  // recordPayment
  // ========================================
  describe('recordPayment', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id
      });
    });

    it('should record full payment and mark as PAID', async () => {
      const result = await billingService.recordPayment(
        testInvoice.id,
        billingFixtures.payments.fullPayment,
        adminAuth.user
      );

      expect(parseFloat(result.amount_paid)).toBe(85);
      expect(parseFloat(result.amount_due)).toBe(0);
      expect(result.status).toBe('PAID');
    });

    it('should record partial payment', async () => {
      const result = await billingService.recordPayment(
        testInvoice.id,
        billingFixtures.payments.partialPayment,
        adminAuth.user
      );

      expect(parseFloat(result.amount_paid)).toBe(50);
      expect(parseFloat(result.amount_due)).toBe(35);
    });

    it('should create Payment record', async () => {
      await billingService.recordPayment(
        testInvoice.id,
        billingFixtures.payments.fullPayment,
        adminAuth.user
      );

      const payments = await db.Payment.findAll({
        where: { billing_id: testInvoice.id }
      });

      expect(payments.length).toBe(1);
      expect(parseFloat(payments[0].amount)).toBe(85);
      expect(payments[0].payment_method).toBe('CREDIT_CARD');
    });

    it('should reject zero or negative payment', async () => {
      await expect(
        billingService.recordPayment(
          testInvoice.id,
          { amount: 0, payment_method: 'CASH' },
          adminAuth.user
        )
      ).rejects.toThrow('Payment amount must be greater than 0');

      await expect(
        billingService.recordPayment(
          testInvoice.id,
          { amount: -10, payment_method: 'CASH' },
          adminAuth.user
        )
      ).rejects.toThrow('Payment amount must be greater than 0');
    });

    it('should reject payment exceeding due amount', async () => {
      await expect(
        billingService.recordPayment(
          testInvoice.id,
          { amount: 1000, payment_method: 'CASH' },
          adminAuth.user
        )
      ).rejects.toThrow('Payment amount cannot exceed due amount');
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.recordPayment(
          '00000000-0000-0000-0000-000000000000',
          billingFixtures.payments.fullPayment,
          adminAuth.user
        )
      ).rejects.toThrow('Invoice not found');
    });

    it('should deny VIEWER from recording payments', async () => {
      await db.Role.findOrCreate({ where: { name: 'VIEWER' }, defaults: { description: 'View only', is_active: true } });
      const viewerAuth = await testAuth.createUser('VIEWER');

      await expect(
        billingService.recordPayment(
          testInvoice.id,
          billingFixtures.payments.fullPayment,
          viewerAuth.user
        )
      ).rejects.toThrow('Access denied');
    });

    it('should set status to OVERDUE for partial payment past due date', async () => {
      // Set due date in the past
      const pastDueInvoice = await db.Billing.create({
        invoice_number: 'INV-PAST-001',
        patient_id: testPatient.id,
        service_description: 'Past due test',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date('2019-12-01'),
        due_date: new Date('2020-01-01'),
        status: 'SENT',
        is_active: true
      });

      const result = await billingService.recordPayment(
        pastDueInvoice.id,
        { amount: 30, payment_method: 'CASH' },
        adminAuth.user
      );

      expect(result.status).toBe('OVERDUE');
      expect(parseFloat(result.amount_due)).toBe(70);
    });
  });

  // ========================================
  // deleteInvoice
  // ========================================
  describe('deleteInvoice', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should soft-delete invoice (admin only)', async () => {
      const result = await billingService.deleteInvoice(testInvoice.id, adminAuth.user);
      expect(result).toBe(true);

      // Verify soft-deleted
      const deleted = await db.Billing.findByPk(testInvoice.id);
      expect(deleted.is_active).toBe(false);
    });

    it('should deny non-admin deletion', async () => {
      await expect(
        billingService.deleteInvoice(testInvoice.id, dietitianAuth.user)
      ).rejects.toThrow('Only administrators can delete invoices');
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.deleteInvoice('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Invoice not found');
    });
  });

  // ========================================
  // markAsPaid
  // ========================================
  describe('markAsPaid', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id
      });
    });

    it('should mark invoice as fully paid', async () => {
      const result = await billingService.markAsPaid(testInvoice.id, adminAuth.user);

      expect(result.status).toBe('PAID');
      expect(parseFloat(result.amount_due)).toBe(0);
    });

    it('should reject already paid invoice', async () => {
      const paidInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.paid,
        patient_id: testPatient.id,
        invoice_number: 'INV-PAID-002'
      });

      await expect(
        billingService.markAsPaid(paidInvoice.id, adminAuth.user)
      ).rejects.toThrow('already marked as paid');
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.markAsPaid('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Invoice not found');
    });

    it('should create a Payment record for the full amount', async () => {
      await billingService.markAsPaid(testInvoice.id, adminAuth.user);

      const payments = await db.Payment.findAll({
        where: { billing_id: testInvoice.id }
      });

      expect(payments.length).toBe(1);
      expect(parseFloat(payments[0].amount)).toBe(85);
    });

    it('should reject when no outstanding balance', async () => {
      // Set amount_due to 0 with status SENT (edge case)
      const zeroDueInvoice = await db.Billing.create({
        invoice_number: 'INV-ZERO-001',
        patient_id: testPatient.id,
        service_description: 'Zero due test',
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        is_active: true
      });

      await expect(
        billingService.markAsPaid(zeroDueInvoice.id, adminAuth.user)
      ).rejects.toThrow('No outstanding balance to pay');
    });
  });

  // ========================================
  // changeInvoiceStatus
  // ========================================
  describe('changeInvoiceStatus', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should change invoice status', async () => {
      const result = await billingService.changeInvoiceStatus(
        testInvoice.id, 'SENT', adminAuth.user
      );

      expect(result.status).toBe('SENT');
    });

    it('should reject invalid status', async () => {
      await expect(
        billingService.changeInvoiceStatus(
          testInvoice.id, 'INVALID', adminAuth.user
        )
      ).rejects.toThrow('Invalid status value');
    });

    it('should return invoice unchanged if same status', async () => {
      const result = await billingService.changeInvoiceStatus(
        testInvoice.id, 'DRAFT', adminAuth.user
      );

      expect(result.status).toBe('DRAFT');
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.changeInvoiceStatus(
          '00000000-0000-0000-0000-000000000000', 'SENT', adminAuth.user
        )
      ).rejects.toThrow('Invoice not found');
    });
  });

  // ========================================
  // updatePaymentAmount
  // ========================================
  describe('updatePaymentAmount', () => {
    let testInvoice;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id
      });
    });

    it('should update payment amount and recalculate', async () => {
      const result = await billingService.updatePaymentAmount(
        testInvoice.id, 50, adminAuth.user
      );

      expect(parseFloat(result.amount_paid)).toBe(50);
      expect(parseFloat(result.amount_due)).toBe(35); // 85 - 50
    });

    it('should mark as PAID when fully paid', async () => {
      const result = await billingService.updatePaymentAmount(
        testInvoice.id, 85, adminAuth.user
      );

      expect(result.status).toBe('PAID');
      expect(parseFloat(result.amount_due)).toBe(0);
    });

    it('should reject negative amount', async () => {
      await expect(
        billingService.updatePaymentAmount(testInvoice.id, -10, adminAuth.user)
      ).rejects.toThrow('Invalid payment amount');
    });

    it('should reject amount exceeding total', async () => {
      await expect(
        billingService.updatePaymentAmount(testInvoice.id, 1000, adminAuth.user)
      ).rejects.toThrow('Payment amount cannot exceed total amount');
    });

    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.updatePaymentAmount(
          '00000000-0000-0000-0000-000000000000', 50, adminAuth.user
        )
      ).rejects.toThrow('Invoice not found');
    });

    it('should set OVERDUE when partial payment and past due date', async () => {
      const pastDueInvoice = await db.Billing.create({
        invoice_number: 'INV-PDUE-UPD',
        patient_id: testPatient.id,
        service_description: 'Past due update',
        amount_total: 100,
        amount_paid: 80,
        amount_due: 20,
        invoice_date: new Date('2019-12-01'),
        due_date: new Date('2020-01-01'),
        status: 'PAID',
        is_active: true
      });

      const result = await billingService.updatePaymentAmount(
        pastDueInvoice.id, 50, adminAuth.user
      );

      expect(result.status).toBe('OVERDUE');
      expect(parseFloat(result.amount_due)).toBe(50);
    });

    it('should set SENT when reducing from PAID and not overdue', async () => {
      const futureDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const paidInvoice = await db.Billing.create({
        invoice_number: 'INV-PAID-UPD',
        patient_id: testPatient.id,
        service_description: 'Paid then reduced',
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        invoice_date: new Date(),
        due_date: futureDue,
        status: 'PAID',
        is_active: true
      });

      const result = await billingService.updatePaymentAmount(
        paidInvoice.id, 50, adminAuth.user
      );

      expect(result.status).toBe('SENT');
      expect(parseFloat(result.amount_due)).toBe(50);
    });
  });

  // ========================================
  // changePaymentStatus
  // ========================================
  describe('changePaymentStatus', () => {
    let testInvoice, testPayment;

    beforeEach(async () => {
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id,
        amount_paid: 85,
        amount_due: 0,
        status: 'PAID'
      });

      testPayment = await db.Payment.create({
        billing_id: testInvoice.id,
        amount: 85,
        payment_method: 'CASH',
        payment_date: new Date(),
        recorded_by: adminAuth.user.id,
        status: 'PAID'
      });
    });

    it('should cancel a payment and recalculate invoice', async () => {
      const result = await billingService.changePaymentStatus(
        testPayment.id, 'CANCELLED', adminAuth.user
      );

      expect(result.payment.status).toBe('CANCELLED');
      // Invoice should no longer be PAID since the only payment was cancelled
      expect(parseFloat(result.invoice.amount_paid)).toBe(0);
      expect(parseFloat(result.invoice.amount_due)).toBe(85);
    });

    it('should reject invalid status', async () => {
      await expect(
        billingService.changePaymentStatus(testPayment.id, 'INVALID', adminAuth.user)
      ).rejects.toThrow('Invalid payment status');
    });

    it('should return unchanged if same status', async () => {
      const result = await billingService.changePaymentStatus(
        testPayment.id, 'PAID', adminAuth.user
      );

      expect(result.payment.status).toBe('PAID');
    });

    it('should throw 404 for non-existent payment', async () => {
      await expect(
        billingService.changePaymentStatus(
          '00000000-0000-0000-0000-000000000000', 'CANCELLED', adminAuth.user
        )
      ).rejects.toThrow('Payment not found');
    });

    it('should set OVERDUE when cancelling payment and invoice past due', async () => {
      const pastDueInvoice = await db.Billing.create({
        invoice_number: 'INV-CPDUE-001',
        patient_id: testPatient.id,
        service_description: 'Cancel past due',
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        invoice_date: new Date('2019-12-01'),
        due_date: new Date('2020-01-01'),
        status: 'PAID',
        is_active: true
      });

      const payment = await db.Payment.create({
        billing_id: pastDueInvoice.id,
        amount: 100,
        payment_method: 'CASH',
        payment_date: new Date(),
        recorded_by: adminAuth.user.id,
        status: 'PAID'
      });

      const result = await billingService.changePaymentStatus(
        payment.id, 'CANCELLED', adminAuth.user
      );

      expect(result.invoice.status).toBe('OVERDUE');
    });

    it('should set SENT when cancelling payment and invoice not past due', async () => {
      const futureDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const futureInvoice = await db.Billing.create({
        invoice_number: 'INV-CFUT-001',
        patient_id: testPatient.id,
        service_description: 'Cancel future due',
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        invoice_date: new Date(),
        due_date: futureDue,
        status: 'PAID',
        is_active: true
      });

      const payment = await db.Payment.create({
        billing_id: futureInvoice.id,
        amount: 100,
        payment_method: 'CASH',
        payment_date: new Date(),
        recorded_by: adminAuth.user.id,
        status: 'PAID'
      });

      const result = await billingService.changePaymentStatus(
        payment.id, 'CANCELLED', adminAuth.user
      );

      expect(result.invoice.status).toBe('SENT');
    });

    it('should set PAID when re-activating payment that covers full amount', async () => {
      // Create invoice with partial paid
      const inv = await db.Billing.create({
        invoice_number: 'INV-REACTIVATE',
        patient_id: testPatient.id,
        service_description: 'Reactivate test',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        is_active: true
      });

      // Create a cancelled payment
      const payment = await db.Payment.create({
        billing_id: inv.id,
        amount: 100,
        payment_method: 'CASH',
        payment_date: new Date(),
        recorded_by: adminAuth.user.id,
        status: 'CANCELLED'
      });

      const result = await billingService.changePaymentStatus(
        payment.id, 'PAID', adminAuth.user
      );

      expect(result.invoice.status).toBe('PAID');
      expect(parseFloat(result.invoice.amount_due)).toBe(0);
    });
  });

  // ========================================
  // sendInvoiceEmail
  // ========================================
  describe('sendInvoiceEmail', () => {
    it('should throw 404 for non-existent invoice', async () => {
      await expect(
        billingService.sendInvoiceEmail('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Invoice not found');
    });

    it('should handle email send failure gracefully', async () => {
      const invoice = await db.Billing.create({
        invoice_number: 'INV-EMAILFAIL',
        patient_id: testPatient.id,
        service_description: 'Email fail test',
        amount_total: 50,
        amount_paid: 0,
        amount_due: 50,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        is_active: true
      });

      // This will fail because PDF generation / email sending are not set up in test
      await expect(
        billingService.sendInvoiceEmail(invoice.id, adminAuth.user)
      ).rejects.toThrow('Failed to send invoice email');

      // Verify email log was created with FAILED status
      const emailLog = await db.InvoiceEmail.findOne({
        where: { billing_id: invoice.id }
      });
      expect(emailLog).not.toBeNull();
      expect(emailLog.status).toBe('FAILED');

      // Invoice status should remain DRAFT (not updated to SENT on failure)
      const updatedInvoice = await db.Billing.findByPk(invoice.id);
      expect(updatedInvoice.status).toBe('DRAFT');
    });

    it('should throw when patient has no email', async () => {
      // Create patient without email
      const noEmailPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        email: null,
        phone: '0612345678',
        assigned_dietitian_id: dietitianAuth.user.id
      });

      const invoice = await db.Billing.create({
        invoice_number: 'INV-NOEMAIL-001',
        patient_id: noEmailPatient.id,
        service_description: 'No email test',
        amount_total: 50,
        amount_paid: 0,
        amount_due: 50,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        is_active: true
      });

      await expect(
        billingService.sendInvoiceEmail(invoice.id, adminAuth.user)
      ).rejects.toThrow();
    });
  });

  // ========================================
  // sendInvoiceBatch
  // ========================================
  describe('sendInvoiceBatch', () => {
    it('should handle batch with non-existent invoices gracefully', async () => {
      const result = await billingService.sendInvoiceBatch(
        ['00000000-0000-0000-0000-000000000000'],
        adminAuth.user
      );

      expect(result.totalRequested).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.successful.length).toBe(0);
    });
  });

  // ========================================
  // sendReminderBatch
  // ========================================
  describe('sendReminderBatch', () => {
    it('should handle batch with non-existent invoices gracefully', async () => {
      const result = await billingService.sendReminderBatch(
        ['00000000-0000-0000-0000-000000000000'],
        adminAuth.user
      );

      expect(result.totalRequested).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.successful.length).toBe(0);
    });

    it('should skip already paid invoices', async () => {
      const paidInvoice = await db.Billing.create({
        invoice_number: 'INV-REMPAID-001',
        patient_id: testPatient.id,
        service_description: 'Paid reminder test',
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        is_active: true
      });

      const result = await billingService.sendReminderBatch(
        [paidInvoice.id],
        adminAuth.user
      );

      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('already paid');
    });

    it('should handle email send errors gracefully per invoice', async () => {
      // Invoice with valid patient (has email) - will fail during actual send
      const invoice = await db.Billing.create({
        invoice_number: 'INV-REMFAIL',
        patient_id: testPatient.id,
        service_description: 'Reminder fail test',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date(),
        due_date: new Date('2020-01-01'),
        status: 'OVERDUE',
        is_active: true
      });

      const result = await billingService.sendReminderBatch(
        [invoice.id],
        adminAuth.user
      );

      // Email send will fail in test env, but should be handled gracefully
      expect(result.totalRequested).toBe(1);
      // Either succeeds or fails based on email service - both are valid
      expect(result.successful.length + result.failed.length).toBe(1);
    });

    it('should fail for patient without email', async () => {
      const noEmailPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        email: null,
        phone: '0698765432',
        assigned_dietitian_id: dietitianAuth.user.id
      });

      const invoice = await db.Billing.create({
        invoice_number: 'INV-REMNOEML',
        patient_id: noEmailPatient.id,
        service_description: 'No email reminder',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        is_active: true
      });

      const result = await billingService.sendReminderBatch(
        [invoice.id],
        adminAuth.user
      );

      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('email');
    });
  });
});
