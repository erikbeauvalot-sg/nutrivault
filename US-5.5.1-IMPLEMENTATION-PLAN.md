# Implementation Plan: US-5.5.1 - Billing Templates

**Sprint:** Sprint 5 - Templates & Communication
**User Story:** US-5.5.1
**Status:** Ready for Implementation
**Estimated Complexity:** Medium
**Git Branch:** `feature/US-5.5.1-billing-templates`

---

## Executive Summary

Build a billing template system that allows admins to create reusable service templates with predefined items and pricing. Templates can be applied when creating invoices to auto-populate line items, significantly reducing invoice creation time and ensuring pricing consistency.

**Current State:**
- ✅ Billing/Invoice system operational
- ✅ Manual invoice creation with line items
- ✅ Service description free-text entry
- ❌ NO template system for common services
- ❌ NO standardized pricing
- ❌ Repetitive data entry for recurring services

**What We're Building:**
- ✅ Billing template entity with items
- ✅ Template library management page (CRUD)
- ✅ Apply template in invoice creation
- ✅ Clone template feature
- ✅ Default template option
- ✅ Active/inactive status

---

## Acceptance Criteria

From US-5.5.1:
- ✅ New entity "Billing Template" with name, description, default amount
- ✅ Template fields: service items (name, quantity, unit price)
- ✅ Apply template when creating invoice (pre-fills items)
- ✅ Template library page for CRUD operations
- ✅ Clone template feature

---

## Database Schema

### Table 1: billing_templates

```sql
CREATE TABLE billing_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_billing_templates_active ON billing_templates(is_active);
CREATE INDEX idx_billing_templates_default ON billing_templates(is_default);
```

### Table 2: billing_template_items

```sql
CREATE TABLE billing_template_items (
  id VARCHAR(36) PRIMARY KEY,
  billing_template_id VARCHAR(36) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1.00,
  unit_price DECIMAL(10,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_template_id) REFERENCES billing_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_template_items_template ON billing_template_items(billing_template_id);
CREATE INDEX idx_billing_template_items_sort ON billing_template_items(billing_template_id, sort_order);
```

---

## Backend Implementation

### Models

**BillingTemplate.js**
```javascript
{
  id: UUID,
  name: STRING(200),
  description: TEXT,
  is_default: BOOLEAN,
  is_active: BOOLEAN,
  created_by: UUID
}

// Virtual field
total_amount: Calculated from items

// Associations
hasMany(BillingTemplateItem)
belongsTo(User, as: 'creator')
```

**BillingTemplateItem.js**
```javascript
{
  id: UUID,
  billing_template_id: UUID,
  item_name: STRING(200),
  description: TEXT,
  quantity: DECIMAL(10,2),
  unit_price: DECIMAL(10,2),
  sort_order: INTEGER
}

// Virtual field
line_total: quantity * unit_price

// Associations
belongsTo(BillingTemplate)
```

### Services

**billingTemplate.service.js**
```javascript
// Get all templates
async function getAllTemplates(filters)

// Get template by ID with items
async function getTemplateById(templateId)

// Create template with items
async function createTemplate(data, userId)

// Update template
async function updateTemplate(templateId, data, userId)

// Delete template
async function deleteTemplate(templateId)

// Clone template
async function cloneTemplate(templateId, newName, userId)

// Get default template
async function getDefaultTemplate()

// Set as default
async function setAsDefault(templateId)

// Calculate template total
async function calculateTemplateTotal(templateId)
```

### Controllers

**billingTemplateController.js**
```javascript
// GET /api/billing-templates
const getAllTemplates = async (req, res)

// GET /api/billing-templates/:id
const getTemplateById = async (req, res)

// POST /api/billing-templates
const createTemplate = async (req, res)

// PUT /api/billing-templates/:id
const updateTemplate = async (req, res)

// DELETE /api/billing-templates/:id
const deleteTemplate = async (req, res)

// POST /api/billing-templates/:id/clone
const cloneTemplate = async (req, res)

// POST /api/billing-templates/:id/set-default
const setAsDefault = async (req, res)
```

### Routes

