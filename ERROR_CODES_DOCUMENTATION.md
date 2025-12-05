# Error Codes Documentation

This document provides a comprehensive reference for all error codes used across the backend API. All error responses follow a standardized format to ensure consistent handling by mobile applications.

## Error Response Format

All error responses (non-2xx status codes) follow this structure:

```json
{
  "error_code": "SHORT_STABLE_STRING",
  "message": "Human-readable English message",
  "details": { ... }  // Optional, only included when additional context is useful
}
```

## HTTP Status Code Standards

### 400 - Bad Request
Used for validation errors, invalid input, or malformed requests.

### 401 - Unauthorized
**IMPORTANT**: Only used when the access token is expired/invalid and requires using the refresh token. This is the ONLY case where 401 is returned.

### 403 - Forbidden
Used when the user is authenticated but does not have permission to perform the action.

### 404 - Not Found
Used when a requested resource (logo, user, etc.) does not exist.

### 409 - Conflict
Used when there's a conflict, typically duplicate resources (e.g., email already in use).

### 422 - Unprocessable Entity
Used for business rule errors (e.g., invalid state, plan limitations).

### 429 - Too Many Requests
Used for rate limiting scenarios.

### 500 - Internal Server Error
Used for unexpected server errors.

---

## Error Codes by Module

### Authentication & Authorization (`AUTH_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `INVALID_CREDENTIALS` | 400 | Invalid email or password | Wrong login credentials provided |
| `TOKEN_EXPIRED` | 401 | Access token expired | Access token has expired (requires refresh token) |
| `TOKEN_INVALID` | 401 | Invalid access token | Access token is malformed or invalid (requires refresh token) |
| `TOKEN_MISSING` | 401 | No token provided | Authorization header missing or invalid format |
| `TOKEN_TYPE_INVALID` | 401 | Invalid token type | Token is not an access token (requires refresh token) |
| `REFRESH_TOKEN_INVALID` | 400 | Invalid or expired refresh token | Refresh token is invalid or expired |
| `REFRESH_TOKEN_EXPIRED` | 400 | Refresh token expired | Refresh token has expired |
| `FORBIDDEN` | 403 | Permission denied | User authenticated but lacks permission |
| `UNAUTHORIZED` | 403 | Not authorized | General authorization failure (not token-related) |
| `OTP_INVALID` | 400 | Invalid or expired OTP | OTP code is wrong or expired |
| `OTP_EXPIRED` | 400 | OTP expired | OTP code has expired |
| `OTP_RATE_LIMIT` | 429 | Too many OTP requests | Rate limit exceeded for OTP requests |
| `EMAIL_NOT_VERIFIED` | 403 | Email not verified | Email verification required but not completed |

**Key Points:**
- **401 is ONLY returned for access token issues** (expired/invalid) that require refresh token flow
- Wrong password/login → `400` with `INVALID_CREDENTIALS` (NOT 401)
- Refresh token errors → `400` (NOT 401)
- Permission denied → `403` with `FORBIDDEN` (NOT 401)

---

### User Management (`USER_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `USER_NOT_FOUND` | 404 | User not found | Requested user does not exist |
| `USER_ALREADY_EXISTS` | 409 | User already exists | Attempting to create duplicate user |
| `EMAIL_ALREADY_IN_USE` | 409 | Email already in use | Email address is already registered |
| `INVALID_EMAIL` | 400 | Invalid email format | Email format validation failed |
| `INVALID_PASSWORD` | 400 | Invalid password | Password validation failed |
| `PASSWORD_TOO_WEAK` | 400 | Password too weak | Password does not meet strength requirements |
| `PROFILE_UPDATE_FAILED` | 500 | Profile update failed | Unexpected error updating user profile |

---

