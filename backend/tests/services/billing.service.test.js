/**
 * Billing Service Unit Tests
 */

const billingService = require('../../src/services/billing.service');
const db = require('../../../models');
const { AppError } = require('../../src/middleware/errorHandler');
const { createRole, createUser, createPatient, createVisit, createBilling } = require('../helpers');

describe('Billing Service', () => {
  describe('getBillingRecords', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;
    let patient1, patient2, billing1, billing2, billing3;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian1 = await createUser({
        username: 'dietitian1',
        email: 'dietitian1@example.com',
        role: dietitianRole
      });

      dietitian2 = await createUser({
        username: 'dietitian2',
        email: 'dietitian2@example.com',
        role: dietitianRole
      });

      patient1 = await createPatient({ dietitian: dietitian1 });
      patient2 = await createPatient({ dietitian: dietitian2 });

      billing1 = await createBilling({ patient: patient1, status: 'PENDING' });
      billing2 = await createBilling({ patient: patient1, status: 'PAID' });
      billing3 = await createBilling({ patient: patient2, status: 'PENDING' });
    });

    it('should get all billing records for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingRecords({}, admin);

      expect(result.billing).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should get only assigned patients billing for dietitian', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingRecords({}, dietitian1);

      expect(result.billing).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter billing by status', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingRecords({ status: 'PAID' }, admin);

      expect(result.billing).toHaveLength(1);
      expect(result.billing[0].status).toBe('PAID');
    });

    it('should paginate results', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingRecords({ limit: 2, offset: 0 }, admin);

      expect(result.billing).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(3);
    });
  });

  describe('getBillingById', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, billing;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
      billing = await createBilling({ patient });
    });

    it('should get billing by ID for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingById(billing.id, admin);

      expect(result).toBeDefined();
      expect(result.id).toBe(billing.id);
      expect(result.patient).toBeDefined();
    });

    it('should get billing by ID for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.getBillingById(billing.id, dietitian);

      expect(result).toBeDefined();
      expect(result.id).toBe(billing.id);
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.getBillingById(billing.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only view billing for your assigned patients');
    });

    it('should throw error if billing not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.getBillingById('nonexistent-id', admin)
      ).rejects.toThrow('Billing record not found');
    });
  });

  describe('createBilling', () => {
    let adminRole, dietitianRole, admin, dietitian, patient, visit;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
      visit = await createVisit({ patient, dietitian });
    });

    it('should create billing successfully', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: patient.id,
        visit_id: visit.id,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 100.00,
        tax_amount: 10.00
      };

      const result = await billingService.createBilling(billingData, admin.id, admin);

      expect(result).toBeDefined();
      expect(result.patient_id).toBe(patient.id);
      expect(parseFloat(result.amount)).toBeCloseTo(100.00, 2);
      expect(parseFloat(result.tax_amount)).toBeCloseTo(10.00, 2);
      expect(parseFloat(result.total_amount)).toBeCloseTo(110.00, 2);
      expect(result.invoice_number).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(result.status).toBe('PENDING');
    });

    it('should generate unique invoice numbers', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData1 = {
        patient_id: patient.id,
        invoice_date: new Date(),
        due_date: new Date(),
        amount: 100.00
      };

      const billingData2 = { ...billingData1 };

      const result1 = await billingService.createBilling(billingData1, admin.id, admin);
      const result2 = await billingService.createBilling(billingData2, admin.id, admin);

      expect(result1.invoice_number).not.toBe(result2.invoice_number);
    });

    it('should throw error if required fields missing', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: patient.id
        // Missing invoice_date, due_date, amount
      };

      await expect(
        billingService.createBilling(billingData, admin.id, admin)
      ).rejects.toThrow('Patient ID, invoice date, due date, and amount are required');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: 'nonexistent-id',
        invoice_date: new Date(),
        due_date: new Date(),
        amount: 100.00
      };

      await expect(
        billingService.createBilling(billingData, admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });

    it('should throw error if visit not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: patient.id,
        visit_id: 'nonexistent-id',
        invoice_date: new Date(),
        due_date: new Date(),
        amount: 100.00
      };

      await expect(
        billingService.createBilling(billingData, admin.id, admin)
      ).rejects.toThrow('Visit not found');
    });

    it('should throw error if visit does not belong to patient', async () => {
      const otherPatient = await createPatient({ dietitian });
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: otherPatient.id,
        visit_id: visit.id, // Visit belongs to different patient
        invoice_date: new Date(),
        due_date: new Date(),
        amount: 100.00
      };

      await expect(
        billingService.createBilling(billingData, admin.id, admin)
      ).rejects.toThrow('Visit does not belong to this patient');
    });

    it('should deny non-assigned dietitian from creating billing', async () => {
      const otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const billingData = {
        patient_id: patient.id,
        invoice_date: new Date(),
        due_date: new Date(),
        amount: 100.00
      };

      await expect(
        billingService.createBilling(billingData, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only manage billing for your assigned patients');
    });
  });

  describe('updateBilling', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, billing;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
      billing = await createBilling({
        patient,
        amount: 100.00,
        tax_amount: 10.00,
        status: 'PENDING'
      });
    });

    it('should update billing successfully', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        status: 'PAID',
        payment_method: 'Credit Card'
      };

      const result = await billingService.updateBilling(billing.id, updates, admin.id, admin);

      expect(result.status).toBe('PAID');
      expect(result.payment_method).toBe('Credit Card');
    });

    it('should recalculate total when amount or tax changes', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        amount: 150.00,
        tax_amount: 15.00
      };

      const result = await billingService.updateBilling(billing.id, updates, admin.id, admin);

      expect(parseFloat(result.amount)).toBeCloseTo(150.00, 2);
      expect(parseFloat(result.tax_amount)).toBeCloseTo(15.00, 2);
      expect(parseFloat(result.total_amount)).toBeCloseTo(165.00, 2);
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = { status: 'PAID' };

      await expect(
        billingService.updateBilling(billing.id, updates, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only update billing for your assigned patients');
    });

    it('should ignore non-allowed fields', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        status: 'PAID',
        invoice_number: 'HACKED', // Should be ignored
        patient_id: 'different-patient' // Should be ignored
      };

      const result = await billingService.updateBilling(billing.id, updates, admin.id, admin);

      expect(result.status).toBe('PAID');
      expect(result.invoice_number).toBe(billing.invoice_number); // Should remain unchanged
      expect(result.patient_id).toBe(patient.id); // Should remain unchanged
    });

    it('should throw error if billing not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.updateBilling('nonexistent-id', { status: 'PAID' }, admin.id, admin)
      ).rejects.toThrow('Billing record not found');
    });
  });

  describe('deleteBilling', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, pendingBilling, paidBilling;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
      pendingBilling = await createBilling({ patient, status: 'PENDING' });
      paidBilling = await createBilling({ patient, status: 'PAID' });
    });

    it('should delete pending billing for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await billingService.deleteBilling(pendingBilling.id, admin.id, admin);

      expect(result.message).toBe('Billing record deleted successfully');

      // Verify billing is deleted
      const deletedBilling = await db.Billing.findByPk(pendingBilling.id);
      expect(deletedBilling).toBeNull();
    });

    it('should prevent deletion of paid invoices', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.deleteBilling(paidBilling.id, admin.id, admin)
      ).rejects.toThrow('Cannot delete paid invoices');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.deleteBilling(pendingBilling.id, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only delete billing for your assigned patients');
    });

    it('should throw error if billing not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        billingService.deleteBilling('nonexistent-id', admin.id, admin)
      ).rejects.toThrow('Billing record not found');
    });
  });

  describe('markAsPaid', () => {
    let admin, patient, billing;

    beforeEach(async () => {
      const adminRole = await createRole({ name: 'ADMIN' });
      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      const dietitianRole = await createRole({ name: 'DIETITIAN' });
      const dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
      billing = await createBilling({ patient, status: 'PENDING' });
    });

    it('should mark invoice as paid', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const paymentData = {
        payment_method: 'Credit Card',
        payment_date: '2024-01-15'
      };

      const result = await billingService.markAsPaid(billing.id, paymentData, admin.id, admin);

      expect(result.status).toBe('PAID');
      expect(result.payment_method).toBe('Credit Card');
      expect(result.payment_date).toBe('2024-01-15');
    });

    it('should use current date if payment_date not provided', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const paymentData = {
        payment_method: 'Cash'
      };

      const result = await billingService.markAsPaid(billing.id, paymentData, admin.id, admin);

      expect(result.status).toBe('PAID');
      expect(result.payment_date).toBeDefined();
    });

    it('should throw error if already paid', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });
      await billing.update({ status: 'PAID' });

      const paymentData = {
        payment_method: 'Credit Card'
      };

      await expect(
        billingService.markAsPaid(billing.id, paymentData, admin.id, admin)
      ).rejects.toThrow('Invoice is already marked as paid');
    });
  });

  describe('getBillingStats', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;
    let patient1, patient2;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian1 = await createUser({
        username: 'dietitian1',
        email: 'dietitian1@example.com',
        role: dietitianRole
      });

      dietitian2 = await createUser({
        username: 'dietitian2',
        email: 'dietitian2@example.com',
        role: dietitianRole
      });

      patient1 = await createPatient({ dietitian: dietitian1 });
      patient2 = await createPatient({ dietitian: dietitian2 });

      // Create billing records
      await createBilling({ patient: patient1, status: 'PENDING', amount: 100.00, tax_amount: 10.00 });
      await createBilling({ patient: patient1, status: 'PAID', amount: 200.00, tax_amount: 20.00 });
      await createBilling({ patient: patient2, status: 'PENDING', amount: 150.00, tax_amount: 15.00 });
    });

    it('should return correct billing statistics for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await billingService.getBillingStats({}, admin);

      expect(stats.total_invoices).toBe(3);
      expect(parseFloat(stats.total_revenue)).toBeCloseTo(495.00, 2); // 110 + 220 + 165
      expect(parseFloat(stats.paid_revenue)).toBeCloseTo(220.00, 2);
      expect(parseFloat(stats.pending_revenue)).toBeCloseTo(275.00, 2); // 110 + 165
      expect(stats.by_status).toBeDefined();
    });

    it('should return only assigned patient billing statistics for dietitian', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await billingService.getBillingStats({}, dietitian1);

      expect(stats.total_invoices).toBe(2);
      expect(parseFloat(stats.total_revenue)).toBeCloseTo(330.00, 2); // 110 + 220
    });
  });
});