**billingTemplates.js**
```javascript
// All routes require authentication
// Admin-only routes require billing.manage permission

router.get('/', authenticate, getAllTemplates);
router.get('/:id', authenticate, getTemplateById);
router.post('/', authenticate, requirePermission('billing.create'), createTemplate);
router.put('/:id', authenticate, requirePermission('billing.update'), updateTemplate);
router.delete('/:id', authenticate, requirePermission('billing.delete'), deleteTemplate);
router.post('/:id/clone', authenticate, requirePermission('billing.create'), cloneTemplate);
router.post('/:id/set-default', authenticate, requirePermission('billing.update'), setAsDefault);
```

---

## Frontend Implementation

### Pages

**BillingTemplatesPage.jsx**
- List all templates in table format
- Search/filter by name
- Filter by active/inactive
- Create new template button
- Edit/Delete/Clone actions per row
- Set as default option
- Show total amount per template

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Billing Templates          [+ New Template]     │
├─────────────────────────────────────────────────┤
│ Search: [____________]  [Active ▼] [Refresh]    │
├──────┬──────────────┬───────┬────────┬─────────┤
│ Name │ Description  │ Items │ Total  │ Actions │
├──────┼──────────────┼───────┼────────┼─────────┤
│ ⭐ Initial  │ First consult │  3    │ 85.00€ │ [...] │
│ Follow-up  │ Follow-up     │  2    │ 55.00€ │ [...] │
│ Package    │ 5-session pkg │  1    │ 250.00€│ [...] │
└──────┴──────────────┴───────┴────────┴─────────┘
```

### Components

**BillingTemplateModal.jsx**
- Create/Edit template form
- Template name and description
- Dynamic item list (add/remove items)
- Item fields: name, description, quantity, unit price
- Sort items (drag-drop or up/down buttons)
- Auto-calculate total
- Set as default checkbox
- Active/inactive toggle

**Form Layout:**
```
┌─────────────────────────────────────────────┐
│ Create Billing Template              [X]    │
├─────────────────────────────────────────────┤
│ Name: [_____________________________]       │
│ Description: [________________________]     │
│                                             │
│ Items:                        [+ Add Item]  │
│ ┌─────────────────────────────────────────┐ │
│ │ 1. Consultation initiale                │ │
│ │    Qty: [1.00] Price: [85.00€] [Remove] │ │
│ ├─────────────────────────────────────────┤ │
│ │ 2. Bilan nutritionnel                   │ │
│ │    Qty: [1.00] Price: [45.00€] [Remove] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Total: 130.00€                              │
│                                             │
│ ☐ Set as default template                  │
│ ☑ Active                                    │
│                                             │
│             [Cancel]  [Save Template]       │
└─────────────────────────────────────────────┘
```

**TemplateSelector.jsx** (for invoice creation)
- Dropdown selector component
- Shows template name and total
- "Apply" button
- Displays selected template items preview
- Integrated into CreateInvoicePage

### Services

**billingTemplateService.js**
```javascript
export const getAllTemplates = async (filters)
export const getTemplateById = async (templateId)
export const createTemplate = async (templateData)
export const updateTemplate = async (templateId, templateData)
export const deleteTemplate = async (templateId)
export const cloneTemplate = async (templateId, newName)
export const setAsDefault = async (templateId)
```

---

## Integration with Invoice Creation

### Updated CreateInvoicePage.jsx

**Add template selector section:**
```jsx
<Card className="mb-3">
  <Card.Header>📋 Billing Template</Card.Header>
  <Card.Body>
    <TemplateSelector
      onTemplateSelected={(template) => handleTemplateApply(template)}
    />
  </Card.Body>
