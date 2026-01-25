/**
 * Billing Templates Fixtures
 * Test data for billing template-related tests
 */

/**
 * Valid billing template
 */
const validTemplate = {
  name: 'Standard Consultation',
  description: 'Template for standard dietitian consultations',
  is_active: true,
  items: [
    {
      item_name: 'Initial Consultation (60 min)',
      quantity: 1,
      unit_price: 85.00
    }
  ]
};

/**
 * Template with multiple items
 */
const multiItemTemplate = {
  name: 'Consultation Package',
  description: 'Initial consultation with follow-ups',
  is_active: true,
  items: [
    {
      item_name: 'Initial Consultation (60 min)',
      quantity: 1,
      unit_price: 85.00
    },
    {
      item_name: 'Follow-up Consultation (30 min)',
      quantity: 3,
      unit_price: 45.00
    },
    {
      item_name: 'Personalized Meal Plan',
      quantity: 1,
      unit_price: 50.00
    }
  ]
};

/**
 * Template with tax
 */
const templateWithTax = {
  name: 'Taxable Services',
  description: 'Services subject to VAT',
  is_active: true,
  items: [
    {
      item_name: 'Consulting Service',
      quantity: 1,
      unit_price: 100.00
    }
  ]
};

/**
 * Various billing templates
 */
const templatesList = [
  {
    name: 'Quick Consultation',
    description: '30-minute follow-up session',
    is_active: true,
    items: [
      {
        item_name: 'Quick Consultation (30 min)',
        quantity: 1,
        unit_price: 45.00
      }
    ]
  },
  {
    name: 'Extended Session',
    description: '90-minute in-depth consultation',
    is_active: true,
    items: [
      {
        item_name: 'Extended Consultation (90 min)',
        quantity: 1,
        unit_price: 120.00
      }
    ]
  },
  {
    name: 'Group Workshop',
    description: 'Group nutrition workshop',
    is_active: true,
    items: [
      {
        item_name: 'Group Workshop (2 hours)',
        quantity: 1,
        unit_price: 200.00
      },
      {
        item_name: 'Workshop Materials',
        quantity: 1,
        unit_price: 25.00
      }
    ]
  },
  {
    name: 'Monthly Package',
    description: 'Monthly consultation package',
    is_active: true,
    items: [
      {
        item_name: 'Weekly Check-in (15 min)',
        quantity: 4,
        unit_price: 25.00
      },
      {
        item_name: 'Monthly Review Session (60 min)',
        quantity: 1,
        unit_price: 85.00
      }
    ]
  }
];

/**
 * Invalid template data
 */
const invalidTemplates = {
  missingName: {
    description: 'Template without name',
    is_active: true,
    items: [
      {
        item_name: 'Service',
        quantity: 1,
        unit_price: 50.00
      }
    ]
  },
  emptyItems: {
    name: 'Empty Items Template',
    description: 'Template with no items',
    is_active: true,
    items: []
  },
  invalidItemPrice: {
    name: 'Invalid Price Template',
    description: 'Item with negative price',
    is_active: true,
    items: [
      {
        item_name: 'Service',
        quantity: 1,
        unit_price: -50.00
      }
    ]
  },
  invalidQuantity: {
    name: 'Invalid Quantity Template',
    description: 'Item with zero quantity',
    is_active: true,
    items: [
      {
        item_name: 'Service',
        quantity: 0,
        unit_price: 50.00
      }
    ]
  },
  missingItemName: {
    name: 'Missing Item Name Template',
    description: 'Item without name',
    is_active: true,
    items: [
      {
        quantity: 1,
        unit_price: 50.00
      }
    ]
  }
};

/**
 * Template update data
 */
const templateUpdates = {
  updateName: {
    name: 'Updated Template Name'
  },
  updateDescription: {
    description: 'Updated template description'
  },
  deactivate: {
    is_active: false
  },
  updateItems: {
    items: [
      {
        item_name: 'Updated Service',
        quantity: 2,
        unit_price: 60.00
      }
    ]
  }
};

/**
 * Template application data (for creating invoices from templates)
 */
const templateApplication = {
  // Overrides when applying template to invoice
  overrides: {
    description: 'Applied from template with modifications',
    items: [
      {
        item_name: 'Initial Consultation (60 min)',
        quantity: 1,
        unit_price: 85.00
      },
      {
        item_name: 'Additional Service',
        quantity: 1,
        unit_price: 30.00
      }
    ]
  }
};

module.exports = {
  validTemplate,
  multiItemTemplate,
  templateWithTax,
  templatesList,
  invalidTemplates,
  templateUpdates,
  templateApplication
};
