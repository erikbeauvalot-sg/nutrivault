# API Contract Template

## Purpose
This template defines the standard format for documenting API endpoints in NutriVault. All API contracts should follow this structure to ensure consistency and clarity across the project.

---

## Endpoint Name: [Resource Action]

### Endpoint Information
- **URL**: `/api/[resource]/[path]`
- **Method**: `GET | POST | PUT | DELETE`
- **Authentication**: Required | Optional | None
- **Authorization**: Permission(s) required: `resource.action` (e.g., `patients.read`)
- **Rate Limit**: X requests per minute

---

### Request

#### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
X-API-Key: <api_key> (if using API key auth)
```

#### Path Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| id | UUID | Yes | Unique identifier | `550e8400-e29b-41d4-a716-446655440000` |

#### Query Parameters
| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| page | Integer | No | 1 | Page number for pagination | `1` |
| limit | Integer | No | 20 | Items per page (max 100) | `20` |
| search | String | No | - | Search term | `"john"` |

#### Request Body
```json
{
  "field_name": "value",
  "required_field": "required_value",
  "optional_field": "optional_value"
}
```

**Field Specifications:**
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| field_name | String | Yes | 1-100 chars, alphanumeric | Description of the field |
| email | String | No | Valid email format | User email address |

---

### Response

#### Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field_name": "value",
    "created_at": "2026-01-03T10:30:45.123Z",
    "updated_at": "2026-01-03T10:30:45.123Z"
  },
  "message": "Optional success message",
  "timestamp": "2026-01-03T10:30:45.123Z"
}
```

#### Error Responses

**400 Bad Request - Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ]
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource"
}
```

**401 Unauthorized - Missing or Invalid Token**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource"
}
```

**403 Forbidden - Insufficient Permissions**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access this resource",
    "required_permission": "resource.action"
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource"
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource/id"
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retry_after": 60
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/resource",
  "request_id": "uuid"
}
```

---

### HTTP Status Codes
| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., username exists) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance mode or dependency failure |

---

### Examples

#### Example Request
```bash
curl -X POST https://api.nutrivault.com/api/patients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-05-15",
    "email": "john.doe@example.com",
    "phone": "+1234567890"
  }'
```

#### Example Success Response
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-05-15",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "is_active": true,
    "created_at": "2026-01-03T10:30:45.123Z",
    "updated_at": "2026-01-03T10:30:45.123Z"
  },
  "message": "Patient created successfully",
  "timestamp": "2026-01-03T10:30:45.123Z"
}
```

---

### Audit Logging
This endpoint triggers the following audit events:

| Event | When | Severity | Logged Data |
|-------|------|----------|-------------|
| RESOURCE_CREATE | Resource created | INFO | user_id, resource_id, resource_type |
| RESOURCE_UPDATE | Resource updated | INFO | user_id, resource_id, changes (before/after) |
| RESOURCE_DELETE | Resource deleted | WARN | user_id, resource_id |
| AUTHORIZATION_FAILURE | Permission denied | WARNING | user_id, required_permission, resource |

---

### Business Rules
- Describe any business logic constraints
- Define validation rules beyond field-level validation
- Specify relationships and dependencies
- Document state transitions (e.g., visit status changes)

---

### Testing Considerations
- Required test cases (happy path, edge cases, error cases)
- Test data requirements
- Performance benchmarks (e.g., response time <200ms)

---

### Related Endpoints
- List related endpoints that interact with this resource
- Document dependencies between endpoints

---

### Implementation Notes
- Any special considerations for implementation
- Known limitations or constraints
- Database queries or optimizations needed
- Caching strategy (if applicable)

---

### Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-03 | Project Architect | Initial contract definition |

---

## Standard Response Structures

### Success Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "timestamp": "ISO 8601 timestamp",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ /* validation errors or additional info */ ]
  },
  "timestamp": "ISO 8601 timestamp",
  "path": "/api/endpoint",
  "request_id": "uuid for tracking"
}
```

### Pagination Metadata
For list endpoints that support pagination:
```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required or invalid |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate resource or constraint violation |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |
| DATABASE_ERROR | 500 | Database operation failed |
| INVALID_TOKEN | 401 | JWT token is invalid or expired |
| ACCOUNT_LOCKED | 403 | Account temporarily locked |

---

## Authentication Patterns

### JWT Bearer Token
```
Authorization: Bearer <access_token>
```

### API Key
```
X-API-Key: diet_ak_[random_string]
```

### Refresh Token
```json
POST /api/auth/refresh
{
  "refresh_token": "encrypted_refresh_token"
}
```

---

## Rate Limiting

### Standard Rate Limits
- **General API Endpoints**: 100 requests per minute per user
- **Authentication Endpoints**: 5 requests per minute per IP
- **Search/Query Endpoints**: 50 requests per minute per user
- **Report Generation**: 10 requests per minute per user

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641211845
```

---

## Usage Instructions

1. **Copy this template** when creating a new API contract
2. **Fill in all sections** relevant to your endpoint
3. **Save the file** as `docs/contracts/[RESOURCE]-[ACTION]-CONTRACT.md`
4. **Link the contract** in the main API documentation index
5. **Update the contract** whenever the endpoint changes
6. **Review with Project Architect** before implementation

---

**Template Version**: 1.0
**Last Updated**: January 3, 2026
**Maintained By**: Agent 1 - Project Architect