</Card>
```

**Template application logic:**
```javascript
const handleTemplateApply = (template) => {
  // Clear existing service items
  setServiceDescription('');
  setServiceItems([]);

  // Apply template items
  const newItems = template.items.map(item => ({
    id: uuidv4(),
    description: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price
  }));

  setServiceItems(newItems);

  // Update service description with template name
  setServiceDescription(template.name);

  // Recalculate totals
  calculateTotals(newItems);
};
```

---

## Migrations

### Migration 1: Create billing_templates table

**File:** `backend/migrations/20260126000010-create-billing-templates.js`

### Migration 2: Create billing_template_items table

**File:** `backend/migrations/20260126000011-create-billing-template-items.js`

---

## Seeder: Default Templates

**File:** `backend/seeders/20260126000010-default-billing-templates.js`

**Default Templates:**

1. **Consultation Initiale** (Initial Consultation)
   - Consultation diététique (1h) - 85.00€
   - Bilan nutritionnel complet - 45.00€
   - Plan alimentaire personnalisé - 35.00€
   - **Total: 165.00€**

2. **Consultation de Suivi** (Follow-up Consultation)
   - Consultation de suivi (45min) - 55.00€
   - Ajustement du plan - 25.00€
   - **Total: 80.00€**

3. **Forfait 5 Séances** (5-Session Package)
   - Forfait 5 consultations - 250.00€
   - **Total: 250.00€**

---

## Navigation Integration

### Add to Sidebar

```jsx
// In Sidebar.jsx
{hasPermission('billing.read') && (
  <Nav.Link as={Link} to="/billing-templates">
    <FaFileInvoiceDollar className="me-2" />
    Billing Templates
  </Nav.Link>
)}
```

### Add Route

```jsx
// In App.jsx
<Route
  path="/billing-templates"
  element={
    <ProtectedRoute permission="billing.read">
      <BillingTemplatesPage />
    </ProtectedRoute>
  }
/>
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Day 1)
1. Create migrations for tables
2. Create models with associations
3. Update models/index.js
4. Run migrations
5. Create seeder with default templates
6. Run seeder

### Phase 2: Backend Services & API (Day 2)
1. Create billingTemplate.service.js
2. Create billingTemplateController.js
3. Create routes
4. Register routes in server.js
5. Test API endpoints

### Phase 3: Frontend Template Management (Day 3)
1. Create billingTemplateService.js
2. Create BillingTemplatesPage.jsx
3. Create BillingTemplateModal.jsx
4. Add navigation link
5. Add route to App.jsx

### Phase 4: Invoice Integration (Day 4)
1. Create TemplateSelector.jsx component
2. Update CreateInvoicePage.jsx
3. Implement template application logic
4. Test invoice creation with templates

### Phase 5: Testing & Polish (Day 5)
1. Manual testing of all CRUD operations
2. Test clone functionality
3. Test default template feature
4. Test invoice creation with templates
5. UI polish and error handling
6. Documentation

---

## Testing Checklist

### Backend
- [ ] Create template with items
- [ ] Get all templates
- [ ] Get template by ID with items
- [ ] Update template
- [ ] Delete template (cascades to items)
- [ ] Clone template
- [ ] Set as default (clears other defaults)
- [ ] Calculate template total
- [ ] Inactive templates excluded from listing

### Frontend
- [ ] Templates page loads and displays list
- [ ] Create new template modal
- [ ] Add/remove items dynamically
- [ ] Edit existing template
- [ ] Delete template with confirmation
- [ ] Clone template
- [ ] Set as default
- [ ] Template selector in invoice creation
- [ ] Apply template populates invoice items
- [ ] Totals calculate correctly

### Integration
- [ ] Template applied to invoice creates correct line items
- [ ] Template total matches invoice total
- [ ] Can edit items after applying template
- [ ] Default template pre-selected in invoice creation

---

## API Endpoints Summary

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/billing-templates` | `billing.read` | Get all templates |
| GET | `/api/billing-templates/:id` | `billing.read` | Get template by ID |
| POST | `/api/billing-templates` | `billing.create` | Create new template |
| PUT | `/api/billing-templates/:id` | `billing.update` | Update template |
| DELETE | `/api/billing-templates/:id` | `billing.delete` | Delete template |
| POST | `/api/billing-templates/:id/clone` | `billing.create` | Clone template |
| POST | `/api/billing-templates/:id/set-default` | `billing.update` | Set as default |

---

## Success Criteria

- ✅ Admins can create, edit, delete billing templates
- ✅ Templates include multiple line items with pricing
- ✅ Templates can be applied to invoice creation
- ✅ Clone template creates exact copy with new name
- ✅ Default template option works
- ✅ Invoice creation time reduced by 50%+
- ✅ All features have proper error handling
- ✅ Responsive UI on all devices

---

**Ready to implement!** 🚀

**Estimated Total Time:** 4-5 days
**Plan Created:** 2026-01-25
