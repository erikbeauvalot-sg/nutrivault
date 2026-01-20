# Visit Workflow Improvements

## Current Issue

When creating a visit with "Complete Immediately" checked, the user is redirected to the billing page immediately after creation. This doesn't allow them to add clinical data (measurements, assessment, recommendations) to the visit.

## User Requirements

The user wants a workflow where:
1. Create a new visit with "Now" datetime (current time)
2. **First**: View/edit the visit page to add all visit data:
   - Measurements (weight, BMI, blood pressure, etc.)
   - Clinical information (chief complaint, assessment, recommendations)
   - Any other visit notes
3. **Then**: Navigate to billing with the invoice pre-loaded for "Record Payment"
   - The invoice should be automatically created when the visit is marked as COMPLETED
   - The billing form should be pre-filled with the invoice amount and details

## Current Workflow

```
[Create Visit Modal]
  ↓ (Check "Complete Immediately")
  ↓ (Click Save)
[Visit Created as COMPLETED]
  ↓
[Backend creates invoice automatically]
  ↓
[Navigate to /billing/:invoiceId or /billing]
  ↓
[User sees billing page]
```

**Problem**: User can't add measurements or clinical data before going to billing.

## Proposed Workflow

### Option 1: Keep Modal Open in Edit Mode (Simpler)

```
[Create Visit Modal]
  ↓ (Check "Complete Immediately")
  ↓ (Click "Create Visit")
[Visit Created as COMPLETED]
  ↓
[Modal switches to Edit mode]
  ↓ (Show measurements section expanded)
  ↓ (User adds measurements, clinical data)
  ↓ (Click "Save & Go to Billing")
[Visit Updated]
  ↓
[Navigate to /billing/:invoiceId]
  ↓
[Billing page loads with invoice]
```

### Option 2: Create Visit Detail Page (More Complex)

```
[Create Visit Modal]
  ↓ (Check "Complete Immediately")
  ↓ (Click "Create Visit")
[Visit Created as COMPLETED]
  ↓
[Navigate to /visits/:visitId/edit]
  ↓ (Full page visit editor)
  ↓ (User adds measurements, clinical data)
  ↓ (Click "Save & Go to Billing")
[Visit Updated]
  ↓
[Navigate to /billing/:invoiceId]
  ↓
[Billing page loads with invoice]
```

## Recommended Approach

**Option 1** is recommended because:
1. Simpler to implement
2. Consistent with current modal-based editing pattern
3. Doesn't require creating new pages/routes
4. Faster development time

## Implementation Details

### Changes to VisitModal Component

**File**: `frontend/src/components/VisitModal.jsx`

1. **State Changes**:
   - Add state to track if we should stay in the modal after creation
   - Track the created invoice ID for navigation

2. **After Visit Creation**:
   ```javascript
   // In onSubmit function, after successful creation
   if (completeImmediately && savedVisit) {
     // Don't close modal immediately
     // Switch to edit mode
     setModalMode('edit');
     setSelectedVisit(savedVisit);
     setShowMeasurements(true); // Expand measurements accordion
     // Store invoice ID for later navigation
     setCreatedInvoiceId(savedVisit.created_invoice?.id);
   } else {
     onHide();
   }
   ```

3. **Add New Button**:
   - When in edit mode after creating with "complete immediately"
   - Show "Save & Go to Billing" button instead of regular "Save"
   - This button saves the visit updates and navigates to billing

4. **Button Logic**:
   ```javascript
   {isEditMode && createdInvoiceId && (
     <Button
       variant="success"
       onClick={handleSaveAndGoToBilling}
       disabled={loading}
     >
       {t('visits.savAndGoToBilling')}
     </Button>
   )}
   ```

### New Translations Needed

Add to `frontend/src/locales/fr.json`:
```json
{
  "visits": {
    "saveAndGoToBilling": "Enregistrer et aller à la facturation",
    "addVisitData": "Ajouter les données de la visite",
    "fillInMeasurements": "Remplissez les mesures et les informations cliniques avant de passer à la facturation"
  }
}
```

Add to `frontend/src/locales/en.json`:
```json
{
  "visits": {
    "saveAndGoToBilling": "Save & Go to Billing",
    "addVisitData": "Add Visit Data",
    "fillInMeasurements": "Fill in measurements and clinical information before proceeding to billing"
  }
}
```

### Changes to Billing Page

**File**: `frontend/src/pages/BillingPage.jsx` (or similar)

The billing page should already handle loading an invoice by ID when navigating to `/billing/:invoiceId`.

If not, add:
1. Route parameter extraction
2. Auto-load invoice details
3. Auto-switch to "Record Payment" mode with invoice pre-filled

## Testing Checklist

- [ ] Create visit without "Complete Immediately" → works as before (modal closes)
- [ ] Create visit with "Complete Immediately" → modal switches to edit mode
- [ ] Add measurements in edit mode → measurements save correctly
- [ ] Add clinical data in edit mode → data saves correctly
- [ ] Click "Save & Go to Billing" → navigates to correct invoice
- [ ] Billing page loads with invoice pre-filled
- [ ] Cancel during edit mode → modal closes without navigating to billing
- [ ] Test workflow in both French and English languages

## Additional Considerations

1. **Error Handling**: What happens if invoice creation fails?
   - Show error message
   - Don't navigate to billing
   - Allow user to retry or exit modal

2. **Cancel Behavior**: If user clicks cancel after creating visit
   - Visit was already created and saved
   - Just close modal without going to billing
   - User can find visit in visits list later

3. **Validation**: Ensure measurements are optional
   - User should be able to skip measurements
   - "Save & Go to Billing" should work even without measurements

4. **UI/UX**: Make it clear what's happening
   - Show success message after visit creation
   - Display notification that they can now add visit data
   - Make measurements section prominent/expanded

## Benefits

1. **Better User Experience**: Natural workflow from visit creation → data entry → billing
2. **Data Completeness**: Encourages adding measurements and clinical data immediately
3. **Efficiency**: Saves time by keeping user in one flow
4. **Flexibility**: User can still skip measurements if needed

## Alternative: Future Enhancement

For a more robust solution in the future, consider creating a full Visit Detail Page similar to PatientDetailPage:
- Dedicated route: `/visits/:id`
- Tabbed interface: Info, Measurements, Documents, Billing
- More space for comprehensive data entry
- Better for complex visits with lots of data

This would be Phase 17+ work after the current beta release.
