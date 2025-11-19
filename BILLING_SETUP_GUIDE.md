# Billing System Setup Guide

This guide explains how to set up and use the billing system for your logo maker SaaS.

## Overview

The billing system consists of three main components:

1. **Checkout Session Route** - Creates Stripe checkout sessions for subscriptions
2. **Webhook Handler** - Updates subscription data when Stripe events occur
3. **Entitlement System** - Determines user access level (guest/trial/pro)

## Flow Diagram

```
User clicks "Subscribe" 
  ↓
POST /api/billing/create-checkout-session
  ↓
Stripe Checkout Session created
  ↓
User redirected to Stripe Checkout
  ↓
User completes payment
  ↓
Stripe sends webhook: checkout.session.completed
  ↓
POST /api/stripe/webhook
  ↓
Subscription upserted into database
  ↓
User entitlement = 'pro'
```

## Step 1: Database Setup

### 1.1 Run Subscriptions Table Migration

The subscriptions table should already exist. If not, run:

```bash
node run_subscriptions_migration.js
```

### 1.2 Add Tier Columns to Users Table

Run the migration to add `tier` and `tier_expires_at` columns:

```sql
-- Run this SQL file
psql $DATABASE_URL -f migrations/add_tier_columns_to_users.sql
```

Or execute the SQL directly in your database.

## Step 2: Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_WEEKLY=price_your_weekly_price_id_here
STRIPE_PRICE_MONTHLY=price_your_monthly_price_id_here
STRIPE_PRICE_YEARLY=price_your_yearly_price_id_here

# Frontend URL (for Stripe Checkout redirects)
FRONTEND_URL=http://localhost:3000
```

### Getting Stripe Keys

1. **STRIPE_SECRET_KEY**: 
   - Go to Stripe Dashboard → Developers → API keys
   - Copy your "Secret key" (starts with `sk_test_` for test mode)

2. **STRIPE_WEBHOOK_SECRET**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Create a new webhook endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the "Signing secret" (starts with `whsec_`)

3. **Price IDs**:
   - Go to Stripe Dashboard → Products
   - Create products for weekly, monthly, yearly plans
   - Copy the Price IDs (start with `price_`)

## Step 3: TypeScript Setup

Since the routes are written in TypeScript, you have two options:

### Option A: Compile TypeScript to JavaScript

1. Install TypeScript:
```bash
npm install --save-dev typescript @types/node @types/express
```

2. Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./api",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["api/**/*"],
  "exclude": ["node_modules"]
}
```

3. Compile:
```bash
npx tsc
```

4. Update `api/index.js` to require compiled files:
```javascript
app.use('/api/billing', require('./dist/routes/billing'));
app.use('/api/stripe', require('./dist/routes/stripeWebhook'));
```

### Option B: Use ts-node (Development)

1. Install ts-node:
```bash
npm install --save-dev ts-node
```

2. Update your start script in `package.json`:
```json
{
  "scripts": {
    "start": "ts-node api/index.ts",
    "dev": "nodemon --exec ts-node api/index.ts"
  }
}
```

## Step 4: Add Routes to Express App

Update `api/index.js`:

```javascript
// Billing and Stripe routes
app.use('/api/billing', require('./routes/billing'));
app.use('/api/stripe', require('./routes/stripeWebhook'));
```

**Note**: If using TypeScript, make sure routes are compiled or use ts-node.

## Step 5: Using Entitlement in Your Routes

### Basic Usage

```javascript
const { authenticate } = require('./middleware/auth');
const { entitlementMiddleware, requirePro } = require('./middleware/entitlement');

// Example: Pro-only route
router.get('/pro-feature', 
  authenticate, 
  entitlementMiddleware, 
  requirePro,
  (req, res) => {
    // Only Pro users can access this
    res.json({ message: 'Pro feature' });
  }
);

// Example: Different quality based on entitlement
router.get('/export', 
  authenticate, 
  entitlementMiddleware,
  (req, res) => {
    const entitlement = req.entitlement; // 'guest' | 'trial' | 'pro'
    
    let quality;
    if (entitlement === 'pro') {
      quality = { dpi: 600, quality: 100 };
    } else if (entitlement === 'trial') {
      quality = { dpi: 300, quality: 90 };
    } else {
      quality = { dpi: 150, quality: 70 };
    }
    
    // Use quality settings...
  }
);
```

## Step 6: Testing

### Test Checkout Session Creation

```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "monthly"}'
```

Response:
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### Test Webhook (using Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Trigger a test event:
```bash
stripe trigger checkout.session.completed
```

### Test Entitlement

```bash
# After user has active subscription
curl http://localhost:3000/api/some-protected-route \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Entitlement Logic Explained

The `getEntitlementForUser` function follows this logic:

1. **Check Stripe Subscriptions First**:
   - Query `subscriptions` table for user
   - Look for `status IN ('active', 'trialing')` AND `current_period_end > NOW()`
   - If found → return `'pro'`

2. **Fallback to Manual Trial**:
   - If no valid Stripe subscription, check `users.tier` and `users.tier_expires_at`
   - If `tier = 'trial'` AND `tier_expires_at > NOW()` → return `'trial'`

3. **Default**:
   - Otherwise → return `'guest'`

## Manual Trial Management

To grant a manual trial to a user:

```sql
UPDATE users 
SET tier = 'trial', 
    tier_expires_at = NOW() + INTERVAL '7 days'
WHERE id = 'user-uuid-here';
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook secret is correct in `.env`
2. Verify webhook endpoint URL in Stripe Dashboard
3. Check server logs for signature verification errors
4. Use Stripe CLI to test locally

### Entitlement Always Returns 'guest'

1. Check subscriptions table has data:
```sql
SELECT * FROM subscriptions WHERE user_id = 'user-uuid';
```

2. Verify subscription status and period_end:
```sql
SELECT status, current_period_end, NOW() 
FROM subscriptions 
WHERE user_id = 'user-uuid';
```

3. Check manual trial:
```sql
SELECT tier, tier_expires_at 
FROM users 
WHERE id = 'user-uuid';
```

### TypeScript Compilation Errors

- Ensure all dependencies are installed
- Check `tsconfig.json` is correct
- Verify Stripe types: `npm install --save-dev @types/stripe`

## Next Steps

1. Set up Stripe products and prices
2. Configure webhook endpoint in Stripe Dashboard
3. Test checkout flow end-to-end
4. Implement entitlement checks in your protected routes
5. Add UI for subscription management

