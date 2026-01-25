/**
 * Billing Fixtures
 * Test data for billing/invoice-related tests
 */

/**
 * Get a date string
 * @param {number} daysOffset - Days from today (positive = future, negative = past)
 * @returns {string} ISO date string
 */
function getDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Valid invoice creation data for API calls
 * Note: patient_id must be set dynamically in tests
 * Field names match API validation requirements
 */
const validInvoice = {
  service_description: 'Initial consultation - 1 hour',
  amount_total: 85.00,
  due_date: getDate(30),
  items: [
    {
      description: 'Initial consultation (60 min)',
      quantity: 1,
      unit_price: 85.00,
      amount: 85.00
    }
  ]
};

/**
 * Valid invoice for direct DB creation
 * Includes all required model fields
 */
const validInvoiceDB = {
  invoice_number: 'INV-TEST-001',
  invoice_date: getDate(0),
  service_description: 'Initial consultation - 1 hour',
  amount_total: 85.00,
  amount_due: 85.00,
  status: 'DRAFT',
  due_date: getDate(30)
};

/**
 * Invoice with multiple items
 */
const multiItemInvoice = {
  service_description: 'Consultation and follow-up package',
  amount_total: 165.00,
  due_date: getDate(30),
  items: [
    {
      description: 'Initial consultation (60 min)',
      quantity: 1,
      unit_price: 85.00,
      amount: 85.00
    },
    {
      description: 'Follow-up consultation (30 min)',
      quantity: 2,
      unit_price: 40.00,
      amount: 80.00
    }
  ]
};

/**
 * Invoice with tax
 */
const invoiceWithTax = {
  service_description: 'Consultation with VAT',
  amount_total: 120.00,
  due_date: getDate(30),
  items: [
    {
      description: 'Consultation services',
      quantity: 1,
      unit_price: 100.00,
      amount: 100.00
    }
  ]
};

/**
 * Invoice statuses (for direct DB creation)
 */
const invoiceStatuses = {
  draft: {
    invoice_number: 'INV-DRAFT-001',
    service_description: 'Draft invoice',
    amount_total: 85.00,
    amount_due: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  sent: {
    invoice_number: 'INV-SENT-001',
    service_description: 'Sent invoice',
    amount_total: 85.00,
    amount_due: 85.00,
    status: 'SENT',
    invoice_date: getDate(-7),
    due_date: getDate(23)
  },
  paid: {
    invoice_number: 'INV-PAID-001',
    service_description: 'Paid invoice',
    amount_total: 85.00,
    amount_paid: 85.00,
    amount_due: 0,
    status: 'PAID',
    invoice_date: getDate(-30),
    due_date: getDate(0)
  },
  overdue: {
    invoice_number: 'INV-OVERDUE-001',
    service_description: 'Overdue invoice',
    amount_total: 85.00,
    amount_due: 85.00,
    status: 'OVERDUE',
    invoice_date: getDate(-60),
    due_date: getDate(-30)
  },
  cancelled: {
    invoice_number: 'INV-CANCELLED-001',
    service_description: 'Cancelled invoice',
    amount_total: 85.00,
    amount_due: 0,
    status: 'CANCELLED',
    invoice_date: getDate(-14),
    due_date: getDate(16)
  }
};

/**
 * Payment data
 */
const payments = {
  fullPayment: {
    amount: 85.00,
    payment_method: 'card',
    payment_date: getDate(0),
    reference: 'PAY-001',
    notes: 'Full payment received'
  },
  partialPayment: {
    amount: 50.00,
    payment_method: 'cash',
    payment_date: getDate(0),
    reference: 'PAY-002',
    notes: 'Partial payment'
  },
  chequePayment: {
    amount: 85.00,
    payment_method: 'cheque',
    payment_date: getDate(0),
    reference: 'CHQ-12345',
    notes: 'Cheque payment'
  },
  bankTransfer: {
    amount: 85.00,
    payment_method: 'bank_transfer',
    payment_date: getDate(0),
    reference: 'TRF-2024-001',
    notes: 'Bank transfer received'
  }
};

/**
 * Invalid invoice data (for API validation tests)
 */
const invalidInvoices = {
  missingAmount: {
    service_description: 'Missing amount invoice',
    due_date: getDate(30)
  },
  negativeAmount: {
    service_description: 'Negative amount invoice',
    amount_total: -85.00,
    due_date: getDate(30)
  },
  invalidStatus: {
    service_description: 'Invalid status invoice',
    amount_total: 85.00,
    status: 'invalid_status',
    due_date: getDate(30)
  },
  missingDescription: {
    amount_total: 85.00,
    due_date: getDate(30)
  },
  zeroAmount: {
    service_description: 'Zero amount invoice',
    amount_total: 0,
    due_date: getDate(30)
  }
};

/**
 * Invoice update data
 */
const invoiceUpdates = {
  updateAmount: {
    amount_total: 100.00
  },
  markAsSent: {
    status: 'SENT'
  },
  markAsPaid: {
    status: 'PAID'
  },
  cancel: {
    status: 'CANCELLED'
  },
  updateDescription: {
    service_description: 'Updated invoice description'
  }
};

/**
 * Multiple invoices for list testing (for direct DB creation)
 */
const invoicesList = [
  {
    invoice_number: 'INV-LIST-001',
    service_description: 'List invoice 1',
    amount_total: 85.00,
    amount_due: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(-30),
    due_date: getDate(0)
  },
  {
    invoice_number: 'INV-LIST-002',
    service_description: 'List invoice 2',
    amount_total: 120.00,
    amount_due: 120.00,
    status: 'SENT',
    invoice_date: getDate(-20),
    due_date: getDate(10)
  },
  {
    invoice_number: 'INV-LIST-003',
    service_description: 'List invoice 3',
    amount_total: 65.00,
    amount_paid: 65.00,
    amount_due: 0,
    status: 'PAID',
    invoice_date: getDate(-45),
    due_date: getDate(-15)
  },
  {
    invoice_number: 'INV-LIST-004',
    service_description: 'List invoice 4',
    amount_total: 90.00,
    amount_due: 90.00,
    status: 'OVERDUE',
    invoice_date: getDate(-60),
    due_date: getDate(-30)
  }
];

/**
 * Search/filter parameters (for API query strings)
 */
const searchParams = {
  byStatus: { status: 'DRAFT' },
  byStatusSent: { status: 'SENT' },
  byStatusPaid: { status: 'PAID' },
  byDateRange: {
    start_date: getDate(-60),
    end_date: getDate(0)
  },
  overdue: { overdue: true },
  unpaid: { unpaid: true },
  paginated: { page: 1, limit: 10 }
};

module.exports = {
  getDate,
  validInvoice,
  validInvoiceDB,
  multiItemInvoice,
  invoiceWithTax,
  invoiceStatuses,
  payments,
  invalidInvoices,
  invoiceUpdates,
  invoicesList,
  searchParams
};
