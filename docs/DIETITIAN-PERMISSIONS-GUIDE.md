# DIETITIAN Role - Permissions Configuration Guide

## Overview

The DIETITIAN role can be configured with different permission levels depending on your organization's needs. This guide helps you decide which permissions to grant.

## Default DIETITIAN Permissions

By default, the DIETITIAN role has **16 permissions**:

### Patients (4 permissions)
- ✅ `patients.create` - Create new patients
- ✅ `patients.read` - View patient information
- ✅ `patients.update` - Edit patient information
- ✅ `patients.delete` - Delete patients

### Visits (4 permissions)
- ✅ `visits.create` - Create new visits
- ✅ `visits.read` - View visit information
- ✅ `visits.update` - Edit visit information
- ✅ `visits.delete` - Delete visits

### Documents (6 permissions)
- ✅ `documents.upload` - Upload new documents
- ✅ `documents.read` - View and list documents
- ✅ `documents.download` - Download documents
- ✅ `documents.update` - Update document metadata
- ✅ `documents.delete` - Delete documents
- ✅ `documents.share` - Share documents with patients

### Reports (2 permissions)
- ✅ `reports.view` - View reports and statistics
- ✅ `reports.export` - Export data (patients, visits)

## Optional: Billing Permissions

### Should DIETITIANs Have Billing Access?

**Consider granting billing permissions if:**
- ✅ Dietitians need to create invoices for their patients
- ✅ Dietitians handle payment collection
- ✅ Dietitians need to see patient payment status
- ✅ Dietitians work independently with financial responsibility

**Keep billing restricted to ADMIN if:**
- ❌ Only administrators handle invoicing
- ❌ You have dedicated billing staff
- ❌ Financial data should be strictly controlled
- ❌ Dietitians should focus only on care

### Adding Billing Permissions

To grant billing access to DIETITIAN role:

```bash
./add-billing-to-dietitian.sh
```

This adds **3 billing permissions** (total becomes 19):
- ✅ `billing.read` - View invoices and billing information
- ✅ `billing.create` - Create new invoices
- ✅ `billing.update` - Edit invoices, record payments, send emails

**Note:** `billing.delete` remains ADMIN-only for data integrity.

### Removing Billing Permissions

To remove billing access from DIETITIAN role:

```bash
./remove-billing-from-dietitian.sh
```

This removes all billing permissions, reverting to default 16 permissions.

## Permission Comparison

| Feature | Without Billing | With Billing |
|---------|----------------|--------------|
| View Patients | ✅ | ✅ |
| Manage Visits | ✅ | ✅ |
| Upload Documents | ✅ | ✅ |
| View Reports (Patients, Visits) | ✅ | ✅ |
| **View Billing Page** | ❌ | ✅ |
| **Create Invoices** | ❌ | ✅ |
| **Edit Invoices** | ❌ | ✅ |
| **Record Payments** | ❌ | ✅ |
| **Send Invoice Emails** | ❌ | ✅ |
| **View Reports (Billing stats)** | ❌ | ✅ |
| Delete Invoices | ❌ | ❌ |
| Manage Users | ❌ | ❌ |
| System Settings | ❌ | ❌ |

## Use Cases

### Scenario 1: Small Practice (1-2 Dietitians)

**Recommendation:** Grant billing permissions

Dietitians handle everything including billing.

```bash
./add-billing-to-dietitian.sh
```

**Result:** DIETITIAN = 19 permissions (full clinical + billing)

---

### Scenario 2: Medium Practice (3-5 Dietitians + Admin)

**Recommendation:** Keep billing restricted to ADMIN

Admin handles invoicing, dietitians focus on patient care.

```bash
# No action needed - use default permissions
./fix-dietitian-permissions.sh  # If needed to reset
```

**Result:** DIETITIAN = 16 permissions (clinical only)

---

### Scenario 3: Large Practice (Multiple Dietitians + Billing Staff)

**Recommendation:** Keep billing restricted

Dedicated billing staff or secretary role handles invoicing.

```bash
# No action needed - use default permissions
```

**Result:**
- DIETITIAN = 16 permissions (clinical only)
- SECRETARY = 6 permissions (includes billing.read)
- Billing staff = Custom role or ADMIN

---

### Scenario 4: Independent Contractors

**Recommendation:** Grant billing permissions

Each dietitian manages their own billing.

```bash
./add-billing-to-dietitian.sh
```

**Result:** DIETITIAN = 19 permissions (full clinical + billing)

## Current Configuration Check

To check what permissions your DIETITIAN role currently has:

```bash
./check-roles-permissions.sh
```

Or for a specific DIETITIAN user:

```bash
./check-user-permissions.sh dietitian-username
```

## Making Changes

### Adding Billing Permissions

```bash
# 1. Check current state
./check-roles-permissions.sh

# 2. Add billing permissions
./add-billing-to-dietitian.sh

# 3. Verify
./check-roles-permissions.sh

# 4. Ask all DIETITIAN users to log out and log back in
```

### Removing Billing Permissions

```bash
# 1. Check current state
./check-roles-permissions.sh

# 2. Remove billing permissions
./remove-billing-from-dietitian.sh

# 3. Verify
./check-roles-permissions.sh

# 4. Ask all DIETITIAN users to log out and log back in
```

## Important Notes

### After Permission Changes

⚠️ **Users MUST log out and log back in** for permission changes to take effect.

The JWT token contains the user's permissions and is only refreshed on login.

### Testing After Changes

1. **Log out** completely (not just close tab)
2. **Clear browser cache** (recommended)
3. **Log back in**
4. **Navigate to Billing page** (if permissions added)
5. **Verify access** or appropriate error message

### Error Messages

**Without billing permissions:**
```
"Vous n'avez pas la permission de consulter les informations de facturation."
```

**With billing permissions:**
- Should see billing list
- Can create/edit invoices
- Can record payments

## Quick Reference

| Task | Command |
|------|---------|
| Check current permissions | `./check-roles-permissions.sh` |
| Check user permissions | `./check-user-permissions.sh <username>` |
| Add billing to DIETITIAN | `./add-billing-to-dietitian.sh` |
| Remove billing from DIETITIAN | `./remove-billing-from-dietitian.sh` |
| Reset DIETITIAN to default | `./fix-dietitian-permissions.sh` |
| List all users | `./list-all-users.sh` |

## Recommendations by Practice Size

| Practice Size | Billing for DIETITIAN? | Rationale |
|---------------|------------------------|-----------|
| Solo (1) | ✅ Yes | Handles everything |
| Small (2-3) | ✅ Yes | Shared responsibility |
| Medium (4-10) | ❌ No | Dedicated admin |
| Large (10+) | ❌ No | Billing department |
| Multi-location | ❌ No | Centralized billing |

## Support

If you're unsure which configuration to use:

1. **Start restrictive** (no billing for DIETITIAN)
2. **Add permissions** if needed based on workflow
3. **Monitor usage** and adjust as practice grows
4. **Document** your decision for future reference

You can always change permissions later using the provided scripts.