### Logo Management (`LOGO_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `LOGO_NOT_FOUND` | 404 | Logo not found | Requested logo does not exist |
| `LOGO_CREATE_FAILED` | 500 | Failed to create logo | Unexpected error creating logo |
| `LOGO_UPDATE_FAILED` | 500 | Failed to update logo | Unexpected error updating logo |
| `LOGO_DELETE_FAILED` | 500 | Failed to delete logo | Unexpected error deleting logo |
| `LOGO_DUPLICATE_FAILED` | 500 | Failed to duplicate logo | Unexpected error duplicating logo |
| `LOGO_OWNERSHIP_REQUIRED` | 403 | Logo ownership required | User does not own the logo |

---

### Export & Rendering (`EXPORT_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `EXPORT_FAILED` | 500 | Export failed | Unexpected error during export |
| `EXPORT_INVALID_FORMAT` | 400 | Invalid export format | Unsupported export format requested |
| `EXPORT_INVALID_DIMENSIONS` | 400 | Invalid dimensions | Export dimensions are invalid |
| `RENDER_FAILED` | 500 | Render failed | Server-side rendering failed |
| `UPLOAD_FAILED` | 500 | Upload failed | Failed to upload exported file |

---

### Assets (`ASSET_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `ASSET_NOT_FOUND` | 404 | Asset not found | Requested asset (icon/shape/image) does not exist |
| `ASSET_INVALID_TYPE` | 400 | Invalid asset type | Asset type is not supported |
| `ASSET_UPLOAD_FAILED` | 500 | Asset upload failed | Failed to upload asset |

---

### Categories (`CATEGORY_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `CATEGORY_NOT_FOUND` | 404 | Category not found | Requested category does not exist |
| `CATEGORY_ALREADY_EXISTS` | 409 | Category already exists | Attempting to create duplicate category |
| `CATEGORY_HAS_ASSIGNED_ITEMS` | 400 | Category has assigned items | Cannot delete category with assigned items |

---

### Projects (`PROJECT_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `PROJECT_NOT_FOUND` | 404 | Project not found | Requested project does not exist |
| `PROJECT_CREATE_FAILED` | 500 | Failed to create project | Unexpected error creating project |
| `PROJECT_UPDATE_FAILED` | 500 | Failed to update project | Unexpected error updating project |
| `PROJECT_DELETE_FAILED` | 500 | Failed to delete project | Unexpected error deleting project |

---

### Billing & Subscriptions (`BILLING_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `PLAN_LIMIT_REACHED` | 422 | Plan limit reached | User's plan does not allow this action |
| `SUBSCRIPTION_NOT_FOUND` | 404 | Subscription not found | User has no active subscription |
| `SUBSCRIPTION_INACTIVE` | 422 | Subscription inactive | Subscription is not active |
| `PAYMENT_FAILED` | 500 | Payment failed | Payment processing failed |
| `CHECKOUT_FAILED` | 500 | Checkout failed | Failed to create checkout session |
| `INVALID_PLAN` | 400 | Invalid plan | Plan type is invalid or not supported |
| `STRIPE_ERROR` | 500 | Stripe error | Stripe API error occurred |

---

### Validation (`VALIDATION_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `MISSING_REQUIRED_FIELD` | 400 | Missing required field | Required field is missing from request |
| `INVALID_INPUT` | 400 | Invalid input | Input validation failed |
| `INVALID_FORMAT` | 400 | Invalid format | Data format is invalid |
| `INVALID_VALUE` | 400 | Invalid value | Value is outside allowed range |
| `NO_UPDATES_PROVIDED` | 400 | No updates provided | Update request has no fields to update |

---

### Business Rules (`BUSINESS_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `INVALID_STATE` | 422 | Invalid state | Resource is in invalid state for operation |
| `OPERATION_NOT_ALLOWED` | 422 | Operation not allowed | Operation is not allowed in current context |
| `RESOURCE_IN_USE` | 422 | Resource in use | Resource is currently in use and cannot be modified |

---

### General (`GENERAL_*`)

