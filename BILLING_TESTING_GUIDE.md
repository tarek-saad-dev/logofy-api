# Billing System Testing Guide

## ✅ Migration Status

The tier columns migration has been completed successfully! The following columns have been added to the `users` table:
- `tier` (TEXT, nullable)
- `tier_expires_at` (TIMESTAMPTZ, nullable)
- Index on `(tier, tier_expires_at)` for performance

---

## 🧪 Testing Methods

You have two options for testing the billing flow:

1. **Automated Test Scripts** (Node.js) - Recommended for quick testing
2. **Postman Collection** - Recommended for manual testing and API exploration

---

## Method 1: Automated Test Scripts

### Prerequisites

```bash
# Ensure dependencies are installed
npm install
```

### Step 1: Test Checkout Session Creation

This script will:
- Register a new test user
- Create a checkout session
- Display the checkout URL

```bash
node test_billing_flow.js
```

**Expected Output:**
```
🚀 Billing Flow Test Suite
============================================================
📍 Base URL: http://localhost:3000
📧 Test Email: billing_test_1234567890@example.com

🧪 Step 1: Register new user... ✅ PASS
   ✅ User registered: <user-id>
   ✅ Token received: <jwt-token>...

🧪 Step 2: Check initial entitlement... ✅ PASS
   ✅ User ID: <user-id>
   ✅ Email: <email>

🧪 Step 3: Create checkout session... ✅ PASS
   ✅ Checkout URL: https://checkout.stripe.com/...
   ✅ Session ID: cs_test_...

📝 Next: Open this URL in browser to complete payment
📝 Or use Stripe test card: 4242 4242 4242 4242
```

**Save the output values:**
- User ID
- Token
- Checkout URL

### Step 2: Complete Payment

1. Open the checkout URL in your browser
2. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

### Step 3: Test Webhook (Using Stripe CLI)

**Install Stripe CLI:**
- Download from: https://stripe.com/docs/stripe-cli
- Or use: `brew install stripe/stripe-cli/stripe` (macOS)

**Forward webhooks to your local server:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**In another terminal, trigger a test event:**
```bash
stripe trigger checkout.session.completed
```

**Or trigger subscription events:**
```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
```

### Step 4: Verify Entitlement

After the webhook is processed, verify the subscription was created:

```bash
# Set environment variables from Step 1 output
export TEST_USER_ID="<user-id-from-step-1>"
export TEST_TOKEN="<token-from-step-1>"

# Run entitlement verification
node test_billing_entitlement.js
```

**Expected Output:**
```
🔍 Entitlement Verification Test
============================================================
📍 Base URL: http://localhost:3000
👤 User ID: <user-id>

🧪 Check subscription in database... ✅ PASS
   ✅ Subscription found:
      - ID: <subscription-id>
      - Stripe Customer: cus_...
      - Stripe Subscription: sub_...
      - Status: active
      - Period End: 2025-02-01T00:00:00.000Z
      ✅ Subscription is active and valid

🧪 Test entitlement service directly... ✅ PASS
   ✅ Entitlement: pro
      ✅ User has PRO access (Stripe subscription active)
```

---

## Method 2: Postman Collection

### Import Collection

1. Open Postman
2. Click **Import**
3. Select `billing-api.postman_collection.json`
4. Collection will be imported with all requests

### Configure Variables

1. Click on the collection name
2. Go to **Variables** tab
3. Set `baseUrl` to your API URL (default: `http://localhost:3000`)

### Testing Flow

#### Step 1: Register/Login

**Option A: Register New User**
1. Open **Authentication → Register User**
2. Click **Send**
3. Token and User ID will be automatically saved to collection variables

**Option B: Login**
1. Open **Authentication → Login**
2. Update email/password in body if needed
3. Click **Send**
4. Token and User ID will be automatically saved

#### Step 2: Create Checkout Session

1. Open **Billing → Create Checkout Session - Monthly**
2. Click **Send**
3. Check the response:
   ```json
   {
     "success": true,
     "url": "https://checkout.stripe.com/...",
     "sessionId": "cs_test_..."
   }
   ```
