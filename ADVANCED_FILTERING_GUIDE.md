# Advanced Filtering & Search Guide

## Overview

NutriVault API supports advanced filtering and search capabilities across all list endpoints. This guide explains how to use query parameters to filter, search, sort, and paginate your API requests.

## Table of Contents

- [Quick Start](#quick-start)
- [Basic Filtering](#basic-filtering)
- [Advanced Operators](#advanced-operators)
- [Multi-Field Search](#multi-field-search)
- [Pagination & Sorting](#pagination--sorting)
- [Endpoint-Specific Features](#endpoint-specific-features)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Quick Start

### Simple Equality Filter
```http
GET /api/patients?is_active=true
```

### Greater Than Filter
```http
GET /api/billing?amount_gt=100
```

### Multi-Field Search
```http
GET /api/patients?search=john
```

### Combined Filters
```http
GET /api/visits?status=COMPLETED&visit_date_gte=2024-01-01&limit=20
```

---

## Basic Filtering

### Exact Match (Equality)

Filter by exact field value:

```http
GET /api/patients?assigned_dietitian_id=550e8400-e29b-41d4-a716-446655440000
GET /api/visits?status=COMPLETED
GET /api/users?is_active=true
```

**Supported Types:**
- UUID fields
- Boolean fields (true/false, 1/0)
- String fields
- Enum fields (automatically validates against allowed values)

---

## Advanced Operators

All filterable fields support advanced operators using suffix notation: `field_operator=value`

### Comparison Operators

#### Greater Than (`_gt`)
Values greater than the specified value:
```http
GET /api/billing?amount_gt=100
GET /api/visits?duration_minutes_gt=30
```

#### Greater Than or Equal (`_gte`)
Values greater than or equal to the specified value:
```http
GET /api/visits?visit_date_gte=2024-01-01
GET /api/billing?total_amount_gte=500
```

#### Less Than (`_lt`)
Values less than the specified value:
```http
GET /api/billing?amount_lt=1000
GET /api/visits?duration_minutes_lt=120
```

#### Less Than or Equal (`_lte`)
Values less than or equal to the specified value:
```http
GET /api/visits?visit_date_lte=2024-12-31
GET /api/billing?amount_lte=5000
```

#### Not Equal (`_ne`)
Values not equal to the specified value:
```http
GET /api/visits?status_ne=CANCELLED
GET /api/patients?assigned_dietitian_id_ne=null
```

### Range Operators

#### Between (`_between`)
Values within a range (inclusive):
```http
GET /api/billing?amount_between=100,500
GET /api/visits?duration_minutes_between=30,90
GET /api/patients?date_of_birth_between=1980-01-01,1990-12-31
```

**Format:** `field_between=min,max` (comma-separated, exactly 2 values)

#### Multiple Comparison Operators
Combine multiple operators on the same field:
```http
GET /api/billing?amount_gte=100&amount_lte=1000
# Equivalent to: 100 <= amount <= 1000
```

### List Operators

#### In (`_in`)
Match any value in a comma-separated list:
```http
GET /api/visits?status_in=COMPLETED,SCHEDULED
GET /api/billing?status_in=PENDING,OVERDUE
GET /api/patients?gender_in=MALE,FEMALE
```

**Limits:**
- Maximum 100 values per `_in` operator
- Values are automatically type-validated

### Null Operators

#### Is Null (`_null`)
Check if a field is null or not null:
```http
GET /api/patients?assigned_dietitian_id_null=true   # Find unassigned patients
GET /api/patients?assigned_dietitian_id_null=false  # Find assigned patients
```

#### Is Not Null (`_not_null`)
Inverse of `_null`:
```http
GET /api/billing?payment_date_not_null=true   # Find paid invoices
GET /api/billing?payment_date_not_null=false  # Find unpaid invoices
```

### String Operators

#### Like (`_like`)
Case-sensitive partial match:
```http
GET /api/patients?city_like=New
# Matches: "New York", "New Jersey", etc.
```

#### Case-Insensitive Like (`_ilike`)
Case-insensitive partial match:
```http
GET /api/patients?city_ilike=new
# Matches: "New York", "NEW YORK", "new jersey", etc.
```

**Note:** For multi-field text search, use the `search` parameter instead (see below).

---

## Multi-Field Search

The `search` parameter performs case-insensitive partial matching across multiple predefined fields.

### Patients
Searches: first_name, last_name, email, phone
```http
GET /api/patients?search=john
# Finds patients with "john" in name, email, or phone
```

### Users
Searches: username, email, first_name, last_name
```http
GET /api/users?search=admin
# Finds users with "admin" in username, email, or name
```

### Visits
Searches: chief_complaint, assessment, recommendations, private_notes
```http
GET /api/visits?search=diabetes
# Finds visits mentioning "diabetes" in clinical notes
```

### Billing
Searches: invoice_number, notes
```http
GET /api/billing?search=INV-2024
# Finds invoices with matching invoice number or notes
```

### Audit Logs
Searches: username, action, resource_type, request_path, error_message
```http
GET /api/audit?search=LOGIN
# Finds audit logs related to login actions
```

---

## Pagination & Sorting

### Pagination

#### Limit
Number of records per page (default: 10, max varies by endpoint):
```http
GET /api/patients?limit=25
```

#### Offset
Number of records to skip:
```http
GET /api/patients?offset=50&limit=25
# Page 3 of results (50 skipped, 25 returned)
```

**Max Limits by Endpoint:**
- Patients, Users, Visits, Billing: 100
- Audit Logs: 500

### Sorting

#### Sort By
Specify the field to sort by:
```http
GET /api/patients?sort_by=last_name
GET /api/visits?sort_by=visit_date
GET /api/billing?sort_by=total_amount
```

**Sortable Fields by Endpoint:**

| Endpoint | Sortable Fields |
|----------|----------------|
| Patients | created_at, first_name, last_name, date_of_birth, updated_at |
| Users | created_at, username, email, last_name, last_login_at, updated_at |
| Visits | created_at, visit_date, status, duration_minutes, updated_at |
| Billing | created_at, invoice_date, due_date, payment_date, amount, total_amount, status, updated_at |
| Audit | timestamp, action, resource_type, status, severity |

#### Sort Order
Direction of sorting (default: DESC):
```http
GET /api/patients?sort_by=last_name&sort_order=ASC
GET /api/billing?sort_by=invoice_date&sort_order=DESC
```

**Values:** `ASC` (ascending) or `DESC` (descending) - case insensitive

---

## Endpoint-Specific Features

### Patients

**Legacy Age Filtering** (backward compatibility):
```http
GET /api/patients?age_min=18&age_max=65
```

**Modern Date of Birth Filtering:**
```http
GET /api/patients?date_of_birth_gte=1960-01-01&date_of_birth_lte=1990-12-31
```

### Visits

**Legacy Date Range** (backward compatibility):
```http
GET /api/visits?from_date=2024-01-01&to_date=2024-12-31
```

**Modern Date Filtering:**
```http
GET /api/visits?visit_date_gte=2024-01-01&visit_date_lte=2024-12-31
```

### Billing

**Legacy Date Range** (backward compatibility):
```http
GET /api/billing?from_date=2024-01-01&to_date=2024-12-31
```

**Modern Date Filtering:**
```http
GET /api/billing?invoice_date_gte=2024-01-01&invoice_date_lte=2024-12-31
```

### Audit Logs

**Default Pagination:** 100 records per page (higher than other endpoints)

---

## Examples

### Example 1: Find Active Patients in a City
```http
GET /api/patients?is_active=true&city=Toronto&limit=50
```

### Example 2: Find Completed Visits This Month
```http
GET /api/visits?status=COMPLETED&visit_date_gte=2024-06-01&visit_date_lte=2024-06-30&sort_by=visit_date&sort_order=DESC
```

### Example 3: Find Overdue Invoices Above $500
```http
GET /api/billing?status_in=OVERDUE,PENDING&total_amount_gt=500&sort_by=due_date&sort_order=ASC
```

### Example 4: Find Recent Failed Login Attempts
```http
GET /api/audit?action=LOGIN&status=FAILURE&timestamp_gte=2024-06-01&limit=100
```

### Example 5: Search Patients by Name or Email
```http
GET /api/patients?search=john.doe&limit=10
```

### Example 6: Complex Visit Query
```http
GET /api/visits?patient_id=550e8400-e29b-41d4-a716-446655440000&status_in=COMPLETED,SCHEDULED&visit_date_gte=2024-01-01&duration_minutes_between=30,90&search=follow-up
```

### Example 7: Find Patients Without Assigned Dietitian
```http
GET /api/patients?assigned_dietitian_id_null=true&is_active=true
```

### Example 8: Find High-Value Paid Invoices
```http
GET /api/billing?status=PAID&total_amount_gte=1000&payment_date_gte=2024-01-01&sort_by=total_amount&sort_order=DESC
```

---

## Best Practices

### 1. **Use Appropriate Operators**
- Use `_gte` and `_lte` for date ranges instead of `_between` for better readability
- Use `search` for text queries instead of multiple `_like` operators
- Use `_in` for multiple discrete values instead of multiple `_eq` filters

### 2. **Optimize Pagination**
- Use reasonable `limit` values (10-50 for UI, 100+ for exports)
- Prefer `offset` for small datasets, consider cursor-based pagination for large datasets
- Always specify `sort_by` for consistent pagination

### 3. **Combine Filters Efficiently**
```http
# Good: Single request with multiple filters
GET /api/patients?is_active=true&city=Toronto&age_min=18

# Avoid: Multiple requests
GET /api/patients?is_active=true
# Then filter in application code
```

### 4. **Type Safety**
All operators perform type validation:
- UUIDs must be valid UUID format
- Dates must be valid ISO 8601 format
- Integers/floats must be numeric
- Enums must match allowed values

Invalid values return `400 Bad Request` with detailed error messages.

### 5. **Maximum Limits**
- Maximum 100 values in `_in` operators
- Maximum 500 characters in `search` parameter
- Maximum 500 records per page for audit logs
- Maximum 100 records per page for other endpoints

### 6. **Backward Compatibility**
Legacy query parameters are still supported:
- `age_min` / `age_max` (patients)
- `from_date` / `to_date` (visits, billing, audit)

However, prefer the modern operator syntax for new code.

---

## Response Format

All list endpoints return a consistent format:

```json
{
  "success": true,
  "data": {
    "[resource]": [...],  // Array of resources
    "total": 150,          // Total count (before pagination)
    "limit": 25,           // Records per page
    "offset": 50           // Records skipped
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "amount_gt",
        "message": "amount_gt must be a number",
        "value": "invalid"
      }
    ]
  },
  "timestamp": "2024-06-15T10:30:00.000Z"
}
```

---

## Supported Field Types

| Type | Operators Supported | Example |
|------|-------------------|---------|
| **UUID** | `_eq`, `_ne`, `_in`, `_null`, `_not_null` | `patient_id_in=uuid1,uuid2` |
| **String** | `_eq`, `_ne`, `_in`, `_like`, `_ilike`, `_null`, `_not_null` | `city_like=New` |
| **Enum** | `_eq`, `_ne`, `_in` | `status_in=PENDING,PAID` |
| **Boolean** | `_eq`, `_ne` | `is_active=true` |
| **Integer** | `_eq`, `_ne`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_between` | `age_between=18,65` |
| **Float** | `_eq`, `_ne`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_between` | `amount_gte=100.50` |
| **Date** | `_eq`, `_ne`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_between` | `visit_date_gte=2024-01-01` |

---

## API Reference by Endpoint

### GET /api/patients

**Filterable Fields:**
- `assigned_dietitian_id` (UUID)
- `is_active` (Boolean)
- `date_of_birth` (Date)
- `gender` (String)
- `city` (String)
- `postal_code` (String)
- `country` (String)

**Search Fields:** first_name, last_name, email, phone

**Legacy Filters:** age_min, age_max

---

### GET /api/users

**Filterable Fields:**
- `role_id` (UUID)
- `is_active` (Boolean)
- `last_login_at` (Date)
- `failed_login_attempts` (Integer)
- `locked_until` (Date)

**Search Fields:** username, email, first_name, last_name

---

### GET /api/visits

**Filterable Fields:**
- `patient_id` (UUID)
- `dietitian_id` (UUID)
- `status` (Enum: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED)
- `visit_type` (Enum: INITIAL, FOLLOW_UP, EMERGENCY, CONSULTATION, TELEHEALTH)
- `visit_date` (Date)
- `duration_minutes` (Integer)
- `next_visit_date` (Date)

**Search Fields:** chief_complaint, assessment, recommendations, private_notes

**Legacy Filters:** from_date, to_date

---

### GET /api/billing

**Filterable Fields:**
- `patient_id` (UUID)
- `visit_id` (UUID)
- `status` (Enum: PENDING, PAID, OVERDUE, CANCELLED, REFUNDED, PARTIAL)
- `amount` (Float)
- `tax_amount` (Float)
- `total_amount` (Float)
- `invoice_date` (Date)
- `due_date` (Date)
- `payment_date` (Date)
- `payment_method` (Enum: CASH, CREDIT_CARD, DEBIT_CARD, CHECK, INSURANCE, BANK_TRANSFER, OTHER)
- `currency` (String)

**Search Fields:** invoice_number, notes

**Legacy Filters:** from_date, to_date

---

### GET /api/audit

**Filterable Fields:**
- `user_id` (UUID)
- `action` (String)
- `resource_type` (String)
- `resource_id` (UUID)
- `status` (Enum: SUCCESS, FAILURE, ERROR)
- `severity` (Enum: INFO, WARN, ERROR, CRITICAL)
- `timestamp` (Date)
- `request_method` (Enum: GET, POST, PUT, PATCH, DELETE)
- `request_path` (String)
- `ip_address` (String)
- `session_id` (String)
- `api_key_id` (UUID)

**Search Fields:** username, action, resource_type, request_path, error_message

**Default Limit:** 100 (max: 500)

---

## Version History

- **v1.0.0** (2024-06-15): Initial release with advanced filtering support
  - 12 operators: _gt, _gte, _lt, _lte, _eq, _ne, _in, _between, _null, _not_null, _like, _ilike
  - Multi-field search across all endpoints
  - Type-safe validation
  - Backward compatibility with legacy parameters

---

## Support

For questions or issues related to the filtering API:
- GitHub Issues: https://github.com/your-org/nutrivault/issues
- Email: support@nutrivault.local
- Documentation: https://docs.nutrivault.com

---

**Last Updated:** 2024-06-15
**API Version:** 1.0.0
