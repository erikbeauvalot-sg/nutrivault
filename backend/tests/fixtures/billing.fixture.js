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
 * Valid invoice creation data
 * Note: patient_id must be set dynamically in tests
 */
const validInvoice = {
  invoice_number: 'INV-2024-001',
  amount: 85.00,
  tax_amount: 0,
  total_amount: 85.00,
  status: 'DRAFT',
  invoice_date: getDate(0),
  due_date: getDate(30),
  description: 'Initial consultation - 1 hour',
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
 * Invoice with multiple items
 */
const multiItemInvoice = {
  invoice_number: 'INV-2024-002',
  amount: 165.00,
  tax_amount: 0,
  total_amount: 165.00,
  status: 'DRAFT',
  invoice_date: getDate(0),
  due_date: getDate(30),
  description: 'Consultation and follow-up package',
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
  invoice_number: 'INV-2024-003',
  amount: 100.00,
  tax_rate: 20,
  tax_amount: 20.00,
  total_amount: 120.00,
  status: 'DRAFT',
  invoice_date: getDate(0),
  due_date: getDate(30),
  description: 'Consultation with VAT',
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
 * Invoice statuses
 */
const invoiceStatuses = {
  draft: {
    invoice_number: 'INV-DRAFT-001',
    amount: 85.00,
    total_amount: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  sent: {
    invoice_number: 'INV-SENT-001',
    amount: 85.00,
    total_amount: 85.00,
    status: 'SENT',
    invoice_date: getDate(-7),
    due_date: getDate(23)
  },
  paid: {
    invoice_number: 'INV-PAID-001',
    amount: 85.00,
    total_amount: 85.00,
    status: 'PAID',
    invoice_date: getDate(-30),
    due_date: getDate(0),
    paid_date: getDate(-5)
  },
  overdue: {
    invoice_number: 'INV-OVERDUE-001',
    amount: 85.00,
    total_amount: 85.00,
    status: 'OVERDUE',
    invoice_date: getDate(-60),
    due_date: getDate(-30)
  },
  cancelled: {
    invoice_number: 'INV-CANCELLED-001',
    amount: 85.00,
    total_amount: 85.00,
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
 * Invalid invoice data
 */
const invalidInvoices = {
  missingAmount: {
    invoice_number: 'INV-INVALID-001',
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  negativeAmount: {
    invoice_number: 'INV-INVALID-002',
    amount: -85.00,
    total_amount: -85.00,
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  invalidStatus: {
    invoice_number: 'INV-INVALID-003',
    amount: 85.00,
    total_amount: 85.00,
    status: 'invalid_status',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  missingInvoiceNumber: {
    amount: 85.00,
    total_amount: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(30)
  },
  dueDateBeforeIssue: {
    invoice_number: 'INV-INVALID-004',
    amount: 85.00,
    total_amount: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(0),
    due_date: getDate(-30)
  }
};

/**
 * Invoice update data
 */
const invoiceUpdates = {
  updateAmount: {
    amount: 100.00,
    total_amount: 100.00
  },
  markAsSent: {
    status: 'SENT'
  },
  markAsPaid: {
    status: 'PAID',
    paid_date: getDate(0)
  },
  cancel: {
    status: 'CANCELLED'
  },
  updateDescription: {
    description: 'Updated invoice description'
  }
};

/**
 * Multiple invoices for list testing
 */
const invoicesList = [
  {
    invoice_number: 'INV-LIST-001',
    amount: 85.00,
    total_amount: 85.00,
    status: 'DRAFT',
    invoice_date: getDate(-30),
    due_date: getDate(0)
  },
  {
    invoice_number: 'INV-LIST-002',
    amount: 120.00,
    total_amount: 120.00,
    status: 'SENT',
    invoice_date: getDate(-20),
    due_date: getDate(10)
  },
  {
    invoice_number: 'INV-LIST-003',
    amount: 65.00,
    total_amount: 65.00,
    status: 'PAID',
    invoice_date: getDate(-45),
    due_date: getDate(-15),
    paid_date: getDate(-10)
  },
  {
    invoice_number: 'INV-LIST-004',
    amount: 90.00,
    total_amount: 90.00,
    status: 'OVERDUE',
    invoice_date: getDate(-60),
    due_date: getDate(-30)
  }
];

/**
 * Search/filter parameters
 */
const searchParams = {
  byStatus: { status: 'DRAFT' },
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
  multiItemInvoice,
  invoiceWithTax,
  invoiceStatuses,
  payments,
  invalidInvoices,
  invoiceUpdates,
  invoicesList,
  searchParams
};
