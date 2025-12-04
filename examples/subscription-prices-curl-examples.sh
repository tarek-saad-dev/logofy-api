#!/bin/bash

# Example cURL commands for Subscription Prices API

BASE_URL="http://localhost:3000"

# Replace with your actual JWT token for POST requests
JWT_TOKEN="your_jwt_token_here"

# ============================================
# GET /api/subscription-prices - Get Current Prices
# ============================================

echo "1. Get Current Subscription Prices (Public - No Auth Required):"
curl -X GET "${BASE_URL}/api/subscription-prices" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# ============================================
# POST /api/subscription-prices - Update Prices
# ============================================

echo "2. Update Subscription Prices (Requires Authentication):"
curl -X POST "${BASE_URL}/api/subscription-prices" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 97.99,
    "yearly_price": 999.99,
    "trial_days": 3,
    "currency": "EGP",
    "stripe_monthly_price_id": "price_1234567890",
    "stripe_yearly_price_id": "price_0987654321"
  }'

echo -e "\n\n"

# Example with USD currency
echo "3. Update Prices with USD Currency:"
curl -X POST "${BASE_URL}/api/subscription-prices" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 9.99,
    "yearly_price": 99.99,
    "trial_days": 7,
    "currency": "USD",
    "stripe_monthly_price_id": "price_monthly_usd",
    "stripe_yearly_price_id": "price_yearly_usd"
  }'

echo -e "\n\n"

# Example with minimal required fields only
echo "4. Update Prices (Minimal - Only Required Fields):"
curl -X POST "${BASE_URL}/api/subscription-prices" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 19.99,
    "yearly_price": 199.99
  }'

echo -e "\n\n"

# ============================================
# Workflow Example: Update then Fetch
# ============================================

echo "5. Complete Workflow: Update Prices then Fetch:"
echo "   Step 1: Update prices..."
curl -X POST "${BASE_URL}/api/subscription-prices" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_price": 29.99,
    "yearly_price": 299.99,
    "trial_days": 14,
    "currency": "USD"
  }' -s | jq '.'

echo -e "\n   Step 2: Fetch updated prices..."
curl -X GET "${BASE_URL}/api/subscription-prices" \
  -H "Content-Type: application/json" -s | jq '.'

echo -e "\n\n"