4. Session ID is automatically saved to collection variables

#### Step 3: Complete Payment

1. Copy the `url` from the response
2. Open it in your browser
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete the payment

#### Step 4: Test Webhook

**Using Stripe CLI (Recommended):**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

**Or manually in Postman:**
1. Open **Stripe Webhook → Webhook - Checkout Session Completed**
2. ⚠️ **Note**: This won't work properly without proper Stripe signature
3. Use Stripe CLI for proper webhook testing

#### Step 5: Verify Entitlement

1. Open **Testing & Verification → Test Entitlement Check**
2. Click **Send**
3. This will call `/api/auth/me` to verify user is authenticated
4. Check database directly or use `test_billing_entitlement.js` to verify entitlement

---

## 🔍 Manual Database Verification

### Check Subscription

```sql
SELECT 
  id,
  user_id,
  stripe_customer_id,
  stripe_sub_id,
  status,
  current_period_end,
  canceled_at,
  created_at
FROM subscriptions
WHERE user_id = '<user-id>'
ORDER BY created_at DESC;
```

### Check User Tier

```sql
SELECT 
  id,
  email,
  tier,
  tier_expires_at
FROM users
WHERE id = '<user-id>';
```

### Check Entitlement Logic

```sql
-- Check if user has active Stripe subscription
SELECT 
  'Has Stripe Subscription' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = '<user-id>' 
        AND status IN ('active', 'trialing') 
        AND current_period_end > NOW()
    ) THEN 'YES (PRO)'
    ELSE 'NO'
  END as result;

-- Check if user has manual trial
SELECT 
  'Has Manual Trial' as check_type,
  CASE 
    WHEN tier = 'trial' AND tier_expires_at > NOW() THEN 'YES (TRIAL)'
    ELSE 'NO'
  END as result
FROM users
WHERE id = '<user-id>';
```

---

## 🐛 Troubleshooting

### Checkout Session Creation Fails

**Error**: `Stripe price ID not configured for plan: monthly`

**Solution**: 
- Check `.env` file has `STRIPE_PRICE_MONTHLY` set
- Verify the price ID exists in Stripe Dashboard
- Ensure price ID starts with `price_`

### Webhook Not Receiving Events

**Symptoms**: Subscription not created in database after payment

**Solutions**:
1. Check webhook endpoint URL in Stripe Dashboard matches your server
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check server logs for webhook errors
4. Use Stripe CLI to test: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Entitlement Always Returns 'guest'

**Check**:
1. Subscription exists in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '<user-id>';
   ```
2. Subscription status is 'active' or 'trialing'
3. `current_period_end` is in the future
4. Check server logs for entitlement service errors

### Migration Errors

**Error**: `column "tier" already exists`

**Solution**: This is normal - the migration uses `IF NOT EXISTS` and will skip existing columns.

---

## 📋 Complete Test Checklist

- [ ] Migration completed successfully
- [ ] Environment variables set (Stripe keys, price IDs)
- [ ] User registered/logged in
- [ ] Checkout session created successfully
- [ ] Payment completed on Stripe Checkout
- [ ] Webhook received and processed
- [ ] Subscription record created in database
- [ ] Entitlement returns 'pro' for subscribed user
- [ ] Manual trial works (set tier='trial' in database)
- [ ] Entitlement returns 'trial' for trial user
- [ ] Entitlement returns 'guest' for non-subscribed user

---

## 🎯 Quick Test Commands

```bash
# Full flow test
node test_billing_flow.js

# After payment, verify entitlement
export TEST_USER_ID="<user-id>"
export TEST_TOKEN="<token>"
node test_billing_entitlement.js

# Test webhook with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## 📚 Additional Resources

- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Setup Guide**: See `BILLING_SETUP_GUIDE.md`
- **Implementation Details**: See `BILLING_IMPLEMENTATION_SUMMARY.md`

