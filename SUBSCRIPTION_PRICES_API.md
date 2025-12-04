# Subscription Prices API Documentation

## Overview

The Subscription Prices API allows you to manage subscription pricing dynamically. Instead of hard-coding prices in the mobile app, prices are stored in the database and can be updated via API endpoints.

## Setup

### 1. Run the Migration

First, run the database migration to create the `subscription_prices` table:

```bash
node run_subscription_prices_migration.js
```

This will:
- Create the `subscription_prices` table
- Set up indexes for performance
- Insert default values (if no active prices exist)

### 2. Set Initial Prices

After running the migration, set your initial prices using the POST endpoint (see below).

## Endpoints

### GET /api/subscription-prices

Get the current active subscription prices. This endpoint is **public** (no authentication required) so the mobile app can fetch prices without user login.

**Request:**
```bash
GET /api/subscription-prices
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monthly_price": 97.99,
    "yearly_price": 999.99,
    "trial_days": 3,
    "currency": "EGP",
    "stripe_monthly_price_id": "price_1234567890",
    "stripe_yearly_price_id": "price_0987654321"
  }
}
```

**Example with cURL:**
```bash
curl -X GET http://localhost:3000/api/subscription-prices
```

**Mobile App Usage:**
The mobile app should call this endpoint on app launch or when displaying subscription options to fetch the latest prices dynamically.

---

### POST /api/subscription-prices

Update subscription prices. This endpoint requires **authentication** (Bearer token).

**Request:**
```bash
POST /api/subscription-prices
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "monthly_price": 97.99,
  "yearly_price": 999.99,
  "trial_days": 3,
  "currency": "EGP",
  "stripe_monthly_price_id": "price_1234567890",
  "stripe_yearly_price_id": "price_0987654321"
}
```

**Request Body Fields:**
- `monthly_price` (required): Monthly subscription price (number, >= 0)
- `yearly_price` (required): Yearly subscription price (number, >= 0)
- `trial_days` (optional): Number of trial days (integer, >= 0, default: 0)
- `currency` (optional): Currency code (string, default: "USD")
- `stripe_monthly_price_id` (optional): Stripe price ID for monthly plan
- `stripe_yearly_price_id` (optional): Stripe price ID for yearly plan

**Response:**
```json
{
  "success": true,
  "message": "Subscription prices updated successfully",
  "data": {
    "monthly_price": 97.99,
    "yearly_price": 999.99,
    "trial_days": 3,
    "currency": "EGP",
    "stripe_monthly_price_id": "price_1234567890",
    "stripe_yearly_price_id": "price_0987654321",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Example with cURL:**
```bash
curl -X POST http://localhost:3000/api/subscription-prices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 97.99,
    "yearly_price": 999.99,
    "trial_days": 3,
    "currency": "EGP",
    "stripe_monthly_price_id": "price_1234567890",
    "stripe_yearly_price_id": "price_0987654321"
  }'
```

**How It Works:**
1. When you POST new prices, all existing active prices are deactivated
2. A new active price configuration is created
3. The mobile app will always fetch the latest active prices

---

## Workflow

### For Project Owner / Dashboard

1. **Update prices in Stripe** (via Stripe Dashboard)
2. **Update prices in database** via POST endpoint:
   ```bash
   POST /api/subscription-prices
   ```
   Include the new prices and Stripe price IDs

### For Mobile App

1. **On app launch** or when showing subscription screen:
   ```bash
   GET /api/subscription-prices
   ```
2. **Display prices** from the response
3. **No hard-coded values** - always fetch from API

---

## Database Schema

The `subscription_prices` table structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `monthly_price` | DECIMAL(10,2) | Monthly subscription price |
| `yearly_price` | DECIMAL(10,2) | Yearly subscription price |
| `trial_days` | INTEGER | Number of trial days |
| `currency` | VARCHAR(10) | Currency code (e.g., USD, EGP) |
| `stripe_monthly_price_id` | VARCHAR(255) | Stripe price ID for monthly plan |
| `stripe_yearly_price_id` | VARCHAR(255) | Stripe price ID for yearly plan |
| `is_active` | BOOLEAN | Whether this configuration is active |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Note:** Only one price configuration can be active at a time. When you POST new prices, old ones are automatically deactivated.

---

## Error Handling

### GET Endpoint Errors

- If no active prices exist, returns default values (0.00 for prices, 0 trial days, USD currency)
- Database errors return 500 with error message

### POST Endpoint Errors

- **400 Bad Request**: Missing required fields or invalid data types
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Database errors

**Example Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "monthly_price must be a non-negative number"
  }
}
```

---

## Integration with Existing Billing System

The subscription prices API works alongside the existing billing system:

- **Billing Route** (`/api/billing/create-checkout-session`) still uses Stripe price IDs from environment variables or can be updated to use database prices
- **Webhook Handler** (`/api/stripe/webhook`) continues to work as before
- **Subscription Status** (`/api/billing/status`) remains unchanged

**Future Enhancement:** The billing route could be updated to fetch Stripe price IDs from the database instead of environment variables.

---

## Testing

### Test GET Endpoint
```bash
curl http://localhost:3000/api/subscription-prices
```

### Test POST Endpoint
```bash
# First, get a JWT token from /api/auth/login
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/subscription-prices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 97.99,
    "yearly_price": 999.99,
    "trial_days": 3,
    "currency": "EGP",
    "stripe_monthly_price_id": "price_test_monthly",
    "stripe_yearly_price_id": "price_test_yearly"
  }'
```

---

## Summary

✅ **Problem Solved:**
- No more hard-coded prices in mobile app
- Prices can be updated via API when changed in Stripe
- Mobile app always shows current prices

✅ **Benefits:**
- Scalable: Update prices without app updates
- Consistent: Single source of truth in database
- Flexible: Easy to change prices for different markets/currencies

✅ **Next Steps:**
1. Run the migration: `node run_subscription_prices_migration.js`
2. Set initial prices via POST endpoint
3. Update mobile app to use GET endpoint instead of hard-coded values
4. When prices change in Stripe, update via POST endpoint