| Error Code | HTTP Status | Description | When It's Returned |
|------------|-------------|-------------|---------------------|
| `NOT_FOUND` | 404 | Resource not found | Generic "not found" error |
| `INTERNAL_ERROR` | 500 | Internal server error | Unexpected server error |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded | Too many requests in time period |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable | Service temporarily unavailable |

---

## Mobile App Integration Guide

### Handling 401 Errors

**IMPORTANT**: When the mobile app receives a `401` status code, it should:

1. Check the `error_code`:
   - If `TOKEN_EXPIRED`, `TOKEN_INVALID`, `TOKEN_MISSING`, or `TOKEN_TYPE_INVALID` → **Trigger refresh token flow**
   - Use the refresh token to get a new access token
   - Retry the original request with the new access token

2. **Do NOT** trigger refresh token flow for any other error codes, even if status is 401 (shouldn't happen, but defensive coding)

### Handling Other Auth Errors

- `INVALID_CREDENTIALS` (400) → Show error message, do NOT refresh token
- `FORBIDDEN` (403) → Show error message, user lacks permission
- `REFRESH_TOKEN_INVALID` (400) → Force user to login again

### Error Code Usage Pattern

```javascript
// Example: Handling errors in mobile app
if (response.status === 401) {
  const errorCode = response.data.error_code;
  
  if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_MISSING', 'TOKEN_TYPE_INVALID'].includes(errorCode)) {
    // Refresh token flow
    await refreshAccessToken();
    // Retry original request
  } else {
    // Unexpected 401 - log and show error
    showError(response.data.message);
  }
} else if (response.status === 400) {
  // Validation error - show message
  showError(response.data.message);
} else if (response.status === 403) {
  // Permission denied
  showError(response.data.message);
} else if (response.status === 404) {
  // Resource not found
  showError(response.data.message);
} else if (response.status === 422) {
  // Business rule error - might need special handling
  handleBusinessError(response.data.error_code, response.data.message);
} else {
  // Other errors
  showError(response.data.message);
}
```

---

## Implementation Status

### ✅ Completed
- Centralized error handler utility (`api/utils/errorHandler.js`)
- Auth middleware updated
- Auth routes (`api/routes/auth.js`) - **Fully updated**
- Billing routes (`api/routes/billing.js`) - **Fully updated**
- Export routes (`api/routes/export.js`) - **Partially updated**
- Main error handler (`api/index.js`)

### 🔄 In Progress / To Do
- Logo routes (`api/routes/logo.js`)
- User routes (`api/routes/user.js`)
- Projects routes (`api/routes/projects.js`)
- Templates routes (`api/routes/templates.js`)
- Icon categories routes (`api/routes/iconCategories.js`)
- Shape categories routes (`api/routes/shapeCategories.js`)
- Other route files

### Pattern for Updating Remaining Routes

1. Import error handler at the top:
   ```javascript
   const { badRequest, unauthorized, forbidden, notFound, conflict, unprocessableEntity, tooManyRequests, internalError, ERROR_CODES } = require('../utils/errorHandler');
   ```

2. Replace error responses:
   ```javascript
   // OLD:
   return res.status(400).json({ success: false, message: 'Error message' });
   
   // NEW:
   return badRequest(res, ERROR_CODES.VALIDATION.INVALID_INPUT, 'Error message');
   ```

3. Use appropriate status codes:
   - Validation errors → `badRequest()` (400)
   - Access token issues → `unauthorized()` (401) - ONLY in auth middleware
   - Permission denied → `forbidden()` (403)
   - Not found → `notFound()` (404)
   - Conflicts → `conflict()` (409)
   - Business rules → `unprocessableEntity()` (422)
   - Rate limiting → `tooManyRequests()` (429)
   - Server errors → `internalError()` (500)

---

## Notes

- All error codes are stable strings that will not change
- Error messages are human-readable and can be used directly or mapped to localized strings
- The `details` field is optional and only included when additional context is helpful
- Error codes are organized by module for easy reference
- HTTP status codes follow RESTful conventions

---

**Last Updated**: [Current Date]
**Version**: 1.0.0







